import { useEffect, useState } from 'react'
import {
  Building2, Users, Network, Zap, AlertTriangle, FileCheck,
  ShieldAlert, Clock, Search,
} from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { getPropertyProfile } from '../api'
import { useProperties } from '../api/propertyContext'

// severity / confidence / importance 统一映射到 Badge 配色（极高按最高警示色处理）
const levelVariant = (v?: string | null) =>
  v === 'Critical' || v === 'High' ? 'high' : v === 'Medium' ? 'medium' : v === 'Low' ? 'low' : 'default'

const fmtTime = (v: any) => (typeof v === 'string' ? v.slice(0, 19).replace('T', ' ') : '—')

export default function Intelligence() {
  // 物业列表与选中态来自全局上下文（与顶栏切换器共享）
  const { properties, selectedId, setSelectedId, loading: propsLoading } = useProperties()
  const propertyId = selectedId
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (propertyId == null) return
    setLoading(true)
    getPropertyProfile(propertyId)
      .then((res: any) => {
        setProfile(res.data)
        setError('')
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message || 'Failed to assemble profile')
        setLoading(false)
      })
  }, [propertyId])

  if (propsLoading || (propertyId != null && loading && !profile)) {
    return <div className="text-center py-24 text-text-secondary">Assembling intelligence picture...</div>
  }
  if (error) return <div className="text-center py-24 text-red-600">{error}</div>
  if (properties.length === 0) {
    return (
      <div className="text-center py-24 text-text-secondary">
        <Building2 size={48} className="mx-auto mb-3 opacity-30" />
        <p>No pilot property yet — create one on the Property page</p>
      </div>
    )
  }
  if (!profile) return null

  const { property, actors, companies, relationships, events, signals, sources, evidence, risk_assessments, timeline, risk_summary } = profile

  // 主体名称查找：Relationships边的 subject/object -> 可读名称
  const nameOf = (type: string, id: number) => {
    if (type === 'property') return property?.name
    if (type === 'actor') return actors.find((a: any) => a.id === id)?.name ?? `actor#${id}`
    if (type === 'company') return companies.find((c: any) => c.id === id)?.name ?? `company#${id}`
    return `${type}#${id}`
  }

  const sourceById = (id: number) => sources.find((s: any) => s.id === id)

  return (
    <div className="space-y-6">
      {/* Header + property switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building2 size={22} className="text-primary-light" />
            {property.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {property.address} · {property.property_type} · {property.ownership_or_management}
          </p>
        </div>
        <select
          value={propertyId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          {properties.map((p: any) => (
            <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
          ))}
        </select>
      </div>

      {/* 总体风险摘要横幅 */}
      <Card hover={false} className="border-l-4 !border-l-red-500">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-red-400" />
            <div>
              <p className="text-xs text-text-secondary">Overall risk</p>
              <p className="text-lg font-bold text-text-primary">
                {risk_summary.overall_severity ?? 'No assessment'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Top risk category</p>
            <p className="text-sm font-semibold text-text-primary">{risk_summary.top_category ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Latest status</p>
            <p className="text-sm font-semibold text-text-primary">{risk_summary.latest_status ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Assessments</p>
            <p className="text-sm font-semibold text-text-primary">{risk_summary.assessment_count}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Property status</p>
            <Badge variant={levelVariant(null)}>{property.status}</Badge>
          </div>
        </div>
      </Card>

      {/* 关联主体：Actors + 公司 + Relationships */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card delay={0.1}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary-light" /> Actors（{actors.length}）
          </h3>
          <div className="space-y-3">
            {actors.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
            {actors.map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{a.name}</span>
                  <Badge>{a.actor_type}</Badge>
                </div>
                {a.role_in_property && <p className="text-xs text-text-secondary mt-1">{a.role_in_property}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.15}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-primary-light" /> Companies（{companies.length}）
          </h3>
          <div className="space-y-3">
            {companies.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
            {companies.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">{c.name}</span>
                  <Badge>{c.org_type}</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {[c.registration_no, c.jurisdiction, c.role].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.2}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Network size={16} className="text-primary-light" /> Relationships（{relationships.length}）
          </h3>
          <div className="space-y-3">
            {relationships.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
            {relationships.map((r: any) => (
              <div key={r.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-text-primary">
                    {nameOf(r.subject_type, r.subject_id)}
                    <span className="text-primary-light font-semibold"> —{r.relation_type}→ </span>
                    {nameOf(r.object_type, r.object_id)}
                  </p>
                  <Badge variant={levelVariant(r.confidence)}>{r.confidence}</Badge>
                </div>
                {r.nature_description && <p className="text-xs text-text-secondary mt-1">{r.nature_description}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Events + 信号 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card delay={0.25}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Zap size={16} className="text-primary-light" /> Events（{events.length}）
          </h3>
          <div className="space-y-3">
            {events.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
            {events.map((e: any) => (
              <div key={e.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">{e.title}</span>
                  <Badge variant={levelVariant(e.severity)}>{e.severity}</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {e.event_category} · {e.status} · {fmtTime(e.occurred_at)}
                </p>
                {e.description && <p className="text-xs text-text-secondary mt-1">{e.description}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.3}>
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" /> Signals（{signals.length}）
          </h3>
          <div className="space-y-3">
            {signals.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
            {signals.map((s: any) => (
              <div
                key={s.id}
                className={`p-3 rounded-lg border ${
                  s.importance === 'High'
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-bg-dark border-border/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    {s.importance === 'High' && <AlertTriangle size={13} className="text-red-600 shrink-0" />}
                    {s.indicator}
                  </span>
                  <Badge variant={levelVariant(s.importance)}>{s.importance}</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {s.signal_type} · {s.status} · {fmtTime(s.observed_at)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 证据（含来源） */}
      <Card delay={0.35}>
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileCheck size={16} className="text-primary-light" /> Evidence & sources（{evidence.length}）
        </h3>
        <div className="space-y-3">
          {evidence.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
          {evidence.map((ev: any) => {
            const src = sourceById(ev.source_id)
            return (
              <div key={ev.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">{ev.claim}</span>
                  <Badge>{ev.evidence_type}</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Supports {ev.supports_type}#{ev.supports_id}
                  {ev.content_or_ref && <> · {ev.content_or_ref}</>}
                </p>
                {src && (
                  <p className="text-xs text-text-secondary mt-1">
                    Source: {src.name}（{src.source_type} · Reliability
                    <span className={src.reliability === 'High' ? 'text-emerald-600' : src.reliability === 'Medium' ? 'text-amber-600' : 'text-red-600'}> {src.reliability}</span>）
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Risk assessments */}
      <Card delay={0.4}>
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShieldAlert size={16} className="text-primary-light" /> Risk assessments（{risk_assessments.length}）
        </h3>
        <div className="space-y-3">
          {risk_assessments.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
          {risk_assessments.map((ra: any) => (
            <div key={ra.id} className="p-3 rounded-lg bg-bg-dark border border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-text-primary">{ra.risk_category}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={levelVariant(ra.severity)}>{ra.severity}</Badge>
                  <Badge variant={levelVariant(ra.confidence)}>Confidence {ra.confidence}</Badge>
                  <Badge>{ra.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-1.5">{ra.rationale}</p>
              <p className="text-xs text-text-secondary/70 mt-1">Assessed: {fmtTime(ra.assessed_at)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card delay={0.45}>
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Clock size={16} className="text-primary-light" /> Timeline（{timeline.length}）
        </h3>
        <div className="relative pl-4 border-l border-border space-y-4">
          {timeline.length === 0 && <p className="text-xs text-text-secondary">No data</p>}
          {timeline.map((t: any) => (
            <div key={t.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-bg-card" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-text-secondary">{fmtTime(t.occurred_at)}</span>
                <Badge variant={t.entry_type === 'Signal' ? 'high' : 'default'}>{t.entry_type}</Badge>
                <span className="text-sm font-medium text-text-primary">{t.title}</span>
              </div>
              {t.description && <p className="text-xs text-text-secondary mt-1 ml-1">{t.description}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* 底部提示 */}
      <p className="text-xs text-text-secondary flex items-center gap-1.5">
        <Search size={12} />
        This picture is assembled live from /property/{propertyId}/profile — refresh after any change.
      </p>
    </div>
  )
}
