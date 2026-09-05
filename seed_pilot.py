# bad-actors-engine 商业地产尽职调查情报引擎
# Copyright (C) 2026 MR-cmd-png 保留所有著作权利
# Open Source License: MIT
# 未经作者许可，禁止去除版权标识、冒充原创进行商业售卖
"""幂等演示种子：围绕一个试点物业构造完整、自洽的情报图景。

故事线：「翡翠湾商业广场」是一个值得警惕的返租物业——运营方股权被代持、
工程发包给关联承包商、返租兑付违约败诉、资金异常转出，最终形成欺诈/关联交易双高风险结论。

用法：
    python seed_pilot.py        # 幂等：物业已存在则跳过；缺 admin 用户会先 upsert
验证：
    启动 uvicorn 后 GET /property/{id}/profile 即见完整图景
"""
import asyncio
from datetime import datetime

from sqlalchemy import select

from database import Base, engine, Async_Session
import models
from auth import hash_password

PROPERTY_NAME = "翡翠湾商业广场"


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
            address="某省某市滨湖区翡翠湾路 88 号",
            property_type="社区商业",
            ownership_or_management="翡翠湾商业运营管理有限公司（受托运营）",
            relevant_dates={
                "项目取得": "2018-11-20",
                "开业": "2019-06-01",
                "运营权变更": "2024-03-01",
            },
            status="在营（多起纠纷）",
            description="社区商业综合体，主力业态为售后返租商铺，涉及批量租户返租兑付纠纷。",
        )
        db.add(prop)
        await db.flush()
        _tl(db, prop, "里程碑", "物业开业", datetime(2019, 6, 1, 9, 0),
            ref_type="milestone", description="约 220 个铺位开业，返租模式招商占比 70%")

        # ===================== 2. 行为人 =====================
        zhang = models.Actor(
            property_id=prop.id, name="张*明", actor_type="法定代表人",
            role_in_property="运营公司法定代表人/实际控制人",
            contact_info={"phone": "138****6678"},
            background_notes="曾任职于两家已注销的商业管理公司，均有返还纠纷记录",
        )
        li = models.Actor(
            property_id=prop.id, name="李*成", actor_type="前员工",
            role_in_property="原工程部负责人（2025 年离职）",
            contact_info={},
            background_notes="离职后配合租户取证，掌握工程发包内情",
        )
        wang = models.Actor(
            property_id=prop.id, name="王*芳", actor_type="租户",
            role_in_property="返租租户维权代表",
            contact_info={"phone": "159****0231"},
            background_notes="代理 47 户租户参与集体投诉与诉讼",
        )
        db.add_all([zhang, li, wang])
        await db.flush()

        # ===================== 3. 公司/组织 =====================
        operator = models.CompanyOrganization(
            property_id=prop.id, name="翡翠湾商业运营管理有限公司", org_type="公司",
            registration_no="91400000MA0XXXXX0A", jurisdiction="某省某市",
            role="物业受托运营方", notes="注册资本 500 万，实缴疑似不足",
        )
        holder = models.CompanyOrganization(
            property_id=prop.id, name="恒晟投资合伙企业（有限合伙）", org_type="合伙企业",
            registration_no="91340000MA1YYYYY1B", jurisdiction="某省某市",
            role="运营公司隐名出资方", notes="成立时间晚于运营公司两年，疑似专门持股壳",
        )
        contractor = models.CompanyOrganization(
            property_id=prop.id, name="恒垒建设工程有限公司", org_type="公司",
            registration_no="91340000MA2ZZZZZ2C", jurisdiction="某省某市",
            role="物业改造工程承包商", notes="与恒晟合伙企业注册地址相同",
        )
        db.add_all([operator, holder, contractor])
        await db.flush()

        # ===================== 4. 关系（含代持 + 关联交易） =====================
        rel_hold = models.Relationship(
            subject_type="company", subject_id=holder.id,
            object_type="company", object_id=operator.id,
            relation_type="代持",
            nature_description="恒晟合伙企业替张*明代持运营公司 90% 股权，工商登记与实际出资人不符",
            confidence="中",
        )
        rel_trade = models.Relationship(
            subject_type="company", subject_id=operator.id,
            object_type="company", object_id=contractor.id,
            relation_type="关联交易",
            nature_description="公共区域改造工程以高出市场均价约 35% 发包给恒垒建设（注册地址与恒晟一致）",
            confidence="高",
        )
        rel_post1 = models.Relationship(
            subject_type="actor", subject_id=zhang.id,
            object_type="company", object_id=operator.id,
            relation_type="任职", nature_description="执行董事兼法定代表人（2025-01 变更登记）", confidence="高",
        )
        rel_post2 = models.Relationship(
            subject_type="actor", subject_id=zhang.id,
            object_type="company", object_id=holder.id,
            relation_type="任职", nature_description="恒晟合伙企业执行事务合伙人（未工商公示，访谈得知）", confidence="低",
        )
        rel_vs = models.Relationship(
            subject_type="actor", subject_id=wang.id,
            object_type="company", object_id=operator.id,
            relation_type="诉讼对手", nature_description="代表 47 户租户对运营公司提起返租兑付之诉", confidence="高",
        )
        db.add_all([rel_hold, rel_trade, rel_post1, rel_post2, rel_vs])
        await db.flush()

        # ===================== 5. 来源 =====================
        src_gsxt = models.Source(
            name="国家企业信用信息公示系统", source_type="工商登记",
            reference="https://www.gsxt.gov.cn（统一社会信用代码检索）",
            reliability="高", collector_id=admin.id,
            notes="2026-02-02 检索并截图存档",
        )
        src_wenshu = models.Source(
            name="中国裁判文书网", source_type="裁判文书",
            reference="(2025)豫0191民初8821号",
            reliability="高", collector_id=admin.id,
            notes="2026-02-10 下载全文",
        )
        src_news = models.Source(
            name="《每日财经观察》报道", source_type="新闻",
            reference="2025-11-05《翡翠湾返租款去向成谜》",
            reliability="中", collector_id=admin.id,
            notes="记者线索：运营公司账户大额转出至第三方",
        )
        src_penalty = models.Source(
            name="消防救援大队行政处罚决定书", source_type="监管公告",
            reference="滨消罚字〔2024〕0157 号",
            reliability="高", collector_id=admin.id,
            notes="2026-01-15 现场走访时调取",
        )
        src_contract = models.Source(
            name="改造工程发包合同及付款凭证", source_type="合同",
            reference="合同编号 FWL-2023-006（李*成提供复印件）",
            reliability="高", collector_id=admin.id,
            notes="含三笔大额付款回单",
        )
        db.add_all([src_gsxt, src_wenshu, src_news, src_penalty, src_contract])
        await db.flush()

        # ===================== 6. 事件 =====================
        ev_penalty = models.Event(
            property_id=prop.id, company_id=operator.id,
            event_category="监管处罚", title="消防设施不合格被处罚",
            description="疏散通道堵塞、喷淋系统失效，被责令限期改正并罚款 4.8 万元",
            occurred_at=datetime(2024, 8, 20), severity="中", status="已整改",
        )
        ev_lawsuit = models.Event(
            property_id=prop.id, actor_id=wang.id, company_id=operator.id,
            event_category="合同纠纷", title="47 户租户集体诉返租兑付违约",
            description="法院判决运营公司支付拖欠返租款及违约金合计约 620 万元",
            occurred_at=datetime(2025, 6, 30), severity="高", status="已解决",
        )
        ev_sue = models.Event(
            property_id=prop.id, company_id=contractor.id,
            event_category="诉讼", title="恒垒建设起诉运营公司索要工程尾款",
            description="主张工程尾款 380 万元，庭审中暴露双方实际控制人关联",
            occurred_at=datetime(2026, 2, 18), severity="中", status="进行中",
        )
        db.add_all([ev_penalty, ev_lawsuit, ev_sue])
        await db.flush()
        _tl(db, prop, "事件", ev_penalty.title, ev_penalty.occurred_at, "event", ev_penalty.id)
        _tl(db, prop, "事件", ev_lawsuit.title, ev_lawsuit.occurred_at, "event", ev_lawsuit.id)
        _tl(db, prop, "事件", ev_sue.title, ev_sue.occurred_at, "event", ev_sue.id)

        # ===================== 7. 信号（红旗） =====================
        sig_change = models.Signal(
            property_id=prop.id, event_id=ev_sue.id,
            indicator="运营公司一年内两次变更法定代表人，均变更为张*明本人",
            signal_type="关联红旗", importance="高", status="已确认",
            description="2025-01-10 与 2025-11-20 两次工商变更，疑似为应对诉讼转移责任主体",
            observed_at=datetime(2025, 11, 22),
        )
        sig_fund = models.Signal(
            property_id=prop.id, event_id=ev_lawsuit.id,
            indicator="返租监管账户资金在败诉前后大额转出至第三方",
            signal_type="异常", importance="高", status="待核实",
            description="媒体报道线索：约 900 万元分三笔转出，收款方与运营公司无业务往来",
            observed_at=datetime(2025, 11, 5),
        )
        db.add_all([sig_change, sig_fund])
        await db.flush()
        _tl(db, prop, "信号", sig_change.indicator, sig_change.observed_at, "signal", sig_change.id)
        _tl(db, prop, "信号", sig_fund.indicator, sig_fund.observed_at, "signal", sig_fund.id)

        # ===================== 8. 证据（每条挂来源） =====================
        evd1 = models.EvidenceClaim(
            property_id=prop.id, claim="运营公司 2025 年两次法定代表人变更记录",
            evidence_type="截图", content_or_ref="工商变更信息截图（存 assets/gsxt_20260202.png）",
            source_id=src_gsxt.id, supports_type="signal", supports_id=sig_change.id,
            reliability_note="官方公示系统直出，可靠性高",
            verified_at=datetime(2026, 2, 2),
        )
        evd2 = models.EvidenceClaim(
            property_id=prop.id, claim="法院判决运营公司向 47 户租户支付 620 万元",
            evidence_type="文件", content_or_ref="(2025)豫0191民初8821号判决书全文",
            source_id=src_wenshu.id, supports_type="event", supports_id=ev_lawsuit.id,
            reliability_note="生效判决，事实认定部分可直接引用",
            verified_at=datetime(2026, 2, 10),
        )
        evd3 = models.EvidenceClaim(
            property_id=prop.id, claim="消防处罚决定书及整改回执",
            evidence_type="文件", content_or_ref="滨消罚字〔2024〕0157 号复印件",
            source_id=src_penalty.id, supports_type="event", supports_id=ev_penalty.id,
            reliability_note="监管机关作出，效力确定",
            verified_at=datetime(2026, 1, 15),
        )
        evd4 = models.EvidenceClaim(
            property_id=prop.id, claim="改造工程发包价高于市场均价约 35%，且承包商与隐名出资方同址注册",
            evidence_type="数据", content_or_ref="FWL-2023-006 合同 + 三笔付款回单 + 同址注册比对表",
            source_id=src_contract.id, supports_type="event", supports_id=ev_sue.id,
            reliability_note="原件复印件由前工程部负责人提供，待司法审计确认",
        )
        evd5 = models.EvidenceClaim(
            property_id=prop.id, claim="媒体报道：约 900 万元返租监管资金分三笔转出至无业务往来的第三方",
            evidence_type="数据", content_or_ref="《每日财经观察》2025-11-05 报道存档 + 转账线索摘要",
            source_id=src_news.id, supports_type="signal", supports_id=sig_fund.id,
            reliability_note="新闻线索可靠性中等，需以银行流水核实",
        )
        db.add_all([evd1, evd2, evd3, evd4, evd5])
        await db.flush()
        _tl(db, prop, "证据", evd1.claim, evd1.verified_at or datetime(2026, 2, 2), "evidence", evd1.id)
        _tl(db, prop, "证据", evd2.claim, evd2.verified_at or datetime(2026, 2, 10), "evidence", evd2.id)
        _tl(db, prop, "证据", evd3.claim, evd3.verified_at or datetime(2026, 1, 15), "evidence", evd3.id)
        _tl(db, prop, "证据", evd4.claim, datetime(2026, 3, 1), "evidence", evd4.id)
        _tl(db, prop, "证据", evd5.claim, datetime(2026, 3, 5), "evidence", evd5.id)

        # ===================== 9. 风险评估 =====================
        ra_fraud = models.RiskAssessment(
            property_id=prop.id, assessed_by=admin.id,
            risk_category="欺诈", severity="极高", confidence="中",
            rationale="返租兑付已败诉仍大额转出监管资金，叠加法定代表人异常变更与股权代持，"
                      "存在借运营主体隔离债务、挪用返租款的典型欺诈特征；待资金流水核实后可上调置信度。",
            status="复核中",
        )
        ra_related = models.RiskAssessment(
            property_id=prop.id, actor_id=zhang.id, assessed_by=admin.id,
            risk_category="关联交易", severity="高", confidence="中",
            rationale="工程发包价格显著偏离市场且承包商与隐名出资方同址注册，"
                      "构成向关联方输送利益的初步证据链；建议调取完整付款凭证与造价鉴定。",
            status="初评",
        )
        ra_ops = models.RiskAssessment(
            property_id=prop.id, assessed_by=admin.id,
            risk_category="运营", severity="低", confidence="高",
            rationale="消防处罚事项已完成整改并取得回执，短期内无新增运营合规事件。",
            status="已缓解",
        )
        db.add_all([ra_fraud, ra_related, ra_ops])
        await db.flush()
        _tl(db, prop, "评估", "欺诈风险评估（极高）", datetime(2026, 3, 10), "risk_assessment", ra_fraud.id)
        _tl(db, prop, "评估", "关联交易风险评估（高）", datetime(2026, 3, 18), "risk_assessment", ra_related.id)
        _tl(db, prop, "评估", "运营合规风险评估（低）", datetime(2026, 3, 25), "risk_assessment", ra_ops.id)

        # ===================== 10. 调查案件 =====================
        investigation = models.Investigation(
            property_id=prop.id, title="翡翠湾返租纠纷专项调查", case_no="DD-2026-001",
            summary="已完成工商/裁判文书/媒体三线取证，核心待办为监管账户流水核实；"
                    "初步结论：存在欺诈与关联交易双重高风险。",
            status="进行中",
            lead_investigator_id=admin.id,
            started_at=datetime(2026, 5, 6),
        )
        db.add(investigation)
        await db.flush()
        _tl(db, prop, "里程碑", "专项调查立项（DD-2026-001）", datetime(2026, 5, 6, 10, 0),
            ref_type="milestone", description="负责人：admin，预计 8 周出阶段性报告")

        await db.commit()
        print(f"Seed 完成：试点物业「{PROPERTY_NAME}」id={prop.id}")
        print(f"  行为人 3 / 公司 3 / 关系 5 / 事件 3 / 信号 2 / 来源 5 / 证据 5 / 风险评估 3 / 调查 1")
        print(f"  打开 GET /property/{prop.id}/profile 查看完整情报图景")

    # 主动释放连接池，规避 Windows proactor 循环关闭时的 aiomysql 警告
    await engine.dispose()


asyncio.run(main())
