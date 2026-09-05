# bad-actors-engine Commercial Real Estate Due-Diligence Intelligence Engine
# Copyright (C) 2026 MR-cmd-png  All rights reserved.
# Open Source License: MIT
# No copyright notice may be removed without prior written permission.
"""Idempotent demo seed: builds a single-property intelligence picture around 6
booking-risk cases from D:\\Desktop\\Railway\\demo_cases.csv.

Story: "Harborview Short-Term Rentals" — 428 orders in the past 30 days, 17
risk-flagged, distilled into 6 canonical cases:
    CASE-001 Legitimate booking (ALLOW / LOW)
    CASE-002 Shared device across identities (FLAG_FOR_REVIEW / MEDIUM)
    CASE-003 Same identity high-velocity booking (FLAG_FOR_REVIEW / MEDIUM)
    CASE-004 VPN + high-velocity (FLAG_FOR_REVIEW / MEDIUM)
    CASE-005 Synthetic cluster of bad actors (BLOCK / HIGH)
    CASE-006 Payment fingerprint reuse across identities (FLAG_FOR_REVIEW / HIGH)
Each case = 1 Event + 1 RiskAssessment (severity = expected_band, rationale
contains recommended disposition), signals are distilled from case indicators
(shared device / velocity / VPN / payment reuse / cluster), evidence attached
to sources; all timeline entries fall within the last 30 days so the dashboard
"Event Risk Trend" chart has real data.

Usage:
    python seed_pilot.py        # idempotent; skips if property exists; upserts admin
Verify:
    Start uvicorn then GET /property/{id}/profile for the full picture
"""
import asyncio
from datetime import datetime, timedelta

from sqlalchemy import select

from database import Base, engine, Async_Session
import models
from auth import hash_password

PROPERTY_NAME = "Harborview STR Tower"


def _ago(days_ago: int, hour: int = 10) -> datetime:
    """Return a datetime 'days_ago' days ago — all seed times sit inside a 30-day window."""
    base = datetime.now() - timedelta(days=days_ago)
    return base.replace(hour=hour, minute=0, second=0, microsecond=0)


async def _upsert_admin(db) -> models.User:
    """Ensure admin user exists with the same password协议 as _seed_default_user."""
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
        print("Seed: admin user created")
    return user


def _tl(db, prop, entry_type, title, occurred, ref_type=None, ref_id=None, description=None):
    """Write a timeline entry — same rules as the API (entry_type: Event/Signal/Evidence/Assessment/Milestone)."""
    db.add(models.Timeline(
        property_id=prop.id,
        entry_type=entry_type,
        title=title,
        occurred_at=occurred,
        ref_type=ref_type,
        ref_id=ref_id,
        description=description,
    ))


async def main(dispose_engine: bool = True):
    # Idempotent table create — seed works even if the app has never run.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Async_Session() as db:
        admin = await _upsert_admin(db)

        exists = (await db.execute(
            select(models.PilotProperty).where(models.PilotProperty.name == PROPERTY_NAME)
        )).scalar_one_or_none()
        if exists:
            print(f"Seed SKIP: property '{PROPERTY_NAME}' already exists (id={exists.id})")
            return

        # ===================== 1. Pilot Property =====================
        prop = models.PilotProperty(
            name=PROPERTY_NAME,
            address="26 Binhai Boulevard, Harborview Residence, Floors 6–18",
            property_type="Other",
            ownership_or_management="Harborview Property Management Co., Ltd. (operator engaged)",
            relevant_dates={
                "ANABASED onboarding": _ago(27).date().isoformat(),
                "Synthetic cluster identified": _ago(3).date().isoformat(),
            },
            status="Operating (under watch)",
            description="98 STR units, 428 orders in the past 30 days; 17 risk-flagged, "
                        "distilled into 6 canonical cases (CASE-001~006, demo_cases.csv).",
        )
        db.add(prop)
        await db.flush()
        _tl(db, prop, "Milestone", "ANABASED Stage 1 onboarding", _ago(27, 9),
            ref_type="milestone", description="Device/IP/payment triple signals now captured end-to-end")

        # ===================== 2. Actors (one representative identity per case) =====================
        shen = models.Actor(  # CASE-001 clean guest
            property_id=prop.id, name="Shen Ran", actor_type="Individual",
            role_in_property="Leisure guest (CASE-001)",
            email="shen***@gmail.com",
            background_notes="Low-risk legitimate guest: device, IP and payment are each unique; no anomalies in history.",
        )
        chen = models.Actor(  # CASE-002 shared device
            property_id=prop.id, name="Chen Wei", actor_type="Tenant",
            role_in_property="Guest (CASE-002)",
            phone="+86-137****2210",
            background_notes="Shares one device fingerprint with 4 other booking identities.",
        )
        liu = models.Actor(  # CASE-003 high velocity
            property_id=prop.id, name="Liu Yu", actor_type="Tenant",
            role_in_property="Guest (CASE-003)",
            phone="+86-150****8843",
            background_notes="Issued 14 booking queries in 30 days — far above the typical frequency.",
        )
        zhao = models.Actor(  # CASE-004 VPN + velocity
            property_id=prop.id, name="Zhao Hang", actor_type="Tenant",
            role_in_property="Guest (CASE-004)",
            email="z***@proximail.com",
            background_notes="All orders originate from VPN/proxy exit IPs and booking frequency is elevated.",
        )
        wu = models.Actor(  # CASE-005 cluster lead
            property_id=prop.id, name="Wu Qun", actor_type="Other",
            role_in_property="Suspected cluster lead (CASE-005, linked to 3 identities)",
            email="w***@maildrop.cn",
            background_notes="Head of a cluster reusing similar identities, devices, IPs and payment fingerprints — suspected synthetic bulk booking.",
        )
        sun = models.Actor(  # CASE-006 payment reuse
            property_id=prop.id, name="Sun Qian", actor_type="Tenant",
            role_in_property="Guest (CASE-006)",
            phone="+86-188****3027",
            background_notes="Payment fingerprint matches 4 other identities — likely a stolen payment instrument.",
        )
        db.add_all([shen, chen, liu, zhao, wu, sun])
        await db.flush()

        # ===================== 3. Companies =====================
        operator = models.CompanyOrganization(
            property_id=prop.id, name="Harborview Property Management Co., Ltd.", org_type="Company",
            registration_no="91330106MA7XXXXX0A", jurisdiction="Hangzhou, PRC",
            role="Engaged property operator", notes="Front desk, Channel Manager and risk policy execution.",
        )
        hengda = models.CompanyOrganization(
            property_id=prop.id, name="Hengda Business Consulting Co., Ltd.", org_type="Company",
            registration_no="91440304MA2YYYYY1B", jurisdiction="Shenzhen, PRC",
            role="Owner of disputed payment card", notes="Corporate card fingerprint reused across multiple identities in CASE-006 — possibly stolen.",
        )
        db.add_all([operator, hengda])
        await db.flush()

        # ===================== 4. Relationships (case indicators → edges between identities / companies) =====================
        rel_device = models.Relationship(  # CASE-002
            subject_type="actor", subject_id=chen.id,
            object_type="actor", object_id=liu.id,
            relation_type="Other",
            nature_description="Two booking identities share one device fingerprint (shared-device lead from CASE-002).",
            confidence="High",
        )
        rel_ip = models.Relationship(  # CASE-003/004
            subject_type="actor", subject_id=liu.id,
            object_type="actor", object_id=zhao.id,
            relation_type="Other",
            nature_description="High-velocity bookings overlap on the same exit-IP block (CASE-003 × CASE-004 cross-signal).",
            confidence="Medium",
        )
        rel_card = models.Relationship(  # CASE-006
            subject_type="actor", subject_id=sun.id,
            object_type="company", object_id=hengda.id,
            relation_type="Other",
            nature_description="Payment fingerprint resolves to Hengda corporate card — suspected theft / unauthorized reuse (CASE-006).",
            confidence="High",
        )
        rel_ops = models.Relationship(
            subject_type="company", subject_id=operator.id,
            object_type="property", object_id=prop.id,
            relation_type="Position",
            nature_description="Engaged operator: orders, front-desk risk controls, dispute handling.",
            confidence="High",
        )
        rel_cluster = models.Relationship(  # CASE-005
            subject_type="actor", subject_id=wu.id,
            object_type="actor", object_id=chen.id,
            relation_type="Other",
            nature_description="Cluster lead Wu Qun shares device and payment fingerprints with Chen Wei (CASE-005 fingerprint matrix link).",
            confidence="Medium",
        )
        db.add_all([rel_device, rel_ip, rel_card, rel_ops, rel_cluster])
        await db.flush()

        # ===================== 5. Sources =====================
        src_engine = models.Source(
            name="ANABASED Risk Engine case library", source_type="Other",
            reference="case/CASE-001~CASE-006",
            reliability="High", collector_id=admin.id,
            notes="Automatic device/IP/payment trail retention; includes expected_action and expected_band.",
        )
        src_pay = models.Source(
            name="Payment gateway transaction logs", source_type="Other",
            reference="PSP-LOG-202608",
            reliability="High", collector_id=admin.id,
            notes="PAN-hash level ledger — cross-identity comparison possible.",
        )
        src_device = models.Source(
            name="Device fingerprint & IP intelligence", source_type="Other",
            reference="FP-INTEL/2026-08",
            reliability="Medium", collector_id=admin.id,
            notes="Device clustering and VPN / proxy exit detection.",
        )
        src_front = models.Source(
            name="Front-desk walk-in records", source_type="Site Visit",
            reference="walkin-2026-08-30",
            reliability="Medium", collector_id=admin.id,
            notes="On-site occupancy verification and follow-up calls for suspicious orders.",
        )
        src_ota = models.Source(
            name="OTA appeal tickets", source_type="Other",
            reference="OTA-TKT-77120",
            reliability="Low", collector_id=admin.id,
            notes="Historical appeals and negative reviews from cluster-linked identities — reference only.",
        )
        db.add_all([src_engine, src_pay, src_device, src_front, src_ota])
        await db.flush()

        # ===================== 6. Events (6 cases → 6 Events, all within past 30 days) =====================
        ev1 = models.Event(  # CASE-001 CLEAN / ALLOW / LOW
            property_id=prop.id, actor_id=shen.id,
            event_category="Other", title="CASE-001 Legitimate booking allowed",
            description="Low-risk legitimate guest: device, IP and payment are each unique — disposition ALLOW.",
            occurred_at=_ago(24, 14), severity="Low", status="Confirmed",
        )
        ev2 = models.Event(  # CASE-002 SHARED DEVICE / FLAG / MEDIUM
            property_id=prop.id, actor_id=chen.id,
            event_category="Suspicious Transaction", title="CASE-002 Shared device across identities",
            description="5 guest identities placed orders from the same device — disposition FLAG_FOR_REVIEW → manual.",
            occurred_at=_ago(20, 11), severity="Medium", status="Pending",
        )
        ev3 = models.Event(  # CASE-003 HIGH VELOCITY / FLAG / MEDIUM
            property_id=prop.id, actor_id=liu.id,
            event_category="Suspicious Transaction", title="CASE-003 High-velocity bookings from one identity",
            description="14 booking queries in 30 days from the same identity — anomalous — disposition FLAG_FOR_REVIEW.",
            occurred_at=_ago(16, 16), severity="Medium", status="Pending",
        )
        ev4 = models.Event(  # CASE-004 VPN + VELOCITY / FLAG / MEDIUM
            property_id=prop.id, actor_id=zhao.id,
            event_category="Suspicious Transaction", title="CASE-004 VPN + high-velocity booking",
            description="VPN signal overlaps with high-velocity booking pattern — disposition FLAG_FOR_REVIEW with enhanced verification.",
            occurred_at=_ago(12, 20), severity="Medium", status="Under Review",
        )
        ev5 = models.Event(  # CASE-005 SYNTHETIC CLUSTER / BLOCK / HIGH
            property_id=prop.id, actor_id=wu.id,
            event_category="Suspicious Transaction", title="CASE-005 Synthetic cluster of bad actors",
            description="Cluster activity with fully repeated identities, devices, IPs and payment fingerprints — disposition BLOCK enforced.",
            occurred_at=_ago(3, 9), severity="High", status="Confirmed",
        )
        ev6 = models.Event(  # CASE-006 PAYMENT REUSE / FLAG / HIGH
            property_id=prop.id, actor_id=sun.id,
            event_category="Suspicious Transaction", title="CASE-006 Payment fingerprint reuse across identities",
            description="One payment fingerprint seen on 5 identities, linked to Hengda corporate card — disposition FLAG_FOR_REVIEW.",
            occurred_at=_ago(6, 13), severity="High", status="Under Review",
        )
        db.add_all([ev1, ev2, ev3, ev4, ev5, ev6])
        await db.flush()
        for e in (ev1, ev2, ev3, ev4, ev6, ev5):
            _tl(db, prop, "Event", e.title, e.occurred_at, "event", e.id)

        # ===================== 7. Signals (case indicators → AlertSignals) =====================
        sig_share = models.Signal(  # CASE-002
            property_id=prop.id, event_id=ev2.id,
            indicator="5 booking identities share one device fingerprint",
            signal_type="Connection Red Flag", importance="High", status="Confirmed",
            description="Device clustering shows 5 identities on one device — classic proxy / bulk-registration pattern.",
            observed_at=_ago(19, 10),
        )
        sig_velocity = models.Signal(  # CASE-003
            property_id=prop.id, event_id=ev3.id,
            indicator="14 booking queries in 30 days from a single identity",
            signal_type="Trend", importance="Medium", status="Pending",
            description="Booking rate substantially above property average (~0.4 per guest per month).",
            observed_at=_ago(15, 10),
        )
        sig_vpn = models.Signal(  # CASE-004
            property_id=prop.id, event_id=ev4.id,
            indicator="Order-origin IPs matched against known VPN / proxy exit list",
            signal_type="Anomaly", importance="Medium", status="Pending",
            description="12 orders from 3 known proxy exits, timestamps concentrated around midnight.",
            observed_at=_ago(11, 10),
        )
        sig_pan = models.Signal(  # CASE-006
            property_id=prop.id, event_id=ev6.id,
            indicator="One payment fingerprint across 5 identities (Hengda corporate card)",
            signal_type="Connection Red Flag", importance="High", status="Confirmed",
            description="Matching PAN hash, total exposure ~CNY 37,000 — likely card-testing ring.",
            observed_at=_ago(5, 10),
        )
        sig_mail = models.Signal(  # CASE-005
            property_id=prop.id, event_id=ev5.id,
            indicator="Cluster-identity signup emails follow one naming pattern",
            signal_type="Anomaly", importance="High", status="Pending",
            description="w***, q***, y***@maildrop.cn are near-isomorphic, registered in rapid succession.",
            observed_at=_ago(3, 11),
        )
        db.add_all([sig_share, sig_velocity, sig_vpn, sig_pan, sig_mail])
        await db.flush()
        for s in (sig_share, sig_velocity, sig_vpn, sig_pan, sig_mail):
            _tl(db, prop, "Signal", s.indicator, s.observed_at, "signal", s.id)

        # ===================== 8. Evidence (one per case, attached to sources) =====================
        evd1 = models.EvidenceClaim(  # CASE-001
            property_id=prop.id, claim="CASE-001 triple-signal uniqueness check",
            evidence_type="Screenshot", content_or_ref="Risk engine case/CASE-001 verification page screenshot",
            source_id=src_engine.id, supports_type="event", supports_id=ev1.id,
            reliability_note="Automatic engine retention — high reliability.", verified_at=_ago(23),
        )
        evd2 = models.EvidenceClaim(  # CASE-002
            property_id=prop.id, claim="Device-identity graph: 5 identities on 1 device",
            evidence_type="Data", content_or_ref="FP-INTEL clustering report #FP-2026-08-19",
            source_id=src_device.id, supports_type="event", supports_id=ev2.id,
            reliability_note="Intel platform output — recommend cross-check with front-desk walk-ins.", verified_at=_ago(18),
        )
        evd3 = models.EvidenceClaim(  # CASE-003
            property_id=prop.id, claim="Single-identity booking frequency stats (14 in 30 days)",
            evidence_type="Data", content_or_ref="case/CASE-003 frequency report",
            source_id=src_engine.id, supports_type="event", supports_id=ev3.id,
            reliability_note="Direct engine statistics.", verified_at=_ago(14),
        )
        evd4 = models.EvidenceClaim(  # CASE-004
            property_id=prop.id, claim="VPN exit IP list hit (12 orders)",
            evidence_type="Data", content_or_ref="FP-INTEL proxy-exit comparison table #2026-08-24",
            source_id=src_device.id, supports_type="event", supports_id=ev4.id,
            reliability_note="Proxy DB may contain false positives — medium confidence.", verified_at=_ago(10),
        )
        evd5 = models.EvidenceClaim(  # CASE-006
            property_id=prop.id, claim="Cross-identity same-card fingerprint ledger (5 identities / CNY 37,000)",
            evidence_type="Data", content_or_ref="PSP-LOG-202608, pp. 44–51",
            source_id=src_pay.id, supports_type="event", supports_id=ev6.id,
            reliability_note="Raw payment-gateway ledger — high reliability.", verified_at=_ago(4),
        )
        evd6 = models.EvidenceClaim(  # CASE-005
            property_id=prop.id, claim="Cluster fingerprint matrix (identity × device × IP × payment)",
            evidence_type="Data", content_or_ref="case/CASE-005 matrix export",
            source_id=src_engine.id, supports_type="event", supports_id=ev5.id,
            reliability_note="Multi-source cross-check — underpins the BLOCK decision.", verified_at=_ago(2),
        )
        evd7 = models.EvidenceClaim(  # CASE-002 walk-in corroboration
            property_id=prop.id, claim="Front-desk statement: Chen Wei's check-in identity does not match the booking identity",
            evidence_type="Statement", content_or_ref="walkin-2026-08-30, pp. 3–4",
            source_id=src_front.id, supports_type="event", supports_id=ev2.id,
            reliability_note="Front-line statement — independent corroboration of device clustering.", verified_at=_ago(17),
        )
        evd8 = models.EvidenceClaim(  # CASE-005 OTA appeal ticket corroboration
            property_id=prop.id, claim="Historical appeals and negative reviews from cluster-linked identities on the booking platform",
            evidence_type="Screenshot", content_or_ref="OTA-TKT-77120 ticket export",
            source_id=src_ota.id, supports_type="event", supports_id=ev5.id,
            reliability_note="Public-facing signal — low reliability, supporting evidence only.", verified_at=_ago(2, 16),
        )
        db.add_all([evd1, evd2, evd3, evd4, evd5, evd6, evd7, evd8])
        await db.flush()
        for e in (evd1, evd2, evd3, evd4, evd5, evd6, evd7, evd8):
            _tl(db, prop, "Evidence", e.claim, e.verified_at or _ago(2), "evidence", e.id)

        # ===================== 9. Risk Assessments (band → severity, action → rationale with disposition) =====================
        ra1 = models.RiskAssessment(  # CASE-001 ALLOW / LOW
            property_id=prop.id, actor_id=shen.id, assessed_by=admin.id,
            risk_category="Compliance", severity="Low", confidence="High",
            rationale="Triple signals are independent and unique, history clean — low-risk legitimate guest. Recommended disposition: ALLOW.",
            status="Confirmed",
        )
        ra2 = models.RiskAssessment(  # CASE-002 FLAG / MEDIUM
            property_id=prop.id, actor_id=chen.id, assessed_by=admin.id,
            risk_category="Operational", severity="Medium", confidence="High",
            rationale="Shared device across identities points to proxy booking or bulk registration — manual guest verification required. Recommended disposition: FLAG_FOR_REVIEW.",
            status="Under Review",
        )
        ra3 = models.RiskAssessment(  # CASE-003 FLAG / MEDIUM
            property_id=prop.id, actor_id=liu.id, assessed_by=admin.id,
            risk_category="Operational", severity="Medium", confidence="Medium",
            rationale="High booking frequency is anomalous but can be explained by room-sharing or proxy-buying — contact to verify before allowing. Recommended disposition: FLAG_FOR_REVIEW.",
            status="Under Review",
        )
        ra4 = models.RiskAssessment(  # CASE-004 FLAG / MEDIUM
            property_id=prop.id, actor_id=zhao.id, assessed_by=admin.id,
            risk_category="Operational", severity="Medium", confidence="Medium",
            rationale="VPN overlays with high-velocity booking — clear evasion signal, though proxy DB may have false positives. Recommended disposition: FLAG_FOR_REVIEW with enhanced verification.",
            status="Under Review",
        )
        ra5 = models.RiskAssessment(  # CASE-005 BLOCK / HIGH
            property_id=prop.id, actor_id=wu.id, assessed_by=admin.id,
            risk_category="Fraud", severity="High", confidence="High",
            rationale="Fully repeated identities, devices, IPs and payment fingerprints — synthetic bulk-booking cluster confirmed. Recommended disposition: BLOCK main identity and 3 linked identities.",
            status="Confirmed",
        )
        ra6 = models.RiskAssessment(  # CASE-006 FLAG / HIGH
            property_id=prop.id, actor_id=sun.id, assessed_by=admin.id,
            risk_category="Fraud", severity="High", confidence="Medium",
            rationale="One payment fingerprint reused across 5 identities and linked to Hengda corporate card — suspected card-testing ring; coordinate with issuing bank. Recommended disposition: FLAG_FOR_REVIEW + freeze related order settlements.",
            status="Under Review",
        )
        db.add_all([ra1, ra2, ra3, ra4, ra5, ra6])
        await db.flush()
        for ra, day in ((ra1, 23), (ra2, 18), (ra3, 14), (ra4, 10), (ra6, 4), (ra5, 2)):
            _tl(db, prop, "Assessment", f"Risk Assessment: {ra.risk_category} ({ra.severity})",
                _ago(day, 15), "risk_assessment", ra.id)

        # ===================== 10. Investigation =====================
        investigation = models.Investigation(
            property_id=prop.id, title="INV-2026-005 Synthetic bad-actor cluster", case_no="INV-2026-005",
            summary="Identity × device × IP × payment 4-D fingerprint matrix secured; lead Wu Qun + 3 linked identities BLOCK'd. "
                    "Next: merge with Hengda corporate-card theft lead (CASE-006), subpoena records from card issuer.",
            status="In Progress",
            lead_investigator_id=admin.id,
            started_at=_ago(4, 9),
        )
        db.add(investigation)
        await db.flush()
        _tl(db, prop, "Milestone", "Cluster investigation opened (INV-2026-005)", _ago(4, 9),
            ref_type="milestone", description="Manager: admin — covers CASE-005/006 leads")

        await db.commit()
        print(f"Seed OK: property '{PROPERTY_NAME}' id={prop.id}")
        print(f"  Actors 6 / Companies 2 / Relationships 5 / Events 6 / Signals 5 / Sources 5 / Evidence 8 / Risk Assessments 6 / Investigations 1 / Timeline 27")
        print(f"  Open GET /property/{prop.id}/profile for the full intelligence picture")

    # Proactively release the connection pool — avoids aiomysql warnings on Windows proactor shutdown.
    if dispose_engine:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
