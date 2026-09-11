# bad-actors-engine CMS 模块
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
"""CMS CRUD：让非开发同事通过浏览器里的管理页（/admin/cms）直接编辑 Landing/Dashboard 文案。

为何需要这张表：
- 之前同事用 Hostinger 网页编辑器改 index.html / assets/*.js，但 Vite build 产物带 hash
- 每次 git push + Hostinger 自动部署都会覆盖掉同事的改动，造成前后端对不上
- 方案：把「可编辑文案」迁到 DB，前端启动时从后端拉最新配置动态渲染
- 同事改 CMS 内容 = 调后端 API（有 PATCH），和代码部署天然解耦

约定：
- 写接口 require_admin，读接口 get_current_user（与 intel.py 业务表一致）
- page_key 唯一（landing_hero / landing_features / landing_stats 等）
- content_json 存任意结构：字典/列表/嵌套都行（前端自己解析）
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_admin
from database import get_db
import models

router = APIRouter(tags=["cms"])


# ===================== Pydantic 模型 =====================

class CmsPageCreate(BaseModel):
    """创建 CMS 页面内容（content_json 是 JSON dict，灵活承载 features 列表、stats 数值等）"""
    page_key: str = Field(..., max_length=50, description="Unique key (e.g. landing_hero)")
    title: Optional[str] = Field(None, max_length=255)
    subtitle: Optional[str] = Field(None, max_length=500)
    content_json: dict = Field(default_factory=dict, description="Structured content (arbitrary JSON object)")


class CmsPageUpdate(BaseModel):
    """局部更新（所有字段 Optional；只更新请求体里传了的字段）"""
    title: Optional[str] = Field(None, max_length=255)
    subtitle: Optional[str] = Field(None, max_length=500)
    content_json: Optional[dict] = None


# ===================== 通用 patch/delete =====================
# 与 intel.py _patch_row / _delete_row 完全一致的模式（局部更新 + 硬删）

async def _patch_row(db: AsyncSession, row, data: dict):
    for k, v in data.items():
        if v is not None:
            setattr(row, k, v)
    await db.commit()
    await db.refresh(row)


async def _delete_row(db: AsyncSession, row):
    await db.delete(row)
    await db.commit()
    return {"code": 0, "message": "Deleted"}


# ===================== 路由 =====================

@router.get("/cms", summary="List all CMS pages (authenticated read)")
async def list_cms(db: AsyncSession = Depends(get_db), _: models.User = Depends(get_current_user)):
    rows = (await db.execute(select(models.CmsPage).order_by(models.CmsPage.page_key))).scalars().all()
    return {"code": 0, "data": rows}


@router.get("/cms/{page_key}", summary="Get a single CMS page by page_key")
async def get_cms(page_key: str, db: AsyncSession = Depends(get_db), _: models.User = Depends(get_current_user)):
    row = (await db.execute(select(models.CmsPage).where(models.CmsPage.page_key == page_key))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"CMS page '{page_key}' not found")
    return {"code": 0, "data": row}


@router.post("/cms", summary="Create CMS page (admin)")
async def create_cms(
    data: CmsPageCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    exist = (await db.execute(
        select(models.CmsPage).where(models.CmsPage.page_key == data.page_key)
    )).scalar_one_or_none()
    if exist:
        raise HTTPException(status_code=400, detail=f"CMS page '{data.page_key}' already exists")
    row = models.CmsPage(**data.model_dump(), updated_by_id=user.id)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"code": 0, "data": row}


@router.patch("/cms/{page_key}", summary="Update CMS page (admin, partial)")
async def patch_cms(
    page_key: str,
    data: CmsPageUpdate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    row = (await db.execute(select(models.CmsPage).where(models.CmsPage.page_key == page_key))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"CMS page '{page_key}' not found")
    payload = data.model_dump(exclude_unset=True)
    if payload:
        await _patch_row(db, row, payload)
    row.updated_by_id = user.id
    await db.commit()
    await db.refresh(row)
    return {"code": 0, "data": row}


@router.delete("/cms/{page_key}", summary="Delete CMS page (admin)")
async def delete_cms(
    page_key: str,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    row = (await db.execute(select(models.CmsPage).where(models.CmsPage.page_key == page_key))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"CMS page '{page_key}' not found")
    return await _delete_row(db, row)
