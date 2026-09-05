import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardOverview } from '../api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import {
  Building2, FolderSearch, AlertTriangle, ShieldAlert, ArrowRight,
  Zap, FileCheck, Flag, ChevronRight, ShieldCheck, Target, Eye,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ANABASED 工作台（对照参考稿）：Hero 横幅 + 统计卡 + 三色趋势 + 环形分布 + Recent events + 右栏预警/动态 + CTA
const HERO_IMG =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dramatic%20coastal%20cliff%20at%20dusk%2C%20dark%20blue%20ocean%20waves%20crashing%20on%20rocks%2C%20moody%20cinematic%20wide%20seascape%2C%20deep%20navy%20with%20amber%20sunset%20glow&image_size=landscape_16_9'

const levelVariant = (v?: string | null) =>
  v === 'Critical' || v === 'High' ? 'high' : v === 'Medium' ? 'medium' : v === 'Low' ? 'low' : 'default'

const fmtTime = (v: any) => (typeof v === 'string' ? v.slice(0, 19).replace('T', ' ') : '—')
const fmtDay = (v: any) => (typeof v === 'string' ? v.slice(5, 10).replace('T', ' ') : '—')

// 严重度配色（与参考稿 Clean/Medium/High 三色一致）
const SEV_COLORS: Record<string, string> = { Low: '#16a34a', Medium: '#f59e0b', High: '#dc2626', Critical: '#9f1239' }
// 时间线条目图标
const ENTRY_ICONS: Record<string, any> = { Event: Zap, Signal: AlertTriangle, Evidence: FileCheck, Assessment: ShieldAlert, Milestone: Flag }

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardOverview()
      .then((res: any) => {
        setData(res.data)
        setLoading(false)
      })
      .catch((e: any) => {
        setError(e.message || 'Failed to load overview')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-center py-24 text-text-secondary">Loading overview...</div>
  if (error) return <div className="text-center py-24 text-red-600">{error}</div>

  const dist = data.severity_distribution || {}
  const totalAssessments = Object.values(dist).reduce((s: number, v: any) => s + (v as number), 0)
  const highCount = (dist['High'] || 0) + (dist['Critical'] || 0)
  const trendData = data.daily_event_counts || []
  const pieData = Object.entries(dist)
    .filter(([, v]) => (v as number) > 0)
    .map(([name, value]) => ({ name, value }))

  // 统计卡（View all真实数值）
  const stats = [
    { label: 'Properties', value: data.property_count, icon: Building2, tint: 'bg-primary/10 text-primary' },
    { label: 'Open investigations', value: data.ongoing_investigation_count, icon: FolderSearch, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending signals', value: data.pending_signal_count, icon: AlertTriangle, tint: 'bg-amber-50 text-amber-600' },
    { label: 'High/Critical assessments', value: highCount, icon: ShieldAlert, tint: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-5">
      {/* ===================== Hero 横幅 ===================== */}
      <div className="relative rounded-2xl overflow-hidden min-h-[220px] flex">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/70 to-navy/30" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 w-full p-7 lg:p-9">
          <div>
            <h2 className="text-2xl lg:text-[32px] leading-tight font-extrabold text-white tracking-tight">
              Spot problems before they arrive.
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Smarter screening. Safer assets. Stronger returns.
            </p>
          </div>
          <div className="flex items-center gap-0 divide-x divide-white/15">
            {[
              { icon: Target, l1: 'Identify', l2: 'RISK' },
              { icon: ShieldCheck, l1: 'Prevent', l2: 'ISSUES' },
              { icon: Eye, l1: 'Protect', l2: 'BUSINESS' },
            ].map((f) => (
              <div key={f.l2} className="px-4 lg:px-6 flex flex-col items-center text-center first:pl-0 last:pr-0">
                <f.icon size={26} className="text-white mb-2" />
                <p className="text-xs font-bold text-white leading-tight">{f.l1}</p>
                <p className="text-[10px] font-semibold tracking-widest text-slate-300">{f.l2}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== 统计卡 ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} delay={i * 0.08}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">{stat.label}</p>
                <p className="text-3xl font-extrabold text-text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.tint.split(' ')[0]} flex items-center justify-center`}>
                <stat.icon size={22} className={stat.tint.split(' ')[1]} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ===================== 图表行：趋势 + 分布 ===================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 近30天事件风险趋势 */}
        <Card className="xl:col-span-2" delay={0.15}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-text-primary">Event risk trend (last 30 days)</h3>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-600" />Low</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Medium</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" />High</span>
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">No event data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  {(['Low', 'Medium', 'High'] as const).map((k) => (
                    <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEV_COLORS[k]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={SEV_COLORS[k]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={6} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: 12 }} />
                {(['High', 'Medium', 'Low'] as const).map((k) => (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={SEV_COLORS[k]}
                    strokeWidth={2}
                    fill={`url(#grad-${k})`}
                    dot={{ r: 2, fill: SEV_COLORS[k], strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Risk assessment distribution（环形 + 中心总数） */}
        <Card delay={0.2}>
          <h3 className="text-base font-bold text-text-primary mb-2">Risk assessment distribution</h3>
          {pieData.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">No assessment data yet</div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={SEV_COLORS[entry.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-extrabold text-text-primary">{totalAssessments}</p>
                  <p className="text-xs text-text-secondary">Risk assessments</p>
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {pieData.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLORS[p.name] }} />
                    <span className="text-text-secondary">{p.name}</span>
                    <span className="ml-auto font-semibold text-text-primary">{p.value as number}</span>
                    <span className="text-xs text-text-secondary w-12 text-right">
                      ({totalAssessments ? Math.round(((p.value as number) / totalAssessments) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ===================== Recent events + 右栏 ===================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent events表 */}
        <Card className="xl:col-span-2" hover={false} delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-text-primary">Recent events</h3>
            <button
              onClick={() => navigate('/events')}
              className="text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          {(data.recent_events || []).length === 0 ? (
            <div className="text-center py-14 text-text-secondary text-sm">No events yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Event', 'Property', 'Risk', 'Status'].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-text-secondary py-2.5 px-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_events.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-3 text-xs text-text-secondary whitespace-nowrap">{fmtDay(e.occurred_at)}</td>
                      <td className="py-3 px-3 text-sm font-medium text-text-primary max-w-[220px] truncate">{e.title}</td>
                      <td className="py-3 px-3 text-xs text-text-secondary max-w-[140px] truncate">{e.property_name ?? '—'}</td>
                      <td className="py-3 px-3"><Badge variant={levelVariant(e.severity)}>{e.severity}</Badge></td>
                      <td className="py-3 px-3"><Badge>{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 右栏：风险预警 + System activity */}
        <div className="space-y-5">
          <Card hover={false} delay={0.3}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-text-primary">Recent risk alerts</h3>
              <button
                onClick={() => navigate('/signals')}
                className="text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1"
              >
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="space-y-1">
              {(data.recent_signals || []).length === 0 && (
                <p className="text-center py-8 text-text-secondary text-sm">No alerts yet</p>
              )}
              {(data.recent_signals || []).map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => navigate('/signals')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-card-hover transition-colors text-left"
                >
                  <span className={`w-1 h-10 rounded-full shrink-0 ${s.importance === 'High' ? 'bg-red-600' : s.importance === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[11px] font-bold tracking-wider ${s.importance === 'High' ? 'text-red-600' : 'text-amber-600'}`}>
                      {s.importance === 'High' ? 'HIGH RISK' : s.importance === 'Medium' ? 'MEDIUM RISK' : 'LOW RISK'} · {s.status}
                    </span>
                    <span className="block text-sm font-medium text-text-primary truncate">{s.indicator}</span>
                    <span className="block text-[11px] text-text-secondary truncate">{s.property_name ?? '—'}</span>
                  </span>
                  <span className="text-[11px] text-text-secondary shrink-0">{fmtTime(s.observed_at).slice(11, 16)}</span>
                  <ChevronRight size={15} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </Card>

          <Card hover={false} delay={0.35}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-text-primary">System activity</h3>
            </div>
            <div className="space-y-3.5">
              {(data.recent_timeline || []).length === 0 && (
                <p className="text-center py-6 text-text-secondary text-sm">No activity yet</p>
              )}
              {(data.recent_timeline || []).map((t: any) => {
                const Icon = ENTRY_ICONS[t.entry_type] || Flag
                return (
                  <div key={t.id} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-bg-dark flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-text-secondary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary truncate">{t.title}</span>
                      <span className="block text-xs text-text-secondary truncate">{t.property_name ?? '—'}</span>
                    </span>
                    <span className="text-[11px] text-text-secondary shrink-0">{fmtTime(t.occurred_at).slice(5, 16)}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ===================== CTA 横幅 ===================== */}
      <div className="bg-navy rounded-2xl p-6 lg:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} className="text-white" />
          </span>
          <div>
            <p className="text-base font-bold text-white">Turn every insight into protection.</p>
            <p className="text-xs text-slate-400 mt-1">
              ANABASED Bad Actors Engine stitches actors, relationships, events and evidence into a defensible intelligence picture.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/property')}
          className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors shrink-0 shadow-sm"
        >
          <ShieldCheck size={16} />
          Open Property Intelligence
        </button>
      </div>
    </div>
  )
}
