# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
from database import get_db, Base, engine, Async_Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import models
from models import SEVERITY_RANK
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin
)
# 注意：所有业务路由必须在本文件末尾 SPA 兜底路由之前 include
from routers import property as property_routes
from routers import intel as intel_routes

app = FastAPI(title="Property Due Diligence Intelligence Engine MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== Startup (create tables + seed admin) =====================
@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables initialized")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        print("App will start but database operations may not work")
    try:
        await _seed_default_user()
    except Exception as e:
        print(f"Error seeding default admin user: {e}")
        import traceback
        traceback.print_exc()


async def _seed_default_user():
    async with Async_Session() as db:
        result = await db.execute(select(models.User).where(models.User.username == "admin"))
        user = result.scalar_one_or_none()
        if not user:
            admin = models.User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            await db.commit()
            print("Default admin user created (username: admin, password: admin123)")
        elif not verify_password("admin123", user.password_hash):
            user.password_hash = hash_password("admin123")
            user.is_active = True
            user.role = "admin"
            await db.commit()
            print("Admin password reset successful")


# ===================== Auth Models =====================
class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ===================== Auth Endpoints（协议保持不变） =====================
@app.post("/auth/register", summary="Register new user")
async def register_user(data: UserRegister, db: AsyncSession = Depends(get_db)):
    if data.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    if len(data.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    exist = (await db.execute(select(models.User).where(models.User.username == data.username))).scalar_one_or_none()
    if exist:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = models.User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "code": 0,
        "data": TokenResponse(
            access_token=token,
            user={"id": user.id, "username": user.username, "role": user.role}
        )
    }


@app.post("/auth/login", summary="Login and get JWT token")
async def login_user(data: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.username == data.username)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "code": 0,
        "data": TokenResponse(
            access_token=token,
            user={"id": user.id, "username": user.username, "role": user.role}
        )
    }


@app.get("/auth/me", summary="Get current user info")
async def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "code": 0,
        "data": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        }
    }


@app.post("/auth/logout", summary="Logout (client-side clear)")
async def logout():
    return {"code": 0, "message": "Logout successful"}


# ===================== Dashboard 概览（真实数据，取代旧 mock/high_risk） =====================
@app.get("/dashboard/overview", summary="Dashboard - 试点物业情报概览")
async def dashboard_overview(db: AsyncSession = Depends(get_db), _: models.User = Depends(get_current_user)):
    # 统计：物业数 / 进行中调查 / 待核实信号
    property_count = (await db.execute(
        select(func.count()).select_from(models.PilotProperty)
    )).scalar() or 0
    ongoing_investigation_count = (await db.execute(
        select(func.count()).select_from(models.Investigation)
        .where(models.Investigation.status == "进行中")
    )).scalar() or 0
    pending_signal_count = (await db.execute(
        select(func.count()).select_from(models.Signal)
        .where(models.Signal.status == "待核实")
    )).scalar() or 0

    # 风险评估分布与全局最高 severity
    assessments = (await db.execute(select(models.RiskAssessment))).scalars().all()
    severity_distribution = {"低": 0, "中": 0, "高": 0, "极高": 0}
    for a in assessments:
        severity_distribution[a.severity] = severity_distribution.get(a.severity, 0) + 1
    highest_severity = None
    if assessments:
        highest_severity = max(
            assessments, key=lambda a: SEVERITY_RANK.get(a.severity, 0)
        ).severity

    # 近 30 天事件按日 × 严重度计数（Dashboard 三色趋势图的真实数据源）
    since = datetime.now() - timedelta(days=30)
    trend_rows = (await db.execute(
        select(func.date(models.Event.occurred_at), models.Event.severity, func.count())
        .where(models.Event.occurred_at >= since)
        .group_by(func.date(models.Event.occurred_at), models.Event.severity)
    )).all()
    trend_map = {(str(r[0]), r[1]): r[2] for r in trend_rows}
    daily_event_counts = []
    for i in range(29, -1, -1):
        key = (datetime.now() - timedelta(days=i)).date().isoformat()
        daily_event_counts.append({
            "date": key[5:],  # MM-DD
            "低": trend_map.get((key, "低"), 0),
            "中": trend_map.get((key, "中"), 0),
            "高": trend_map.get((key, "高"), 0),
        })

    # 最近事件（带物业名，供「最近事件」表格）
    event_rows = (await db.execute(
        select(models.Event, models.PilotProperty)
        .outerjoin(models.PilotProperty, models.PilotProperty.id == models.Event.property_id)
        .order_by(models.Event.occurred_at.desc())
        .limit(6)
    )).all()
    recent_events = [
        {
            "id": e.id,
            "title": e.title,
            "event_category": e.event_category,
            "severity": e.severity,
            "status": e.status,
            "occurred_at": e.occurred_at,
            "property_name": p.name if p else None,
        }
        for e, p in event_rows
    ]

    # 最近预警信号（供右栏 Recent Risk Alerts）
    signal_rows = (await db.execute(
        select(models.Signal, models.PilotProperty)
        .outerjoin(models.PilotProperty, models.PilotProperty.id == models.Signal.property_id)
        .order_by(models.Signal.observed_at.desc())
        .limit(5)
    )).all()
    recent_signals = [
        {
            "id": s.id,
            "indicator": s.indicator,
            "signal_type": s.signal_type,
            "importance": s.importance,
            "status": s.status,
            "observed_at": s.observed_at,
            "property_name": p.name if p else None,
        }
        for s, p in signal_rows
    ]

    # 最近时间线动态（带物业名，供 System Activity）
    recent_rows = (await db.execute(
        select(models.Timeline, models.PilotProperty)
        .outerjoin(models.PilotProperty, models.PilotProperty.id == models.Timeline.property_id)
        .order_by(models.Timeline.occurred_at.desc())
        .limit(6)
    )).all()
    recent_timeline = [
        {
            "id": t.id,
            "property_name": p.name if p else None,
            "occurred_at": t.occurred_at,
            "entry_type": t.entry_type,
            "title": t.title,
            "description": t.description,
        }
        for t, p in recent_rows
    ]

    return {
        "code": 0,
        "data": {
            "property_count": property_count,
            "ongoing_investigation_count": ongoing_investigation_count,
            "pending_signal_count": pending_signal_count,
            "highest_severity": highest_severity,
            "severity_distribution": severity_distribution,
            "daily_event_counts": daily_event_counts,
            "recent_events": recent_events,
            "recent_signals": recent_signals,
            "recent_timeline": recent_timeline,
        },
    }


# ===================== 业务路由（务必在 SPA 兜底路由之前 include） =====================
app.include_router(property_routes.router)
app.include_router(intel_routes.router)


# ===================== Serve Frontend (React SPA) =====================
# Mount the built frontend dist directory
FRONTEND_DIR = Path(__file__).resolve().parent / "bad-actors-frontend" / "dist"

if FRONTEND_DIR.exists():
    # Mount static assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    # Catch-all route: serve index.html for SPA client-side routing
    # 必须始终定义在所有 API 路由之后，避免兜底吞掉 API
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
