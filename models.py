# bad-actors-engine 恶意实体风险评分引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
from datetime import datetime
from typing import Annotated

from sqlalchemy import String, ForeignKey, func, JSON

from database import Base
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
Big_id = Annotated[int,mapped_column(primary_key=True,autoincrement=True)]
Str100 = Annotated[str,mapped_column(String(100))]

class User(Base):
    __tablename__ = "users"
    id: Mapped[Big_id] = mapped_column(comment="User id")
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="Username")
    password_hash: Mapped[str] = mapped_column(String(255), comment="Hashed password")
    role: Mapped[str] = mapped_column(String(20), default="user", comment="Role: admin or user")
    is_active: Mapped[bool] = mapped_column(default=True, comment="Whether user is active")

class Event(Base):
    __tablename__ = "events"
    id : Mapped[Big_id] = mapped_column(comment="Event id")
    entity_id : Mapped[int] = mapped_column(ForeignKey("entities.id"),comment="Entity id")
    type : Mapped[Str100] = mapped_column(comment="Event Type")
    timestamp : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),comment = "Event Timestamp")
    metadata_json : Mapped[dict] = mapped_column(JSON,comment="Event Metadata")
    entity = relationship("Entity", back_populates="events")

class Entity(Base):
    __tablename__ = "entities"
    id : Mapped[Big_id] = mapped_column(comment="Entity id")
    name : Mapped[Str100] = mapped_column(comment="Entity Name")
    email : Mapped[Str100] = mapped_column(comment="Entity Email")
    phone : Mapped[Str100] = mapped_column(comment="Entity Phone")
    events : Mapped[Event] = relationship(back_populates="entity")
    rule_hits = relationship("RuleHit", back_populates="entity")
    score = relationship("Score", back_populates="entity", uselist=False)
class Score(Base):
    __tablename__ = "scores"
    id : Mapped[Big_id] = mapped_column(comment="Score id")
    entity_id : Mapped[int] = mapped_column(ForeignKey("entities.id"),unique=True,comment="Entity id")
    score : Mapped[int] = mapped_column(default=0,comment="Score")
    risk_level : Mapped[str] = mapped_column(String(20),default="Low",comment="Risk Level")
    updated_at : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),onupdate=func.now(),comment = "Score Updated At")
    entity = relationship("Entity", back_populates="score")
class RuleHit(Base):
    __tablename__ = "rule_hits"
    id : Mapped[Big_id] = mapped_column(comment="Rule Hit id")
    entity_id : Mapped[int] = mapped_column(ForeignKey("entities.id"),comment="Entity id")
    rule_id : Mapped[str] = mapped_column(String(50),comment="Rule id")
    score : Mapped[int] = mapped_column(comment="Rule Hit Score")
    timestamp : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),comment = "Rule Hit Timestamp")
    entity = relationship("Entity", back_populates="rule_hits")
class Rule(Base):
    __tablename__ = "rules"
    id : Mapped[Big_id] = mapped_column(comment="Rule id")
    rule_id : Mapped[str] = mapped_column(String(50),unique=True,index=True,comment="Rule id")
    definition : Mapped[dict] = mapped_column(JSON,comment="Rule Definition")
    active : Mapped[bool] = mapped_column(default=True,comment="Rule Active")
