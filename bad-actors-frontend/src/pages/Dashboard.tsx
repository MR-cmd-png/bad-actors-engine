import { useEffect, useState } from 'react'
import { getHighRiskEntities } from '../api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { AlertTriangle, Users, ShieldAlert, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { motion } from "framer-motion"

const pieData = [
  { name: 'High', value: 0, color: '#ef4444' },
  { name: 'Medium', value: 0, color: '#f59e0b' },
  { name: 'Low', value: 0, color: '#10b981' },
]

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHighRiskEntities()
      .then((res: any) => {
        setData(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const highRiskList = data?.data || []
  const highRiskCount = data?.high_risk_count || 0

  const stats = [
    {
      label: 'High Risk Entities',
      value: highRiskCount,
      icon: ShieldAlert,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Today\'s New Events',
      value: '—',
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Pending Alerts',
      value: highRiskCount,
      icon: AlertTriangle,
      color: 'from-primary to-purple-500',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Active Rules',
      value: '—',
      icon: Users,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  // Mock trend data
  const trendData = [
    { date: '08-01', score: 20 },
    { date: '08-02', score: 35 },
    { date: '08-03', score: 28 },
    { date: '08-04', score: 62 },
    { date: '08-05', score: highRiskCount * 15 || 45 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Bad Actor Detection Engine — Global Overview</p>
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
        {/* Trend Chart */}
        <Card className="lg:col-span-2" delay={0.2}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Risk Score Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card delay={0.3}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Risk Level Distribution</h3>
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
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
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
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-xs text-text-secondary">{p.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* High Risk Table */}
      <Card delay={0.4}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">🔴 High Risk Entity List</h3>
          <Badge variant="high">{highRiskCount} entities</Badge>
        </div>
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading...</div>
        ) : highRiskList.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <ShieldAlert size={48} className="mx-auto mb-3 opacity-30" />
            <p>No high risk entities</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['ID', 'Name', 'Email', 'Phone', 'Risk Score', 'Level', 'Updated At'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-text-secondary py-3 px-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {highRiskList.map((item: any, i: number) => (
                  <motion.tr
                    key={item.entity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-bg-card-hover/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-mono text-text-secondary">#{item.entity.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-text-primary">{item.entity.name}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{item.entity.email}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{item.entity.phone}</td>
                    <td className="py-3 px-4">
                      <span className="text-lg font-bold text-red-400">{item.score}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="high">{item.risk_level}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary">
                      {item.update_time?.slice(0, 19).replace('T', ' ')}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}