# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
"""试点物业 CRUD + 情报图景装配端点（本引擎的核心验证点）。"""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_admin
from database import get_db
import models

router = APIRouter(tags=["property"])

SEVERITY_RANK = models.SEVERITY_RANK


# ===================== Pydantic Request Models =====================
class PilotPropertyCreate(BaseModel):
    name: str
    address: str
    # Literal 在 API 层收口合法枚举值，DB 侧仍存中文字符串
    property_type: Literal["商场", "写字楼", "社区商业", "产业园", "其他"]
    ownership_or_management: str
    status: str = "在营"
    relevant_dates: dict = Field(default_factory=dict)
    description: Optional[str] = None


async def _get_property_or_404(db: AsyncSession, property_id: int) -> models.PilotProperty:
    prop = await db.get(models.PilotProperty, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


# ===================== Property CRUD =====================
@router.post("/property/create", summary="创建试点物业")
async def create_property(
    data: PilotPropertyCreate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    prop = models.PilotProperty(**data.model_dump())
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return {"code": 0, "data": prop}


@router.get("/property", summary="试点物业列表（分页 + 关键词）")
async def list_properties(
    page: int = 1,
    page_size: int = 10,
    keyword: str = "",
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    stmt = select(models.PilotProperty)
    if keyword:
        stmt = stmt.where(models.PilotProperty.name.like(f"%{keyword}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(models.PilotProperty.id.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return {"code": 0, "total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/property/{property_id}", summary="试点物业详情")
async def get_property_detail(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    prop = await _get_property_or_404(db, property_id)
    return {"code": 0, "data": prop}


# ===================== 情报图景装配（核心验证端点） =====================
@router.get("/property/{property_id}/profile", summary="装配单个物业的完整情报图景")
async def get_property_profile(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    prop = await _get_property_or_404(db, property_id)

    # 1) 归属该物业的各节点表（逐表 select，不建 ORM relationship，规避一对多注解坑）
    actors = (await db.execute(
        select(models.Actor).where(models.Actor.property_id == property_id).order_by(models.Actor.id)
    )).scalars().all()
    companies = (await db.execute(
        select(models.CompanyOrganization)
        .where(models.CompanyOrganization.property_id == property_id)
        .order_by(models.CompanyOrganization.id)
    )).scalars().all()
    events = (await db.execute(
        select(models.Event).where(models.Event.property_id == property_id).order_by(models.Event.occurred_at.desc())
    )).scalars().all()
    signals = (await db.execute(
        select(models.Signal).where(models.Signal.property_id == property_id).order_by(models.Signal.observed_at.desc())
    )).scalars().all()
    evidence = (await db.execute(
        select(models.EvidenceClaim)
        .where(models.EvidenceClaim.property_id == property_id)
        .order_by(models.EvidenceClaim.id)
    )).scalars().all()
    assessments = (await db.execute(
        select(models.RiskAssessment)
        .where(models.RiskAssessment.property_id == property_id)
        .order_by(models.RiskAssessment.assessed_at.desc())
    )).scalars().all()
    timeline = (await db.execute(
        select(models.Timeline)
        .where(models.Timeline.property_id == property_id)
        .order_by(models.Timeline.occurred_at.desc())
        .limit(200)
    )).scalars().all()

    # 2) 关系是全局边表：仅保留触及本物业范围内节点（物业/行为人/公司）的边
    actor_ids = {a.id for a in actors}
    company_ids = {c.id for c in companies}

    def _in_scope(node_type: str, node_id: int) -> bool:
        return (
            (node_type == "property" and node_id == property_id)
            or (node_type == "actor" and node_id in actor_ids)
            or (node_type == "company" and node_id in company_ids)
        )

    all_relationships = (await db.execute(
        select(models.Relationship).order_by(models.Relationship.id)
    )).scalars().all()
    relationships = [
        r for r in all_relationships
        if _in_scope(r.subject_type, r.subject_id) or _in_scope(r.object_type, r.object_id)
    ]

    # 3) 来源：取本物业证据所引用的底层来源
    source_ids = {e.source_id for e in evidence}
    sources = []
    if source_ids:
        sources = (await db.execute(
            select(models.Source).where(models.Source.id.in_(source_ids)).order_by(models.Source.id)
        )).scalars().all()

    # 4) 总体风险摘要：最高 severity + 最近评估状态
    if assessments:
        top = max(assessments, key=lambda a: SEVERITY_RANK.get(a.severity, 0))
        latest = max(assessments, key=lambda a: a.assessed_at or a.create_time)
        risk_summary = {
            "overall_severity": top.severity,
            "top_category": top.risk_category,
            "latest_status": latest.status,
            "assessment_count": len(assessments),
        }
    else:
        risk_summary = {
            "overall_severity": None,
            "top_category": None,
            "latest_status": None,
            "assessment_count": 0,
        }

    return {
        "code": 0,
        "data": {
            "property": prop,
            "actors": actors,
            "companies": companies,
            "relationships": relationships,
            "events": events,
            "signals": signals,
            "sources": sources,
            "evidence": evidence,
            "risk_assessments": assessments,
            "timeline": timeline,
            "risk_summary": risk_summary,
        },
    }


@router.get("/property/{property_id}/timeline", summary="单个物业的时间线")
async def get_property_timeline(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    await _get_property_or_404(db, property_id)
    rows = (await db.execute(
        select(models.Timeline)
        .where(models.Timeline.property_id == property_id)
        .order_by(models.Timeline.occurred_at.desc())
    )).scalars().all()
    return {"code": 0, "data": rows}
