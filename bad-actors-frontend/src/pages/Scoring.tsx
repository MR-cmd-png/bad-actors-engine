import { useState } from 'react'
import { calcEntityScore, batchCalculateScore } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { Activity, RefreshCw, Zap, CheckCircle, AlertTriangle, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export default function Scoring() {
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  {/* Full recalculation */}
  const [onlyWithEvents, setOnlyWithEvents] = useState(true)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResult, setBatchResult] = useState<any>(null)

  const handleCalc = async () => {
    if (!entityId) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res: any = await calcEntityScore(Number(entityId))
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    setBatchLoading(true)
    setBatchResult(null)
    setError('')
    try {
      const res: any = await batchCalculateScore(onlyWithEvents)
      setBatchResult(res.data || res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const riskColor = (level: string) => {
    const map: Record<string, 'low' | 'medium' | 'high'> = {
      Low: 'low', Medium: 'medium', High: 'high',
    }
    return map[level] || 'default' as any
  }

  const scoreColor = (level: string) => {
    const map: Record<string, string> = {
      Low: '#10b981', Medium: '#f59e0b', High: '#ef4444',
    }
    return map[level] || '#6366f1'
  }
  

  {/* Build bar chart data */}
  const barData = result?.hit_details?.map((hit: any) => ({
    name: hit.rule_id,
    score: hit.score,
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Scoring</h1>
        <p className="text-sm text-text-secondary mt-1">Manually trigger entity risk scoring engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input: single entity calculation */}
        <Card delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-primary-light" />
            <h3 className="font-semibold">Trigger Scoring</h3>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input label="Entity ID" placeholder="Enter entity ID to calculate" type="number"
                value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            </div>
            <Button onClick={handleCalc} loading={loading}>
              <Zap size={16} /> Calculate
            </Button>
          </div>
        </Card>

        {/* Full recalculation */}
        <Card delay={0.2}>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-primary-light" />
            <h3 className="font-semibold">Full Recalculation</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Batch recalculate all entity risk scores and levels based on imported entities and their event records.
          </p>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithEvents}
              onChange={(e) => setOnlyWithEvents(e.target.checked)}
              className="w-4 h-4 rounded accent-violet-500"
            />
            Only recalculate entities with events (skip empty)
          </label>
          <Button onClick={handleBatch} loading={batchLoading} className="w-full">
            <Zap size={16} /> Full Recalculation
          </Button>
        </Card>
      </div>

      {/* Calculating */}
      {batchLoading && (
        <Card delay={0}>
          <div className="flex items-center justify-center gap-3 py-10 text-text-secondary">
            <RefreshCw size={18} className="animate-spin text-primary-light" />
            <span className="text-sm">Scoring engine running, recalculating all entities…</span>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
          >
            ❌ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recalculation Results */}
      {batchResult && !batchLoading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card delay={0}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Recalculation Results</h3>
              <Badge>Time {batchResult.elapsed}s</Badge>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-bg-dark rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-text-primary">{batchResult.total}</p>
                <p className="text-xs text-text-secondary mt-1">Target Entities</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{batchResult.success}</p>
                <p className="text-xs text-text-secondary mt-1">Succeeded</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${batchResult.failed ? 'text-red-400' : 'text-text-secondary'}`}>
                  {batchResult.failed}
                </p>
                <p className="text-xs text-text-secondary mt-1">Failed</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary-light">{batchResult.elapsed}</p>
                <p className="text-xs text-text-secondary mt-1">Time (sec)</p>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-bg-dark rounded-lg p-4 text-center border border-red-500/20">
                <p className="text-2xl font-bold text-red-400">{batchResult.distribution?.High || 0}</p>
                <p className="text-xs text-text-secondary mt-1">High Risk</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-4 text-center border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{batchResult.distribution?.Medium || 0}</p>
                <p className="text-xs text-text-secondary mt-1">Medium Risk</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-4 text-center border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{batchResult.distribution?.Low || 0}</p>
                <p className="text-xs text-text-secondary mt-1">Low Risk</p>
              </div>
            </div>

            {/* TOP 10 */}
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-amber-400" />
              <h4 className="text-sm font-semibold">TOP 10 Risk Ranking</h4>
            </div>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Rank', 'ID', 'Name', 'Risk Score', 'Level'].map((h) => (
                      <th key={h} className="text-left text-xs text-text-secondary font-medium py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchResult.top?.map((r: any, i: number) => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="py-2 px-3 text-sm font-mono text-text-secondary">{i + 1}</td>
                      <td className="py-2 px-3 text-sm text-text-secondary">#{r.id}</td>
                      <td className="py-2 px-3 text-sm font-medium">{r.name}</td>
                      <td className={`py-2 px-3 text-sm font-bold ${scoreColor(r.risk_level)}`}>{r.score}</td>
                      <td className="py-2 px-3">
                        <Badge variant={riskColor(r.risk_level)}>{r.risk_level}</Badge>
                      </td>
                    </tr>
                  ))}
                  {(!batchResult.top || batchResult.top.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-sm text-text-secondary">
                        No scoring data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Failure details */}
            {batchResult.failed > 0 && batchResult.failures?.length > 0 && (
              <div className="mt-4 bg-bg-dark rounded-lg p-3 space-y-1 max-h-32 overflow-auto">
                {batchResult.failures.map((f: any, i: number) => (
                  <p key={i} className="text-xs text-text-secondary">
                    Entity #{f.entity_id}: <span className="text-red-400">{f.error}</span>
                  </p>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Result overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card hover={false} delay={0.1}>
                <p className="text-xs text-text-secondary">Entity ID</p>
                <p className="text-2xl font-bold mt-1">#{result.entity_id}</p>
              </Card>
              <Card hover={false} delay={0.15}>
                <p className="text-xs text-text-secondary">Total Risk Score</p>
                <p className="text-2xl font-bold mt-1" style={{ color: scoreColor(result.risk_level) }}>
                  {result.total_risk_score}
                </p>
              </Card>
              <Card hover={false} delay={0.2}>
                <p className="text-xs text-text-secondary">Risk Level</p>
                <div className="mt-2">
                  <Badge variant={riskColor(result.risk_level)}>{result.risk_level}</Badge>
                </div>
              </Card>
              <Card hover={false} delay={0.25}>
                <p className="text-xs text-text-secondary">Rule Hit Count</p>
                <p className="text-2xl font-bold mt-1 text-amber-400">{result.rule_hit_count}</p>
              </Card>
            </div>

            {/* Hit details */}
            {barData.length > 0 && (
              <Card delay={0.3}>
                <h3 className="font-semibold mb-4">📊 Rule Hit Score Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {barData.map((_: any, i: number) => (
                        <Cell key={i} fill={scoreColor(result.risk_level)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Hit details list */}
            {result.hit_details?.length > 0 && (
              <Card delay={0.35}>
                <h3 className="font-semibold mb-4">📝 Hit Details</h3>
                <div className="space-y-2">
                  {result.hit_details.map((hit: any, i: number) => (
                    <motion.div
                      key={hit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between bg-bg-dark rounded-lg p-3 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-sm font-mono">{hit.rule_id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-red-400">+{hit.score}</span>
                        <CheckCircle size={14} className="text-emerald-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {result.rule_hit_count === 0 && (
              <Card delay={0.3}>
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
                  <p className="text-lg font-semibold text-emerald-400">🎉 No rules hit for this entity</p>
                  <p className="text-sm text-text-secondary mt-1">Risk level is Low</p>
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}