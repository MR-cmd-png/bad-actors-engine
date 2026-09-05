# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
"""幂等演示种子：按 D:\\Desktop\\Railway\\demo_cases.csv 的 6 个预订风控案例构造单物业情报图景。

故事线：「湾景短租公寓」近 30 天 428 笔订单，风控标记 17 笔、沉淀 6 个典型案例：
    CASE-001 正常预订（ALLOW / LOW）            → 低风险放行
    CASE-002 多身份共用设备（FLAG_FOR_REVIEW / MEDIUM）
    CASE-003 同一身份高频预订（FLAG_FOR_REVIEW / MEDIUM）
    CASE-004 VPN 叠加高频（FLAG_FOR_REVIEW / MEDIUM）
    CASE-005 合成恶意行为人集群（BLOCK / HIGH）
    CASE-006 支付指纹跨身份复用（FLAG_FOR_REVIEW / HIGH）
每个案例 = 1 条事件 + 1 条风险评估（severity=expected_band，rationale 内含建议处置），
案例指标沉淀为信号（共享设备/高频/VPN/支付复用/集群），证据逐条挂来源；
全部时间线落在近 30 天，保证仪表盘「事件风险趋势」图有真实数据。

用法：
    python seed_pilot.py        # 幂等：物业已存在则跳过；缺 admin 用户会先 upsert
验证：
    启动 uvicorn 后 GET /property/{id}/profile 即见完整图景
"""
import asyncio
from datetime import datetime, timedelta

from sqlalchemy import select

from database import Base, engine, Async_Session
import models
from auth import hash_password

PROPERTY_NAME = "湾景短租公寓"


def _ago(days_ago: int, hour: int = 10) -> datetime:
    """距今 days_ago 天前某时刻（种子时间整体落在「近 30 天」窗口内）。"""
    base = datetime.now() - timedelta(days=days_ago)
    return base.replace(hour=hour, minute=0, second=0, microsecond=0)


async def _upsert_admin(db) -> models.User:
    """seed 前置：确保 admin 用户存在（与 _seed_default_user 同一口令协议）。"""
    result = await db.execute(select(models.User).where(models.User.username == "admin"))
    user = result.scalar_one_or_none()
    if not user:
        user = models.User(
            username="admin",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print("Seed: admin 用户已创建")
    return user


def _tl(db, prop, entry_type, title, occurred, ref_type=None, ref_id=None, description=None):
    """按 API 同样的规则写时间线（entry_type: 事件/信号/证据/评估/里程碑）。"""
    db.add(models.Timeline(
        property_id=prop.id,
        entry_type=entry_type,
        title=title,
        occurred_at=occurred,
        ref_type=ref_type,
        ref_id=ref_id,
        description=description,
    ))


async def main():
    # 建表幂等：未启动过 app 也能直接 seed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Async_Session() as db:
        admin = await _upsert_admin(db)

        exists = (await db.execute(
            select(models.PilotProperty).where(models.PilotProperty.name == PROPERTY_NAME)
        )).scalar_one_or_none()
        if exists:
            print(f"Seed 跳过：试点物业「{PROPERTY_NAME}」已存在 (id={exists.id})")
            return

        # ===================== 1. 试点物业 =====================
        prop = models.PilotProperty(
            name=PROPERTY_NAME,
            address="某市滨海路 26 号湾景公寓 6-18 层",
            property_type="其他",
            ownership_or_management="湾景公寓运营管理有限公司（委托运营）",
            relevant_dates={
                "接入 ANABASED 风控": _ago(27).date().isoformat(),
                "可疑集群识别": _ago(3).date().isoformat(),
            },
            status="运营中（风控观察）",
            description="短租公寓 98 间，近 30 天订单 428 笔；风控标记 17 笔，"
                        "沉淀 CASE-001~006 共 6 个典型案例（demo_cases.csv）。",
        )
        db.add(prop)
        await db.flush()
        _tl(db, prop, "里程碑", "接入 ANABASED 风控（Stage 1）", _ago(27, 9),
            ref_type="milestone", description="设备/IP/支付三要素开始全量采集")

        # ===================== 2. 行为人（每个案例一个代表性身份） =====================
        shen = models.Actor(  # CASE-001 正常住客
            property_id=prop.id, name="沈*然", actor_type="自然人",
            role_in_property="散客住客（CASE-001）",
            contact_info={"email": "shen***@gmail.com"},
            background_notes="低风险正常住客：设备/IP/支付方式均为独立唯一，历史订单无异常",
        )
        chen = models.Actor(  # CASE-002 共享设备
            property_id=prop.id, name="陈*薇", actor_type="租户",
            role_in_property="住客（CASE-002）",
            contact_info={"phone": "137****2210"},
            background_notes="与另外 4 个预订身份共用同一台设备下单",
        )
        liu = models.Actor(  # CASE-003 高频预订
            property_id=prop.id, name="刘*宇", actor_type="租户",
            role_in_property="住客（CASE-003）",
            contact_info={"phone": "150****8843"},
            background_notes="30 天内发起 14 次预订查询，远超正常频次",
        )
        zhao = models.Actor(  # CASE-004 VPN + 高频
            property_id=prop.id, name="赵*航", actor_type="租户",
            role_in_property="住客（CASE-004）",
            contact_info={"email": "z***@proximail.com"},
            background_notes="订单均出自 VPN/代理出口 IP，且预订频次偏高",
        )
        wu = models.Actor(  # CASE-005 合成集群主身份
            property_id=prop.id, name="吴*群", actor_type="其他",
            role_in_property="可疑集群主身份（CASE-005，关联 3 个身份）",
            contact_info={"email": "w***@maildrop.cn"},
            background_notes="背后集群重复使用相近身份、设备、IP 与支付指纹，疑似规模化恶意预订",
        )
        sun = models.Actor(  # CASE-006 支付复用
            property_id=prop.id, name="孙*倩", actor_type="租户",
            role_in_property="住客（CASE-006）",
            contact_info={"phone": "188****3027"},
            background_notes="其支付指纹与另外 4 个身份一致，疑似盗用同一支付工具",
        )
        db.add_all([shen, chen, liu, zhao, wu, sun])
        await db.flush()

        # ===================== 3. 公司/组织 =====================
        operator = models.CompanyOrganization(
            property_id=prop.id, name="湾景公寓运营管理有限公司", org_type="公司",
            registration_no="91330106MA7XXXXX0A", jurisdiction="某市",
            role="物业受托运营方", notes="负责前台、Channel Manager 与风控策略落地",
        )
        hengda = models.CompanyOrganization(
            property_id=prop.id, name="恒达商务咨询有限公司", org_type="公司",
            registration_no="91440304MA2YYYYY1B", jurisdiction="某市",
            role="涉案支付工具归属方", notes="其企业卡指纹在 CASE-006 中被多个身份复用，疑似被盗刷",
        )
        db.add_all([operator, hengda])
        await db.flush()

        # ===================== 4. 关系（案例指标 → 身份/公司之间的边） =====================
        rel_device = models.Relationship(  # CASE-002
            subject_type="actor", subject_id=chen.id,
            object_type="actor", object_id=liu.id,
            relation_type="其他",
            nature_description="两个预订身份共用同一台设备指纹（CASE-002 共享设备线索）",
            confidence="高",
        )
        rel_ip = models.Relationship(  # CASE-003/004
            subject_type="actor", subject_id=liu.id,
            object_type="actor", object_id=zhao.id,
            relation_type="其他",
            nature_description="高频预订集中出现在同一出口 IP 段（CASE-003 与 CASE-004 交叉）",
            confidence="中",
        )
        rel_card = models.Relationship(  # CASE-006
            subject_type="actor", subject_id=sun.id,
            object_type="company", object_id=hengda.id,
            relation_type="其他",
            nature_description="支付指纹命中恒达商务咨询企业卡，疑似盗用/复用（CASE-006）",
            confidence="高",
        )
        rel_ops = models.Relationship(
            subject_type="company", subject_id=operator.id,
            object_type="property", object_id=prop.id,
            relation_type="任职",
            nature_description="受托运营方：负责订单、前台风控与申诉处理",
            confidence="高",
        )
        rel_cluster = models.Relationship(  # CASE-005
            subject_type="actor", subject_id=wu.id,
            object_type="actor", object_id=chen.id,
            relation_type="其他",
            nature_description="集群主身份与陈*薇共用设备与支付指纹（CASE-005 指纹矩阵关联）",
            confidence="中",
        )
        db.add_all([rel_device, rel_ip, rel_card, rel_ops, rel_cluster])
        await db.flush()

        # ===================== 5. 来源 =====================
        src_engine = models.Source(
            name="ANABASED 风控引擎案件库", source_type="其他",
            reference="case/CASE-001~CASE-006",
            reliability="高", collector_id=admin.id,
            notes="设备/IP/支付三要素自动留痕，含 expected_action 与 expected_band",
        )
        src_pay = models.Source(
            name="支付网关交易日志", source_type="其他",
            reference="PSP-LOG-202608",
            reliability="高", collector_id=admin.id,
            notes="卡号指纹（PAN hash）级流水，可跨身份比对",
        )
        src_device = models.Source(
            name="设备指纹与 IP 情报平台", source_type="其他",
            reference="FP-INTEL/2026-08",
            reliability="中", collector_id=admin.id,
            notes="设备聚类与 VPN/代理出口识别",
        )
        src_front = models.Source(
            name="前台与客服走访记录", source_type="现场走访",
            reference="walkin-2026-08-30",
            reliability="中", collector_id=admin.id,
            notes="对可疑订单的入住核验与电话回访纪要",
        )
        src_ota = models.Source(
            name="订房平台申诉工单", source_type="其他",
            reference="OTA-TKT-77120",
            reliability="低", collector_id=admin.id,
            notes="集群关联身份的历史申诉与差评线索，仅供参考",
        )
        db.add_all([src_engine, src_pay, src_device, src_front, src_ota])
        await db.flush()

        # ===================== 6. 事件（6 案例 → 6 事件，全部落在近 30 天） =====================
        ev1 = models.Event(  # CASE-001 CLEAN / ALLOW / LOW
            property_id=prop.id, actor_id=shen.id,
            event_category="其他", title="CASE-001 正常预订放行",
            description="低风险正常住客：设备、IP、支付方式均唯一独立，按 ALLOW 处置。",
            occurred_at=_ago(24, 14), severity="低", status="已确认",
        )
        ev2 = models.Event(  # CASE-002 SHARED DEVICE / FLAG / MEDIUM
            property_id=prop.id, actor_id=chen.id,
            event_category="可疑交易", title="CASE-002 多身份共用设备",
            description="5 个住客身份共用同一台设备下单，按 FLAG_FOR_REVIEW 转人工复核。",
            occurred_at=_ago(20, 11), severity="中", status="待核实",
        )
        ev3 = models.Event(  # CASE-003 HIGH VELOCITY / FLAG / MEDIUM
            property_id=prop.id, actor_id=liu.id,
            event_category="可疑交易", title="CASE-003 同一身份高频预订",
            description="同一身份 30 天内 14 次预订查询，频次异常，按 FLAG_FOR_REVIEW 处理。",
            occurred_at=_ago(16, 16), severity="中", status="待核实",
        )
        ev4 = models.Event(  # CASE-004 VPN + VELOCITY / FLAG / MEDIUM
            property_id=prop.id, actor_id=zhao.id,
            event_category="可疑交易", title="CASE-004 VPN 接入叠加高频预订",
            description="VPN 信号与高频预订行为叠加出现，按 FLAG_FOR_REVIEW 加强核验。",
            occurred_at=_ago(12, 20), severity="中", status="复核中",
        )
        ev5 = models.Event(  # CASE-005 SYNTHETIC CLUSTER / BLOCK / HIGH
            property_id=prop.id, actor_id=wu.id,
            event_category="可疑交易", title="CASE-005 合成恶意行为人集群",
            description="身份、设备、IP、支付指纹全面重复的集群活动，已执行 BLOCK 拦截。",
            occurred_at=_ago(3, 9), severity="高", status="已确认",
        )
        ev6 = models.Event(  # CASE-006 PAYMENT REUSE / FLAG / HIGH
            property_id=prop.id, actor_id=sun.id,
            event_category="可疑交易", title="CASE-006 支付指纹跨身份复用",
            description="同一支付指纹出现在 5 个身份上，涉及恒达企业卡，按 FLAG_FOR_REVIEW 处理。",
            occurred_at=_ago(6, 13), severity="高", status="复核中",
        )
        db.add_all([ev1, ev2, ev3, ev4, ev5, ev6])
        await db.flush()
        for e in (ev1, ev2, ev3, ev4, ev6, ev5):
            _tl(db, prop, "事件", e.title, e.occurred_at, "event", e.id)

        # ===================== 7. 信号（案例指标 → 预警信号） =====================
        sig_share = models.Signal(  # CASE-002
            property_id=prop.id, event_id=ev2.id,
            indicator="5 个预订身份共用同一台设备指纹",
            signal_type="关联红旗", importance="高", status="已确认",
            description="设备聚类显示 5 个身份共享 1 台设备，典型代订/批量注册特征",
            observed_at=_ago(19, 10),
        )
        sig_velocity = models.Signal(  # CASE-003
            property_id=prop.id, event_id=ev3.id,
            indicator="同一身份 30 天内 14 次预订查询",
            signal_type="趋势", importance="中", status="待核实",
            description="预订速率显著高于物业均值（约 0.4 次/人/月）",
            observed_at=_ago(15, 10),
        )
        sig_vpn = models.Signal(  # CASE-004
            property_id=prop.id, event_id=ev4.id,
            indicator="订单来源 IP 命中 VPN/代理出口名单",
            signal_type="异常", importance="中", status="待核实",
            description="12 笔订单出自 3 个已知代理出口，时段集中于凌晨",
            observed_at=_ago(11, 10),
        )
        sig_pan = models.Signal(  # CASE-006
            property_id=prop.id, event_id=ev6.id,
            indicator="同一支付指纹出现于 5 个身份（恒达企业卡）",
            signal_type="关联红旗", importance="高", status="已确认",
            description="PAN hash 一致，涉及金额约 3.7 万元，疑似盗刷团伙试探消费",
            observed_at=_ago(5, 10),
        )
        sig_mail = models.Signal(  # CASE-005
            property_id=prop.id, event_id=ev5.id,
            indicator="集群身份注册邮箱为同一命名模式",
            signal_type="异常", importance="高", status="待核实",
            description="w***、q***、y***@maildrop.cn 同构，注册时间相邻",
            observed_at=_ago(3, 11),
        )
        db.add_all([sig_share, sig_velocity, sig_vpn, sig_pan, sig_mail])
        await db.flush()
        for s in (sig_share, sig_velocity, sig_vpn, sig_pan, sig_mail):
            _tl(db, prop, "信号", s.indicator, s.observed_at, "signal", s.id)

        # ===================== 8. 证据（每案例一条，逐条挂来源） =====================
        evd1 = models.EvidenceClaim(  # CASE-001
            property_id=prop.id, claim="CASE-001 三要素唯一性核验记录",
            evidence_type="截图", content_or_ref="风控引擎 case/CASE-001 核验页截图",
            source_id=src_engine.id, supports_type="event", supports_id=ev1.id,
            reliability_note="引擎自动留痕，可靠性高", verified_at=_ago(23),
        )
        evd2 = models.EvidenceClaim(  # CASE-002
            property_id=prop.id, claim="设备-身份关联图：5 身份共用 1 台设备",
            evidence_type="数据", content_or_ref="FP-INTEL 聚类报告 #FP-2026-08-19",
            source_id=src_device.id, supports_type="event", supports_id=ev2.id,
            reliability_note="情报平台输出，建议结合前台走访复核", verified_at=_ago(18),
        )
        evd3 = models.EvidenceClaim(  # CASE-003
            property_id=prop.id, claim="同一身份预订频次统计（30 天 14 次）",
            evidence_type="数据", content_or_ref="case/CASE-003 频次报表",
            source_id=src_engine.id, supports_type="event", supports_id=ev3.id,
            reliability_note="引擎统计直出", verified_at=_ago(14),
        )
        evd4 = models.EvidenceClaim(  # CASE-004
            property_id=prop.id, claim="VPN 出口 IP 命中名单（12 笔订单）",
            evidence_type="数据", content_or_ref="FP-INTEL 代理出口比对表 #2026-08-24",
            source_id=src_device.id, supports_type="event", supports_id=ev4.id,
            reliability_note="代理库存在误报可能，可靠性中等", verified_at=_ago(10),
        )
        evd5 = models.EvidenceClaim(  # CASE-006
            property_id=prop.id, claim="跨身份同卡指纹流水清单（5 身份 / 3.7 万元）",
            evidence_type="数据", content_or_ref="PSP-LOG-202608 第 44-51 页",
            source_id=src_pay.id, supports_type="event", supports_id=ev6.id,
            reliability_note="支付网关原始流水，可靠性高", verified_at=_ago(4),
        )
        evd6 = models.EvidenceClaim(  # CASE-005
            property_id=prop.id, claim="集群指纹关联矩阵（身份×设备×IP×支付）",
            evidence_type="数据", content_or_ref="case/CASE-005 关联矩阵导出",
            source_id=src_engine.id, supports_type="event", supports_id=ev5.id,
            reliability_note="多源交叉验证，支撑 BLOCK 处置决定", verified_at=_ago(2),
        )
        evd7 = models.EvidenceClaim(  # CASE-002 走访侧证
            property_id=prop.id, claim="前台询问纪要：陈*薇订单实际入住人与预订身份不符",
            evidence_type="陈述", content_or_ref="walkin-2026-08-30 第 3-4 页",
            source_id=src_front.id, supports_type="event", supports_id=ev2.id,
            reliability_note="一线人员陈述，与设备聚类结论互相印证", verified_at=_ago(17),
        )
        evd8 = models.EvidenceClaim(  # CASE-005 申诉工单侧证
            property_id=prop.id, claim="集群关联身份在订房平台的历史申诉与差评记录",
            evidence_type="截图", content_or_ref="OTA-TKT-77120 工单导出",
            source_id=src_ota.id, supports_type="event", supports_id=ev5.id,
            reliability_note="公开渠道线索，可靠性低，仅作辅助佐证", verified_at=_ago(2, 16),
        )
        db.add_all([evd1, evd2, evd3, evd4, evd5, evd6, evd7, evd8])
        await db.flush()
        for e in (evd1, evd2, evd3, evd4, evd5, evd6, evd7, evd8):
            _tl(db, prop, "证据", e.claim, e.verified_at or _ago(2), "evidence", e.id)

        # ===================== 9. 风险评估（band → severity，action → rationale 处置建议） =====================
        ra1 = models.RiskAssessment(  # CASE-001 ALLOW / LOW
            property_id=prop.id, actor_id=shen.id, assessed_by=admin.id,
            risk_category="合规", severity="低", confidence="高",
            rationale="三要素独立唯一、历史订单无异常，低风险正常住客。建议处置：ALLOW（放行）。",
            status="已确认",
        )
        ra2 = models.RiskAssessment(  # CASE-002 FLAG / MEDIUM
            property_id=prop.id, actor_id=chen.id, assessed_by=admin.id,
            risk_category="运营", severity="中", confidence="高",
            rationale="多身份共用设备指向代订或批量注册，需人工核实实际入住人。建议处置：FLAG_FOR_REVIEW。",
            status="复核中",
        )
        ra3 = models.RiskAssessment(  # CASE-003 FLAG / MEDIUM
            property_id=prop.id, actor_id=liu.id, assessed_by=admin.id,
            risk_category="运营", severity="中", confidence="中",
            rationale="预订频次异常但存在拼房/代订等合理解释，建议联系核实后再放开。建议处置：FLAG_FOR_REVIEW。",
            status="复核中",
        )
        ra4 = models.RiskAssessment(  # CASE-004 FLAG / MEDIUM
            property_id=prop.id, actor_id=zhao.id, assessed_by=admin.id,
            risk_category="运营", severity="中", confidence="中",
            rationale="VPN 叠加高频，规避风险特征明显，但代理库有误报可能。建议处置：FLAG_FOR_REVIEW。",
            status="复核中",
        )
        ra5 = models.RiskAssessment(  # CASE-005 BLOCK / HIGH
            property_id=prop.id, actor_id=wu.id, assessed_by=admin.id,
            risk_category="欺诈", severity="高", confidence="高",
            rationale="身份、设备、IP、支付指纹全面重复的合成集群，规模化恶意预订特征明确。"
                      "建议处置：BLOCK（拦截并拉黑主身份及 3 个关联身份）。",
            status="已确认",
        )
        ra6 = models.RiskAssessment(  # CASE-006 FLAG / HIGH
            property_id=prop.id, actor_id=sun.id, assessed_by=admin.id,
            risk_category="欺诈", severity="高", confidence="中",
            rationale="同一支付指纹跨 5 身份复用且指向恒达企业卡，疑似盗刷试探；需与发卡行并案核实。"
                      "建议处置：FLAG_FOR_REVIEW 并冻结相关订单结算。",
            status="复核中",
        )
        db.add_all([ra1, ra2, ra3, ra4, ra5, ra6])
        await db.flush()
        for ra, day in ((ra1, 23), (ra2, 18), (ra3, 14), (ra4, 10), (ra6, 4), (ra5, 2)):
            _tl(db, prop, "评估", f"风险评估：{ra.risk_category}（{ra.severity}）",
                _ago(day, 15), "risk_assessment", ra.id)

        # ===================== 10. 调查案件 =====================
        investigation = models.Investigation(
            property_id=prop.id, title="CASE-005 合成恶意行为人集群专项调查", case_no="INV-2026-005",
            summary="已固定身份×设备×IP×支付四维指纹关联矩阵，主身份吴*群及 3 个关联身份执行 BLOCK；"
                    "待办：与 CASE-006 恒达企业卡盗用线索并案，向发卡行调证。",
            status="进行中",
            lead_investigator_id=admin.id,
            started_at=_ago(4, 9),
        )
        db.add(investigation)
        await db.flush()
        _tl(db, prop, "里程碑", "集群专项调查立项（INV-2026-005）", _ago(4, 9),
            ref_type="milestone", description="负责人：admin，覆盖 CASE-005/006 两条线索")

        await db.commit()
        print(f"Seed 完成：试点物业「{PROPERTY_NAME}」id={prop.id}")
        print(f"  行为人 6 / 公司 2 / 关系 5 / 事件 6 / 信号 5 / 来源 5 / 证据 8 / 风险评估 6 / 调查 1 / 时间线 27")
        print(f"  打开 GET /property/{prop.id}/profile 查看完整情报图景")

    # 主动释放连接池，规避 Windows proactor 循环关闭时的 aiomysql 警告
    await engine.dispose()


asyncio.run(main())
