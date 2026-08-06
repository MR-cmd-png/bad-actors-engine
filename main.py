# bad-actors-engine 恶意实体风险评分引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from database import get_db, Base, engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func,delete,or_
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import models,time

app = FastAPI(title="Bad Actor Detection Engine MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== Pydantic Request Models =====================
# 1. Entity creation model
class EntityCreate(BaseModel):
    name: str
    email: str
    phone: str


# 2. Event creation model
class EventCreate(BaseModel):
    entity_id: int
    type: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

# 3.0 Rule field config
class RuleDefinition(BaseModel):
    condition : str
    score : int
    event_types: List[str] = Field(default_factory=list)   # event types associated with this rule

# 3.5 Rule config model
class RuleCreate(BaseModel):
    rule_id: str
    definition: RuleDefinition
    active: bool = True
class RuleToggle(BaseModel):
    active: bool
# 4.Batch import model
class EntityBatchItem(BaseModel):
    name: str
    email: str
    phone: str
class EntityBatchCreate(BaseModel):
    entities: list[EntityBatchItem]

# ===================== Startup (create tables) =====================
@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables initialized")
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
        print("App will start but database operations may not work")
@app.patch("/rule/{rule_id}/toggle", summary="Enable/Disable Rule")
async def toggle_rule(rule_id: str, data: RuleToggle, db: AsyncSession = Depends(get_db)):
    stmt = select(models.Rule).where(models.Rule.rule_id == rule_id)
    rule = (await db.execute(stmt)).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.active = data.active
    await db.commit()
    await db.refresh(rule)
    return {"code": 0, "data": rule}

# ===================== 1. Entity Operations =====================
# Create entity
@app.post("/entity/create", summary="Create Entity")
async def create_entity(data: EntityCreate, db: AsyncSession = Depends(get_db)):
    entity = models.Entity(name=data.name, email=data.email, phone=data.phone)
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return {"code": 0, "data": entity}
@app.post("/risk/batch-calculate", summary="Recalculate All Entity Risk Scores")
async def batch_calculate_risk(
    only_with_events: bool = True,   # skip empty entities without events by default
    db: AsyncSession = Depends(get_db),
):
    started = time.time()

    # 1) Target entities: all / only those with events
    stmt = select(models.Entity)
    if only_with_events:
        stmt = stmt.where(
            models.Entity.id.in_(select(models.Event.entity_id).distinct())
        )
    entities = (await db.execute(stmt)).scalars().all()

    # 2) Reuse single-entity calculation function for each entity
    success, failed = 0, 0
    failures = []
    for ent in entities:
        try:
            await calc_entity_risk_score(ent.id, db)   # call existing single-entity calc function
            success += 1
        except Exception as e:
            failed += 1
            failures.append({"entity_id": ent.id, "error": str(e)})

    # 3) Aggregate score distribution + TOP10 high risk
    rows = (await db.execute(
        select(models.Score, models.Entity)
        .join(models.Entity, models.Entity.id == models.Score.entity_id)
    )).all()

    dist = {"High": 0, "Medium": 0, "Low": 0}
    for sc, _ in rows:
        dist[sc.risk_level] = dist.get(sc.risk_level, 0) + 1

    top = sorted(rows, key=lambda r: -(r[0].score or 0))[:10]

    return {
        "code": 0,
        "data": {
            "total": len(entities),
            "success": success,
            "failed": failed,
            "failures": failures[:10],
            "elapsed": round(time.time() - started, 2),
            "distribution": dist,
            "top": [
                {"id": ent.id, "name": ent.name, "score": sc.score, "risk_level": sc.risk_level}
                for sc, ent in top
            ],
        },
    }
@app.post("/entities/batch", summary="Batch Import Entities")
async def batch_create_entities(payload: EntityBatchCreate, db: AsyncSession = Depends(get_db)):
    if not payload.entities:
        raise HTTPException(status_code=400, detail="Import data is empty")
    if len(payload.entities) > 2000:
        raise HTTPException(status_code=400, detail="Max 2000 records per import")

    success, skipped = 0, 0
    details = []          # only record skipped items to reduce response size
    seen_in_batch = set()

    for idx, item in enumerate(payload.entities, start=1):
        name, email, phone = item.name.strip(), item.email.strip(), item.phone.strip()
        key = (email, phone)

        # Duplicate check within batch
        if key in seen_in_batch:
            skipped += 1
            details.append({"row": idx, "status": "skipped", "reason": "Duplicate in batch"})
            continue
        # Duplicate check in database
        exists = (await db.execute(
            select(models.Entity).where(
                models.Entity.email == email,
                models.Entity.phone == phone,
            )
        )).scalar_one_or_none()
        if exists:
            skipped += 1
            details.append({"row": idx, "status": "skipped", "reason": "Entity already exists"})
            continue

        seen_in_batch.add(key)
        db.add(models.Entity(name=name, email=email, phone=phone))
        success += 1

    await db.commit()
    return {"code": 0, "data": {"success": success, "skipped": skipped, "details": details}}
# Query all entities
@app.get("/entities", summary="Entity List - Search/Filter/Sort/Pagination")
async def list_entities(
    page: int = 1,
    page_size: int = 10,
    keyword: str = "",        # fuzzy search name/email/phone
    risk_level: str = "",     # "" all | Low | Medium | High | Unscored
    order_by: str = "created_desc",  # created_desc | score_desc | score_asc
    db: AsyncSession = Depends(get_db),
):
    # LEFT JOIN scores so unscored entities can also be queried
    stmt = select(models.Entity, models.Score).outerjoin(
        models.Score, models.Entity.id == models.Score.entity_id
    )

    # Keyword fuzzy search
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(
            models.Entity.name.like(like),
            models.Entity.email.like(like),
            models.Entity.phone.like(like),
        ))

    # Risk level filter
    if risk_level == "Unscored":
        stmt = stmt.where(models.Score.id.is_(None))
    elif risk_level in ("Low", "Medium", "High"):
        stmt = stmt.where(models.Score.risk_level == risk_level)

    # Total count
    total = (await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )).scalar() or 0

    # Sorting (coalesce puts unscored at the end)
    if order_by == "score_desc":
        stmt = stmt.order_by(func.coalesce(models.Score.score, -1).desc(), models.Entity.id)
    elif order_by == "score_asc":
        stmt = stmt.order_by(func.coalesce(models.Score.score, 10 ** 9).asc(), models.Entity.id)
    else:
        stmt = stmt.order_by(models.Entity.id.desc())

    # Pagination
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).all()

    return {
        "code": 0,
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": [
            {
                "id": ent.id,
                "name": ent.name,
                "email": ent.email,
                "phone": ent.phone,
                "create_time": ent.create_time,
                "score": sc.score if sc else None,
                "risk_level": sc.risk_level if sc else None,
            }
            for ent, sc in rows
        ],
    }
# Query single entity (with associated events, score, rule hits)
@app.get("/entity/{entity_id}", summary="Query Entity Full Profile")
async def get_entity_detail(entity_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(models.Entity).where(models.Entity.id == entity_id)
    res = await db.execute(stmt)
    entity = res.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Query associated sub-data
    score_stmt = select(models.Score).where(models.Score.entity_id == entity_id)
    score = (await db.execute(score_stmt)).scalar_one_or_none()

    event_stmt = select(models.Event).where(models.Event.entity_id == entity_id)
    events = (await db.execute(event_stmt)).scalars().all()

    hit_stmt = select(models.RuleHit).where(models.RuleHit.entity_id == entity_id)
    rule_hits = (await db.execute(hit_stmt)).scalars().all()

    return {
        "entity": entity,
        "risk_score": score,
        "event_list": events,
        "rule_hit_records": rule_hits
    }


# ===================== 2. Event Operations =====================
@app.post("/event/create", summary="Create Behavior Event")
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    # Verify entity exists
    entity_exist = await db.get(models.Entity, data.entity_id)
    if not entity_exist:
        raise HTTPException(status_code=400, detail="Associated entity does not exist")

    event = models.Event(
        entity_id=data.entity_id,
        type=data.type,
        metadata_json=data.metadata_json
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return {"code": 0, "data": event}


# ===================== 3. Rule Management =====================
@app.post("/rule/create", summary="Create Scoring Rule")
async def create_rule(data: RuleCreate, db: AsyncSession = Depends(get_db)):
    # Verify rule_id is unique
    exist = await db.execute(select(models.Rule).where(models.Rule.rule_id == data.rule_id))
    if exist.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="rule_id already exists")

    rule = models.Rule(
        rule_id=data.rule_id,
        definition=data.definition.model_dump(),
        active=data.active
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"code": 0, "data": rule}


@app.get("/rule/list", summary="List All Rules")
async def list_active_rule(db: AsyncSession = Depends(get_db)):
    stmt = select(models.Rule).order_by(models.Rule.id)
    rules = (await db.execute(stmt)).scalars().all()
    return {"code": 0, "data": rules}


# 3.6 Rule update model
class RuleUpdate(BaseModel):
    definition: Optional[RuleDefinition] = None
    active: Optional[bool] = None


@app.put("/rule/{rule_id}", summary="Edit Rule (Definition/Status)")
async def update_rule(rule_id: str, data: RuleUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(models.Rule).where(models.Rule.rule_id == rule_id)
    rule = (await db.execute(stmt)).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    if data.definition is not None:
        rule.definition = data.definition.model_dump()
    if data.active is not None:
        rule.active = data.active

    await db.commit()
    await db.refresh(rule)
    return {"code": 0, "data": rule}


@app.delete("/rule/{rule_id}", summary="Delete Rule")
async def delete_rule(rule_id: str, db: AsyncSession = Depends(get_db)):
    rule = (await db.execute(select(models.Rule).where(models.Rule.rule_id == rule_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"code": 0, "message": "Rule deleted successfully"}


# ===================== 4. Core: Rule Scoring + Generate RuleHits + Update Scores =====================
# Business logic: after event trigger, auto-run rules, record hits, update risk score & level
@app.post("/entity/{entity_id}/calc_score", summary="Manually Trigger Entity Risk Scoring")
async def calc_entity_risk_score(entity_id: int, db: AsyncSession = Depends(get_db)):
    # 1. Get entity basic info
    entity = await db.get(models.Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    await db.execute(
        delete(models.RuleHit).where(models.RuleHit.entity_id == entity_id)
    )
    # 2. Get all active rules
    active_rules = (await db.execute(select(models.Rule).where(models.Rule.active == True))).scalars().all()
    total_score = 0
    hit_records = []

    # 3. Match rules one by one (MVP simple matching logic, extensible)
    for rule in active_rules:
        defi = rule.definition
        cond = defi.get("condition", "")
        add_score = defi.get("score", 0)

        hit_flag = False
        cond_norm = cond.strip().lower()
        event_types = defi.get("event_types") or []

        # Match by associated event type list: entity must have an event matching any in the list
        if event_types:
            event_list = (
                await db.execute(select(models.Event).where(models.Event.entity_id == entity_id))).scalars().all()
            for ev in event_list:
                if ev.type in event_types:
                    hit_flag = True
                    break
        # Built-in rule matching logic
        elif cond_norm == "email_domain in disposable_list":
            disposable_suffix = ["temp.com", "163temp.com"]
            email_suffix = entity.email.split("@")[-1].lower()
            if email_suffix in disposable_suffix:
                hit_flag = True
        elif cond_norm == "property tort":
            property_tort_types = ["Property Damage", "Tort Involving Network and Data Property", "Tort Involving Creditors' Rights and Interest-Based Property"]
            event_list = (
                await db.execute(select(models.Event).where(models.Event.entity_id == entity_id))).scalars().all()
            for ev in event_list:
                if ev.type in property_tort_types:
                    hit_flag = True
                    break
        elif cond_norm == "conduct in violation of the principle of good faith":
            good_faith_types = ["Overdue and Unpaid", "Misrepresentation and False Disclosure", "Breach of Trust and Breach of Contract"]
            event_list = (
                await db.execute(select(models.Event).where(models.Event.entity_id == entity_id))).scalars().all()
            for ev in event_list:
                if ev.type in good_faith_types:
                    hit_flag = True
                    break

        # Record rule hit and accumulate score
        if hit_flag:
            hit = models.RuleHit(
                entity_id=entity_id,
                rule_id=rule.rule_id,
                score=add_score
            )
            db.add(hit)
            hit_records.append(hit)
            total_score += add_score

    # 4. Calculate risk level (0-29 Low / 30-59 Medium / 60+ High)
    if total_score < 30:
        risk_level = "Low"
    elif total_score < 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # 5. Update or create score record
    score_row = await db.get(models.Score, entity_id)
    if score_row:
        score_row.score = total_score
        score_row.risk_level = risk_level
    else:
        score_row = models.Score(
            entity_id=entity_id,
            score=total_score,
            risk_level=risk_level
        )
        db.add(score_row)

    await db.commit()
    await db.refresh(score_row)
    for hit in hit_records:
        await db.refresh(hit)

    return {
        "entity_id": entity_id,
        "total_risk_score": total_score,
        "risk_level": risk_level,
        "rule_hit_count": len(hit_records),
        "hit_details": hit_records
    }


# ===================== 5. Dashboard Query: High Risk Entity List =====================
@app.get("/dashboard/high_risk", summary="Dashboard - High Risk Entity List")
async def get_high_risk_entity(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(models.Entity, models.Score)
        .join(models.Score, models.Entity.id == models.Score.entity_id)
        .where(models.Score.risk_level == "High")
        .order_by(models.Score.score.desc())
    )
    rows = (await db.execute(stmt)).all()
    res_list = []
    for ent, sc in rows:
        res_list.append({
            "entity": ent,
            "score": sc.score,
            "risk_level": sc.risk_level,
            "update_time": sc.updated_at
        })
    return {"code": 0, "high_risk_count": len(res_list), "data": res_list}

# ===================== Serve Frontend (React SPA) =====================
# Mount the built frontend dist directory
FRONTEND_DIR = Path(__file__).resolve().parent / "bad-actors-frontend" / "dist"

if FRONTEND_DIR.exists():
    # Mount static assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    # Catch-all route: serve index.html for SPA client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
