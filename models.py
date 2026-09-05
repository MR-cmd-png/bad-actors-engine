# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
from datetime import datetime
from typing import Annotated, Optional

from sqlalchemy import String, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base

# ===================== 共享列类型别名 =====================
# 注意：别名不得与模型类同名（历史上 User 别名与 User 模型冲突导致 registry 解析失败）
Big_id = Annotated[int, mapped_column(primary_key=True, autoincrement=True)]
Str50 = Annotated[str, mapped_column(String(50))]
Str100 = Annotated[str, mapped_column(String(100))]
Str255 = Annotated[str, mapped_column(String(255))]
# 「发生/记录时间」类字段统一由Data库时间自动填充（closed_at / verified_at 这类后填字段用 Optional 保持可空）
AutoTime = Annotated[datetime, mapped_column(insert_default=func.now(), default=func.now())]

# 严重度权重（Low < Medium < High < Critical），profile 风险摘要与 dashboard 共用
SEVERITY_RANK = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}


class User(Base):
    __tablename__ = "users"
    # 鉴权模型保持原样（JWT 协议与其绑定，勿动）
    id: Mapped[Big_id] = mapped_column(comment="User id")
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="Username")
    password_hash: Mapped[str] = mapped_column(String(255), comment="Hashed password")
    role: Mapped[str] = mapped_column(String(20), default="user", comment="Role: admin or user")
    is_active: Mapped[bool] = mapped_column(default=True, comment="Whether user is active")


# 1) 试点物业：整个情报图景的锚点
class PilotProperty(Base):
    __tablename__ = "pilot_properties"
    id: Mapped[Big_id] = mapped_column(comment="Pilot property id")
    name: Mapped[Str100] = mapped_column(comment="物业名称")
    address: Mapped[Str255] = mapped_column(comment="物业地址")
    property_type: Mapped[Str50] = mapped_column(comment="Shopping Mall/Office Tower/Community Retail/Industrial Park/Other")
    ownership_or_management: Mapped[Str255] = mapped_column(comment="所有权/管理方")
    relevant_dates: Mapped[dict] = mapped_column(JSON, default=dict, comment="取得/开业/重大变更等日期 JSON")
    status: Mapped[Str50] = mapped_column(comment="物业状态")
    description: Mapped[Optional[str]] = mapped_column(String(1000), comment="物业描述")


# 2) 行为人：与物业相关或被识别的人/实体
class Actor(Base):
    __tablename__ = "actors"
    id: Mapped[Big_id] = mapped_column(comment="Actor id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    name: Mapped[Str100] = mapped_column(comment="Actor name")
    actor_type: Mapped[Str50] = mapped_column(comment="Individual/Legal Representative/Manager/Contractor/Tenant/Supplier/Former Employee/Other")
    role_in_property: Mapped[Optional[str]] = mapped_column(String(255), comment="与物业的角色")
    # 原本 contact_info(JSON) 拆成 email / phone 两独立列，避免前端强制写 JSON
    email: Mapped[Optional[str]] = mapped_column(String(100), comment="Email")
    phone: Mapped[Optional[str]] = mapped_column(String(50), comment="Phone number")
    background_notes: Mapped[Optional[str]] = mapped_column(String(1000), comment="Background notes")


# 3) Company/组织
class CompanyOrganization(Base):
    __tablename__ = "companies_organizations"
    id: Mapped[Big_id] = mapped_column(comment="Company id")
    property_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pilot_properties.id"), comment="关联物业（可空）")
    name: Mapped[Str100] = mapped_column(comment="Company/组织名称")
    org_type: Mapped[Str50] = mapped_column(comment="Company/Trust/Partnership/Social Org/Other")
    registration_no: Mapped[Optional[str]] = mapped_column(String(100), comment="注册号/统一社会信用代码")
    jurisdiction: Mapped[Optional[str]] = mapped_column(String(100), comment="注册地/管辖区")
    role: Mapped[Optional[str]] = mapped_column(String(255), comment="关联角色")
    notes: Mapped[Optional[str]] = mapped_column(String(1000), comment="备注")


# 4) 关系：通用边表（谁与谁、什么性质）
class Relationship(Base):
    __tablename__ = "relationships"
    id: Mapped[Big_id] = mapped_column(comment="Relationship id")
    subject_type: Mapped[str] = mapped_column(String(20), comment="actor/company/property")
    subject_id: Mapped[int] = mapped_column(comment="主体行 id")
    object_type: Mapped[str] = mapped_column(String(20), comment="actor/company/property")
    object_id: Mapped[int] = mapped_column(comment="客体行 id")
    relation_type: Mapped[Str50] = mapped_column(comment="Controlling/Position/Related Party Transaction/Family/Nominee Holding/Guarantee/Litigation Counterparty/Other")
    nature_description: Mapped[Optional[str]] = mapped_column(String(500), comment="关系性质描述")
    confidence: Mapped[Str50] = mapped_column(comment="置信度：High/Medium/Low")


# 5) Event：Allegation/纠纷/监管·Legal/可疑活动
class Event(Base):
    __tablename__ = "events"
    id: Mapped[Big_id] = mapped_column(comment="Event id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("actors.id"), comment="关联行为人（可空）")
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies_organizations.id"), comment="关联Company（可空）")
    event_category: Mapped[Str50] = mapped_column(comment="Allegation/Contract Dispute/Regulatory Penalty/诉讼/Arbitration/Suspicious Transaction/Complaint/Other")
    title: Mapped[Str255] = mapped_column(comment="Event标题")
    description: Mapped[Optional[str]] = mapped_column(String(1000), comment="Event描述")
    occurred_at: Mapped[AutoTime] = mapped_column(comment="发生时间")
    severity: Mapped[Str50] = mapped_column(comment="严重度：Low/Medium/High")
    status: Mapped[Str50] = mapped_column(comment="Event状态")


# 6) Signal：早期指标/Observation发现
class Signal(Base):
    __tablename__ = "signals"
    id: Mapped[Big_id] = mapped_column(comment="Signal id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    event_id: Mapped[Optional[int]] = mapped_column(ForeignKey("events.id"), comment="关联Event（可空）")
    indicator: Mapped[Str255] = mapped_column(comment="Signal内容/指标")
    signal_type: Mapped[Str50] = mapped_column(comment="Alert/Anomaly/Trend/Connection Red Flag/Other")
    importance: Mapped[Str50] = mapped_column(comment="重要度：Low/Medium/High")
    observed_at: Mapped[AutoTime] = mapped_column(comment="Observation时间")
    status: Mapped[Str50] = mapped_column(comment="Pending/Confirmed/Dismissed")
    description: Mapped[Optional[str]] = mapped_column(String(1000), comment="Signal描述")


# 7) 来源：信息从哪来、何时获得
class Source(Base):
    __tablename__ = "sources"
    id: Mapped[Big_id] = mapped_column(comment="Source id")
    name: Mapped[Str100] = mapped_column(comment="来源名称")
    source_type: Mapped[Str50] = mapped_column(comment="Business Registry/Court Document/News/Regulatory Notice/Contract/Interview/Site Visit/Whistleblower/Other")
    reference: Mapped[Optional[str]] = mapped_column(String(500), comment="链接或编号")
    obtained_at: Mapped[AutoTime] = mapped_column(comment="获得时间")
    reliability: Mapped[Str50] = mapped_column(comment="可靠性：High/Medium/Low")
    collector_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="采集人（登录态注入）")
    notes: Mapped[Optional[str]] = mapped_column(String(500), comment="备注")


# 8) Evidence与主张：支撑Assessment的事实/Document/Statement/Observation
class EvidenceClaim(Base):
    __tablename__ = "evidence_claims"
    id: Mapped[Big_id] = mapped_column(comment="Evidence id")
    property_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pilot_properties.id"), comment="关联物业（可空）")
    claim: Mapped[Str255] = mapped_column(comment="主张/事实描述")
    evidence_type: Mapped[Str50] = mapped_column(comment="Document/Statement/Observation/Data/Screenshot/Other")
    content_or_ref: Mapped[str] = mapped_column(String(1000), comment="内容或存放指引")
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"), comment="底层来源")
    supports_type: Mapped[str] = mapped_column(String(30), comment="支撑对象类型：event/signal/risk_assessment/actor/company")
    supports_id: Mapped[int] = mapped_column(comment="支撑对象行 id")
    reliability_note: Mapped[Optional[str]] = mapped_column(String(500), comment="可靠性说明")
    verified_at: Mapped[Optional[datetime]] = mapped_column(comment="核实时间（后填，可空）")


# 9) 风险Assessment：分析师撰写（取代旧自动打分 Score）
class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id: Mapped[Big_id] = mapped_column(comment="Risk assessment id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("actors.id"), comment="针对行为人（可空）")
    risk_category: Mapped[Str50] = mapped_column(comment="Compliance/Legal/Financial/Operational/Reputational/Related Party Transaction/Fraud/Other")
    severity: Mapped[Str50] = mapped_column(comment="严重度：Low/Medium/High/Critical")
    confidence: Mapped[Str50] = mapped_column(comment="置信度：High/Medium/Low")
    rationale: Mapped[str] = mapped_column(String(1000), comment="理由/论证")
    status: Mapped[Str50] = mapped_column(comment="Draft/复核Medium/Confirmed/Mitigated/Closed")
    assessed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="Assessment人（登录态注入）")
    assessed_at: Mapped[AutoTime] = mapped_column(comment="Assessment时间")


# 10) 调查/案件：顶层容器
class Investigation(Base):
    __tablename__ = "investigations"
    id: Mapped[Big_id] = mapped_column(comment="Investigation id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    title: Mapped[Str255] = mapped_column(comment="调查标题")
    case_no: Mapped[Optional[str]] = mapped_column(String(100), comment="案件编号")
    summary: Mapped[Optional[str]] = mapped_column(String(1000), comment="阶段结论")
    status: Mapped[Str50] = mapped_column(comment="进行Medium/Paused/Closed")
    lead_investigator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="Manager（登录态注入）")
    started_at: Mapped[AutoTime] = mapped_column(comment="开始时间")
    closed_at: Mapped[Optional[datetime]] = mapped_column(comment="Closed时间（后填，可空）")


# 11) 时间线：重大Event与发现的时序陈列
class Timeline(Base):
    __tablename__ = "timelines"
    id: Mapped[Big_id] = mapped_column(comment="Timeline id")
    property_id: Mapped[int] = mapped_column(ForeignKey("pilot_properties.id"), comment="所属物业")
    investigation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("investigations.id"), comment="关联调查（可空）")
    occurred_at: Mapped[AutoTime] = mapped_column(comment="发生时间")
    title: Mapped[Str255] = mapped_column(comment="条目标题")
    description: Mapped[Optional[str]] = mapped_column(String(1000), comment="条目描述")
    entry_type: Mapped[Str50] = mapped_column(comment="Event/Signal/Evidence/Assessment/Milestone")
    ref_type: Mapped[Optional[str]] = mapped_column(String(30), comment="引用对象类型：event/signal/evidence/risk_assessment/milestone")
    ref_id: Mapped[Optional[int]] = mapped_column(comment="引用对象行 id")
