# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
"""情报业务表 CRUD（行为人/Company/关系/Event/Signal/来源/Evidence/风险Assessment/调查/时间线）。

约定：
- 写接口 require_admin，读接口 get_current_user；
- 用户类 FK（采集人/Assessment人/Manager）由登录态注入，请求体不可伪造；
- 创建 Event/Signal/Evidence/RiskAssessment 时同事务自动追加 Timeline 记录；
- 枚举值一律 Literal 收口，DB 侧仍存Medium文字符串。
"""
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_admin
from database import get_db
import models

router = APIRouter(tags=["intelligence"])

# 通用 (type, id) 引用的节点模型映射，用于支撑对象/关系两端的轻量存在性校验
NODE_MODELS = {
    "property": models.PilotProperty,
    "actor": models.Actor,
    "company": models.CompanyOrganization,
    "event": models.Event,
    "signal": models.Signal,
    "risk_assessment": models.RiskAssessment,
}


# ===================== 共用工具 =====================
async def _ensure_exists(db: AsyncSession, model, row_id: int, label: str):
    row = await db.get(model, row_id)
    if not row:
        raise HTTPException(status_code=400, detail=f"Referenced {label} does not exist")


async def _paged_list(db: AsyncSession, stmt, page: int, page_size: int):
    """共享分页：返回 (total, rows)。"""
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return total, rows


def _append_timeline(
    db: AsyncSession,
    *,
    property_id: int,
    entry_type: str,
    title: str,
    ref_type: str,
    ref_id: int,
    occurred_at: Optional[datetime] = None,
    description: Optional[str] = None,
):
    """自动记账：关键节点同事务落一条时间线（occurred_at 缺省时由 DB now() 填充）。"""
    values = dict(
        property_id=property_id,
        entry_type=entry_type,
        title=title,
        ref_type=ref_type,
        ref_id=ref_id,
        description=description,
    )
    if occurred_at is not None:
        values["occurred_at"] = occurred_at
    db.add(models.Timeline(**values))


# ===================== Pydantic Request Models =====================
class ActorCreate(BaseModel):
    property_id: int
    name: str
    actor_type: Literal["Individual", "Legal Representative", "Manager", "Contractor", "Tenant", "Supplier", "Former Employee", "Other"]
    role_in_property: Optional[str] = None
    email: Optional[str] = None  # 原本 contact_info(JSON) 拆成独立 email / phone
    phone: Optional[str] = None
    background_notes: Optional[str] = None


class CompanyCreate(BaseModel):
    name: str
    org_type: Literal["Company", "Trust", "Partnership", "Social Org", "Other"]
    property_id: Optional[int] = None
    registration_no: Optional[str] = None
    jurisdiction: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None


class RelationshipCreate(BaseModel):
    subject_type: Literal["actor", "company", "property"]
    subject_id: int
    object_type: Literal["actor", "company", "property"]
    object_id: int
    relation_type: Literal["Controlling", "Position", "Related Party Transaction", "Family", "Nominee Holding", "Guarantee", "Litigation Counterparty", "Other"]
    nature_description: Optional[str] = None
    confidence: Literal["High", "Medium", "Low"] = "Medium"


class EventCreate(BaseModel):
    property_id: int
    title: str
    event_category: Literal["Allegation", "Contract Dispute", "Regulatory Penalty", "Lawsuit", "Arbitration", "Suspicious Transaction", "Complaint", "Other"]
    severity: Literal["Low", "Medium", "High"] = "Medium"
    status: str = "In Progress"
    actor_id: Optional[int] = None
    company_id: Optional[int] = None
    description: Optional[str] = None
    occurred_at: Optional[datetime] = None


class SignalCreate(BaseModel):
    property_id: int
    indicator: str
    signal_type: Literal["Alert", "Anomaly", "Trend", "Connection Red Flag", "Other"]
    importance: Literal["Low", "Medium", "High"] = "Medium"
    status: Literal["Pending", "Confirmed", "Dismissed"] = "Pending"
    event_id: Optional[int] = None
    description: Optional[str] = None
    observed_at: Optional[datetime] = None


class SourceCreate(BaseModel):
    name: str
    source_type: Literal["Business Registry", "Court Document", "News", "Regulatory Notice", "Contract", "Interview", "Site Visit", "Whistleblower", "Other"]
    reliability: Literal["High", "Medium", "Low"] = "Medium"
    reference: Optional[str] = None
    notes: Optional[str] = None
    obtained_at: Optional[datetime] = None


class EvidenceCreate(BaseModel):
    claim: str
    evidence_type: Literal["Document", "Statement", "Observation", "Data", "Screenshot", "Other"]
    source_id: int
    supports_type: Literal["event", "signal", "risk_assessment", "actor", "company"]
    supports_id: int
    content_or_ref: str
    property_id: Optional[int] = None
    reliability_note: Optional[str] = None
    verified_at: Optional[datetime] = None


class RiskAssessmentCreate(BaseModel):
    property_id: int
    risk_category: Literal["Compliance", "Legal", "Financial", "Operational", "Reputational", "Related Party Transaction", "Fraud", "Other"]
    severity: Literal["Low", "Medium", "High", "Critical"] = "Medium"
    confidence: Literal["High", "Medium", "Low"] = "Medium"
    rationale: str
    status: Literal["Draft", "Under Review", "Confirmed", "Mitigated", "Closed"] = "Draft"
    actor_id: Optional[int] = None


class InvestigationCreate(BaseModel):
    property_id: int
    title: str
    case_no: Optional[str] = None
    summary: Optional[str] = None
    status: Literal["In Progress", "Paused", "Closed"] = "In Progress"


class TimelineCreate(BaseModel):
    property_id: int
    title: str
    entry_type: Literal["Event", "Signal", "Evidence", "Assessment", "Milestone"]
    description: Optional[str] = None
    investigation_id: Optional[int] = None
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    occurred_at: Optional[datetime] = None


# ===================== Update Pydantic Models（局部更新，所有字段 Optional） =====================
from typing import Any as _Any, Dict as _TDict


class ActorUpdate(BaseModel):
    name: Optional[str] = None
    actor_type: Optional[Literal["Individual", "Legal Representative", "Manager", "Contractor", "Tenant", "Supplier", "Former Employee", "Other"]] = None
    role_in_property: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    background_notes: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    org_type: Optional[Literal["Company", "Trust", "Partnership", "Social Org", "Other"]] = None
    registration_no: Optional[str] = None
    jurisdiction: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None


class RelationshipUpdate(BaseModel):
    relation_type: Optional[Literal["Controlling", "Position", "Related Party Transaction", "Family", "Nominee Holding", "Guarantee", "Litigation Counterparty", "Other"]] = None
    nature_description: Optional[str] = None
    confidence: Optional[Literal["High", "Medium", "Low"]] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_category: Optional[Literal["Allegation", "Contract Dispute", "Regulatory Penalty", "Lawsuit", "Arbitration", "Suspicious Transaction", "Complaint", "Other"]] = None
    severity: Optional[Literal["Low", "Medium", "High"]] = None
    status: Optional[str] = None
    actor_id: Optional[int] = None
    company_id: Optional[int] = None
    description: Optional[str] = None
    occurred_at: Optional[datetime] = None


class SignalUpdate(BaseModel):
    indicator: Optional[str] = None
    signal_type: Optional[Literal["Alert", "Anomaly", "Trend", "Connection Red Flag", "Other"]] = None
    importance: Optional[Literal["Low", "Medium", "High"]] = None
    status: Optional[Literal["Pending", "Confirmed", "Dismissed"]] = None
    event_id: Optional[int] = None
    description: Optional[str] = None
    observed_at: Optional[datetime] = None


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[Literal["Business Registry", "Court Document", "News", "Regulatory Notice", "Contract", "Interview", "Site Visit", "Whistleblower", "Other"]] = None
    reliability: Optional[Literal["High", "Medium", "Low"]] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    obtained_at: Optional[datetime] = None


class EvidenceUpdate(BaseModel):
    claim: Optional[str] = None
    evidence_type: Optional[Literal["Document", "Statement", "Observation", "Data", "Screenshot", "Other"]] = None
    source_id: Optional[int] = None
    supports_type: Optional[Literal["event", "signal", "risk_assessment", "actor", "company"]] = None
    supports_id: Optional[int] = None
    content_or_ref: Optional[str] = None
    property_id: Optional[int] = None
    reliability_note: Optional[str] = None
    verified_at: Optional[datetime] = None


class RiskAssessmentUpdate(BaseModel):
    risk_category: Optional[Literal["Compliance", "Legal", "Financial", "Operational", "Reputational", "Related Party Transaction", "Fraud", "Other"]] = None
    severity: Optional[Literal["Low", "Medium", "High", "Critical"]] = None
    confidence: Optional[Literal["High", "Medium", "Low"]] = None
    rationale: Optional[str] = None
    status: Optional[Literal["Draft", "Under Review", "Confirmed", "Mitigated", "Closed"]] = None
    actor_id: Optional[int] = None


class InvestigationUpdate(BaseModel):
    title: Optional[str] = None
    case_no: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[Literal["In Progress", "Paused", "Closed"]] = None
    closed_at: Optional[datetime] = None


class TimelineUpdate(BaseModel):
    title: Optional[str] = None
    entry_type: Optional[Literal["Event", "Signal", "Evidence", "Assessment", "Milestone"]] = None
    description: Optional[str] = None
    investigation_id: Optional[int] = None
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    occurred_at: Optional[datetime] = None


# ===================== PATCH/DELETE 通用工具 =====================
async def _patch_row(db: AsyncSession, row, data: _TDict[str, _Any]):
    """把 update_data Medium非 None 字段覆盖到 row（局部更新）。"""
    for k, v in data.items():
        if v is not None:
            setattr(row, k, v)
    await db.commit()
    await db.refresh(row)


async def _delete_row(db: AsyncSession, row):
    await db.delete(row)
    await db.commit()
    return {"code": 0, "message": "Deleted"}


# ===================== 行为人 =====================
@router.post("/actor/create", summary="创建行为人")
async def create_actor(
    data: ActorCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    actor = models.Actor(**data.model_dump())
    db.add(actor)
    await db.commit()
    await db.refresh(actor)
    return {"code": 0, "data": actor}


@router.get("/actor", summary="行为人列表（property_id 过滤 + 分页）")
async def list_actors(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Actor).order_by(models.Actor.id.desc())
    if property_id is not None:
        stmt = stmt.where(models.Actor.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/actor/{actor_id}", summary="行为人详情")
async def get_actor_detail(
    actor_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    actor = await db.get(models.Actor, actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {"code": 0, "data": actor}


@router.patch("/actor/{actor_id}", summary="Update Actor (partial)")
async def update_actor(
    actor_id: int,
    data: ActorUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Actor, actor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Actor not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/actor/{actor_id}", summary="Delete Actor")
async def delete_actor(
    actor_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Actor, actor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Actor not found")
    return await _delete_row(db, row)



# ===================== Company/组织 =====================
@router.post("/company/create", summary="创建Company/组织")
async def create_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if data.property_id is not None:
        await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    company = models.CompanyOrganization(**data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return {"code": 0, "data": company}


@router.get("/company", summary="Company/组织列表（property_id 过滤 + 分页）")
async def list_companies(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.CompanyOrganization).order_by(models.CompanyOrganization.id.desc())
    if property_id is not None:
        stmt = stmt.where(models.CompanyOrganization.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/company/{company_id}", summary="Company/组织详情")
async def get_company_detail(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    company = await db.get(models.CompanyOrganization, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"code": 0, "data": company}


@router.patch("/company/{company_id}", summary="Update Company (partial)")
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.CompanyOrganization, company_id)
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/company/{company_id}", summary="Delete Company")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.CompanyOrganization, company_id)
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    return await _delete_row(db, row)



# ===================== 关系 =====================
@router.post("/relationship/create", summary="创建关系边")
async def create_relationship(
    data: RelationshipCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    # 校验边两端节点真实存在
    await _ensure_exists(db, NODE_MODELS[data.subject_type], data.subject_id, f"{data.subject_type}节点")
    await _ensure_exists(db, NODE_MODELS[data.object_type], data.object_id, f"{data.object_type}节点")
    relationship = models.Relationship(**data.model_dump())
    db.add(relationship)
    await db.commit()
    await db.refresh(relationship)
    return {"code": 0, "data": relationship}


@router.get("/relationship", summary="关系列表（分页）")
async def list_relationships(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Relationship).order_by(models.Relationship.id.desc())
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/relationship/{relationship_id}", summary="关系详情")
async def get_relationship_detail(
    relationship_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    relationship = await db.get(models.Relationship, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return {"code": 0, "data": relationship}


@router.patch("/relationship/{relationship_id}", summary="Update Relationship (partial)")
async def update_relationship(
    relationship_id: int,
    data: RelationshipUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Relationship, relationship_id)
    if not row:
        raise HTTPException(status_code=404, detail="Relationship not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/relationship/{relationship_id}", summary="Delete Relationship")
async def delete_relationship(
    relationship_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Relationship, relationship_id)
    if not row:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return await _delete_row(db, row)



# ===================== Event =====================
@router.post("/event/create", summary="创建Event（自动追加时间线）")
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    if data.actor_id is not None:
        await _ensure_exists(db, models.Actor, data.actor_id, "行为人")
    if data.company_id is not None:
        await _ensure_exists(db, models.CompanyOrganization, data.company_id, "Company")
    event = models.Event(**data.model_dump())
    db.add(event)
    await db.flush()  # 先拿 event.id 供时间线引用
    _append_timeline(
        db,
        property_id=event.property_id,
        entry_type="Event",
        title=event.title,
        ref_type="event",
        ref_id=event.id,
        occurred_at=data.occurred_at,
        description=event.description,
    )
    await db.commit()
    await db.refresh(event)
    return {"code": 0, "data": event}


# /list 后缀：避免与前端 SPA 深链接 /events 整页刷新冲突
@router.get("/event/list", summary="Event列表（property_id 过滤 + 分页）")
async def list_events(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Event).order_by(models.Event.occurred_at.desc())
    if property_id is not None:
        stmt = stmt.where(models.Event.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/event/{event_id}", summary="Event详情")
async def get_event_detail(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    event = await db.get(models.Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"code": 0, "data": event}


@router.patch("/event/{event_id}", summary="Update Event (partial)")
async def update_event(
    event_id: int,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Event, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/event/{event_id}", summary="Delete Event")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Event, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    return await _delete_row(db, row)



# ===================== Signal =====================
@router.post("/signal/create", summary="创建Signal（自动追加时间线）")
async def create_signal(
    data: SignalCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    if data.event_id is not None:
        await _ensure_exists(db, models.Event, data.event_id, "Event")
    signal = models.Signal(**data.model_dump())
    db.add(signal)
    await db.flush()
    _append_timeline(
        db,
        property_id=signal.property_id,
        entry_type="Signal",
        title=signal.indicator,
        ref_type="signal",
        ref_id=signal.id,
        occurred_at=data.observed_at,
        description=signal.description,
    )
    await db.commit()
    await db.refresh(signal)
    return {"code": 0, "data": signal}


@router.get("/signal", summary="Signal列表（property_id 过滤 + 分页）")
async def list_signals(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Signal).order_by(models.Signal.observed_at.desc())
    if property_id is not None:
        stmt = stmt.where(models.Signal.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/signal/{signal_id}", summary="Signal详情")
async def get_signal_detail(
    signal_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    signal = await db.get(models.Signal, signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"code": 0, "data": signal}


@router.patch("/signal/{signal_id}", summary="Update Signal (partial)")
async def update_signal(
    signal_id: int,
    data: SignalUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Signal, signal_id)
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/signal/{signal_id}", summary="Delete Signal")
async def delete_signal(
    signal_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Signal, signal_id)
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")
    return await _delete_row(db, row)



# ===================== 来源 =====================
@router.post("/source/create", summary="创建来源（采集人由登录态注入）")
async def create_source(
    data: SourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    source = models.Source(**data.model_dump(), collector_id=current_user.id)
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return {"code": 0, "data": source}


@router.get("/source", summary="来源列表（分页）")
async def list_sources(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Source).order_by(models.Source.id.desc())
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/source/{source_id}", summary="来源详情")
async def get_source_detail(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    source = await db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"code": 0, "data": source}


@router.patch("/source/{source_id}", summary="Update Source (partial)")
async def update_source(
    source_id: int,
    data: SourceUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Source, source_id)
    if not row:
        raise HTTPException(status_code=404, detail="Source not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/source/{source_id}", summary="Delete Source")
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Source, source_id)
    if not row:
        raise HTTPException(status_code=404, detail="Source not found")
    return await _delete_row(db, row)



# ===================== Evidence与主张 =====================
@router.post("/evidence/create", summary="创建Evidence（自动追加时间线）")
async def create_evidence(
    data: EvidenceCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.Source, data.source_id, "来源")
    if data.property_id is not None:
        await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    await _ensure_exists(db, NODE_MODELS[data.supports_type], data.supports_id, f"{data.supports_type}节点")
    evidence = models.EvidenceClaim(**data.model_dump())
    db.add(evidence)
    await db.flush()
    _append_timeline(
        db,
        property_id=evidence.property_id,
        entry_type="Evidence",
        title=evidence.claim,
        ref_type="evidence",
        ref_id=evidence.id,
        occurred_at=data.verified_at,
    )
    await db.commit()
    await db.refresh(evidence)
    return {"code": 0, "data": evidence}


# /list 后缀：避免与前端 SPA 深链接 /evidence 整页刷新冲突
@router.get("/evidence/list", summary="Evidence列表（property_id 过滤 + 分页）")
async def list_evidence(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.EvidenceClaim).order_by(models.EvidenceClaim.id.desc())
    if property_id is not None:
        stmt = stmt.where(models.EvidenceClaim.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/evidence/{evidence_id}", summary="Evidence详情")
async def get_evidence_detail(
    evidence_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    evidence = await db.get(models.EvidenceClaim, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return {"code": 0, "data": evidence}


@router.patch("/evidence/{evidence_id}", summary="Update Evidence (partial)")
async def update_evidence(
    evidence_id: int,
    data: EvidenceUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.EvidenceClaim, evidence_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evidence not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/evidence/{evidence_id}", summary="Delete Evidence")
async def delete_evidence(
    evidence_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.EvidenceClaim, evidence_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return await _delete_row(db, row)



# ===================== 风险Assessment =====================
@router.post("/risk-assessment/create", summary="创建风险Assessment（Assessment人由登录态注入，自动追加时间线）")
async def create_risk_assessment(
    data: RiskAssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    if data.actor_id is not None:
        await _ensure_exists(db, models.Actor, data.actor_id, "行为人")
    assessment = models.RiskAssessment(**data.model_dump(), assessed_by=current_user.id)
    db.add(assessment)
    await db.flush()
    _append_timeline(
        db,
        property_id=assessment.property_id,
        entry_type="Assessment",
        title=f"{assessment.risk_category}风险Assessment（{assessment.severity}）",
        ref_type="risk_assessment",
        ref_id=assessment.id,
    )
    await db.commit()
    await db.refresh(assessment)
    return {"code": 0, "data": assessment}


@router.get("/risk-assessment", summary="风险Assessment列表（property_id 过滤 + 分页）")
async def list_risk_assessments(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.RiskAssessment).order_by(models.RiskAssessment.assessed_at.desc())
    if property_id is not None:
        stmt = stmt.where(models.RiskAssessment.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/risk-assessment/{assessment_id}", summary="风险Assessment详情")
async def get_risk_assessment_detail(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    assessment = await db.get(models.RiskAssessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return {"code": 0, "data": assessment}


@router.patch("/risk-assessment/{assessment_id}", summary="Update Risk assessment (partial)")
async def update_assessment(
    assessment_id: int,
    data: RiskAssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.RiskAssessment, assessment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/risk-assessment/{assessment_id}", summary="Delete Risk assessment")
async def delete_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.RiskAssessment, assessment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return await _delete_row(db, row)



# ===================== 调查/案件 =====================
@router.post("/investigation/create", summary="创建调查案件（Manager由登录态注入）")
async def create_investigation(
    data: InvestigationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    investigation = models.Investigation(**data.model_dump(), lead_investigator_id=current_user.id)
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    return {"code": 0, "data": investigation}


@router.get("/investigation", summary="调查案件列表（property_id 过滤 + 分页）")
async def list_investigations(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Investigation).order_by(models.Investigation.started_at.desc())
    if property_id is not None:
        stmt = stmt.where(models.Investigation.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/investigation/{investigation_id}", summary="调查案件详情")
async def get_investigation_detail(
    investigation_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    investigation = await db.get(models.Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"code": 0, "data": investigation}


@router.patch("/investigation/{investigation_id}", summary="Update Investigation (partial)")
async def update_investigation(
    investigation_id: int,
    data: InvestigationUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Investigation, investigation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Investigation not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/investigation/{investigation_id}", summary="Delete Investigation")
async def delete_investigation(
    investigation_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Investigation, investigation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return await _delete_row(db, row)



# ===================== 时间线 =====================
@router.post("/timeline/create", summary="手动追加时间线条目（如Milestone）")
async def create_timeline(
    data: TimelineCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    await _ensure_exists(db, models.PilotProperty, data.property_id, "物业")
    if data.investigation_id is not None:
        await _ensure_exists(db, models.Investigation, data.investigation_id, "调查")
    entry = models.Timeline(**data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"code": 0, "data": entry}


@router.get("/timeline", summary="时间线列表（property_id 过滤 + 分页）")
async def list_timelines(
    page: int = 1,
    page_size: int = 20,
    property_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.Timeline).order_by(models.Timeline.occurred_at.desc())
    if property_id is not None:
        stmt = stmt.where(models.Timeline.property_id == property_id)
    total, rows = await _paged_list(db, stmt, page, page_size)
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/timeline/{timeline_id}", summary="时间线条目详情")
async def get_timeline_detail(
    timeline_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    entry = await db.get(models.Timeline, timeline_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return {"code": 0, "data": entry}


@router.patch("/timeline/{timeline_id}", summary="Update Timeline entry (partial)")
async def update_timeline(
    timeline_id: int,
    data: TimelineUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Timeline, timeline_id)
    if not row:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    await _patch_row(db, row, data.model_dump(exclude_unset=True))
    return {"code": 0, "data": row}


@router.delete("/timeline/{timeline_id}", summary="Delete Timeline entry")
async def delete_timeline(
    timeline_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = await db.get(models.Timeline, timeline_id)
    if not row:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return await _delete_row(db, row)
