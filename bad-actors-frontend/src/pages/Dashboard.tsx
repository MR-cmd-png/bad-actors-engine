import { useEffect, useState } from 'react'
import { getDashboardOverview } from '../api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { Building2, FolderSearch, ShieldAlert, AlertTriangle, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// severity -> 饼图配色
const fmtTime = (v: any) => (typeof v === 'string' ? v.slice(0, 19).replace('T', ' ') : '—')

const PIE_COLORS: Record<string, string> = {
  低: '#10b981',
  中: '#f59e0b',
  高: '#ef4444',
  极高: '#a21caf',
}

export default function Dashboard() {
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
        setError(e.message || '加载概览失败')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-center py-24 text-text-secondary">加载概览中...</div>
  if (error) return <div className="text-center py-24 text-red-400">{error}</div>

  const stats = [
    {
      label: '试点物业',
      value: data.property_count,
      icon: Building2,
      color: 'from-primary to-purple-500',
      bgColor: 'bg-primary/10',
    },
    {
      label: '进行中调查',
      value: data.ongoing_investigation_count,
      icon: FolderSearch,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: '最高风险等级',
      value: data.highest_severity ?? '—',
      icon: ShieldAlert,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: '待核实信号',
      value: data.pending_signal_count,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
    },
  ]

  const pieData = Object.entries(data.severity_distribution || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">商业地产尽职调查情报引擎 — 试点概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} delay={i * 0.1}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon size={22} className="text-text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity distribution */}
        <Card delay={0.3}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">风险评估严重度分布</h3>
          {pieData.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">暂无风险评估数据</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[p.name] }} />
                    <span className="text-xs text-text-secondary">{p.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Recent timeline */}
        <Card className="lg:col-span-2" delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Clock size={15} /> 最近时间线动态
            </h3>
            <Badge>{(data.recent_timeline || []).length} 条</Badge>
          </div>
          {(data.recent_timeline || []).length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">暂无时间线记录</div>
          ) : (
            <div className="space-y-3">
              {data.recent_timeline.map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-dark border border-border/60">
                  <span className="text-xs font-mono text-text-secondary whitespace-nowrap mt-0.5">
                    {fmtTime(t.occurred_at)}
                  </span>
                  <Badge variant={t.entry_type === '信号' ? 'high' : 'default'}>{t.entry_type}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{t.title}</p>
                    <p className="text-xs text-text-secondary">
                      {t.property_name ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
