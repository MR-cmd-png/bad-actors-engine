from __future__ import annotations
from datetime import datetime
from typing import Annotated

from sqlalchemy import String, ForeignKey, func, JSON

from database import Base
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
Big_id = Annotated[int,mapped_column(primary_key=True,autoincrement=True)]
User = Annotated[str,mapped_column(String(100))]

class Entity(Base):
    __tablename__ = "entities"
    id : Mapped[Big_id] = mapped_column(comment="Entity id")
    name : Mapped[User] = mapped_column(comment="Entity Name")
    email : Mapped[User] = mapped_column(comment="Entity Email")
    phone : Mapped[User] = mapped_column(comment="Entity Phone")
    events : Mapped[Event]= relationship(back_populates="entity")
    rule_hits = relationship("RuleHit", back_populates="entity")
    score = relationship("Score", back_populates="entity", uselist=False)
class Event(Base):
    __tablename__ = "events"
    id : Mapped[Big_id] = mapped_column(comment="Event id")
    entity_id : Mapped[int] = mapped_column(ForeignKey("entities.id"),comment="Entity id")
    type : Mapped[User] = mapped_column(comment="Event Type")
    timestamp : Mapped[datetime] = mapped_column(insert_default=func.now(),default = func.now(),comment = "Event Timestamp")
    metadata_json : Mapped[dict] = mapped_column(JSON,comment="Event Metadata")
    entity = relationship("Entity", back_populates="events")
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