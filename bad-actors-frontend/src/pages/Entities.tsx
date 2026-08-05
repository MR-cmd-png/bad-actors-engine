import { useCallback, useEffect, useMemo, useState } from 'react'
import { createEntity, getEntityDetail, listEntities } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import BatchImportModal from '../components/BatchImportModal'
import {
  UserPlus, Search, AlertTriangle, Clock, RefreshCw,
  ChevronLeft, ChevronRight, FileText, Users, Upload,
} from 'lucide-react'
import { motion } from 'framer-motion'

const RISK_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Low', label: 'Low Risk' },
  { value: 'Medium', label: 'Medium Risk' },
  { value: 'High', label: 'High Risk' },
  { value: 'Unscored', label: 'Unscored' },
]

const ORDER_OPTIONS = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'score_desc', label: 'Risk Score ↓' },
  { value: 'score_asc', label: 'Risk Score ↑' },
]

export default function Entities() {
  // ---------- Create / Detail ----------
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [searchId, setSearchId] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)

  // ---------- List Filtering ----------
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [orderBy, setOrderBy] = useState('created_desc')
  const [loadingList, setLoadingList] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Keyword debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(keywordInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [keywordInput])

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res: any = await listEntities({
        page, page_size: pageSize, keyword,
        risk_level: riskFilter, order_by: orderBy,
      })
      setList(res.data || [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setLoadingList(false)
    }
  }, [page, pageSize, keyword, riskFilter, orderBy])

  useEffect(() => { fetchList() }, [fetchList])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.phone) {
      setMessage('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await createEntity(form)
      setMessage('✅ Entity created successfully!')
      setForm({ name: '', email: '', phone: '' })
      fetchList()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const openDetail = async (id: number) => {
    setLoading(true)
    try {
      const res: any = await getEntityDetail(id)
      setDetail(res)
      setDetailOpen(true)
    } catch (e: any) {
      setMessage('❌ ' + e.message)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchId) openDetail(Number(searchId))
  }

  // Group hits: only show latest hit per rule
  const groupedHits = useMemo(() => {
    if (!detail?.rule_hit_records) return [] as any[]
    const map = new Map<string, any>()
    for (const hit of detail.rule_hit_records) {
      const prev = map.get(hit.rule_id)
      if (!prev || (hit.timestamp || '') > (prev.timestamp || '')) {
        map.set(hit.rule_id, hit)
      }
    }
    return [...map.values()]
  }, [detail])

  const riskBadge = (level?: string): any => {
    const map: Record<string, string> = { Low: 'low', Medium: 'medium', High: 'high' }
    return map[level || ''] || 'default'
  }

  const scoreColor = (level?: string) => {
    const map: Record<string, string> = {
      Low: 'text-emerald-400', Medium: 'text-amber-400', High: 'text-red-400',
    }
    return map[level || ''] || 'text-text-secondary'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entities</h1>
          <p className="text-sm text-text-secondary mt-1">Manage entities and query full profiles</p>
        </div>
        <Button onClick={() => setBatchOpen(true)}>
          <Upload size={16} /> Batch Import
        </Button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-lg bg-bg-card border border-border text-sm"
        >
          {message}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Entity */}
        <Card delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-primary-light" />
            <h3 className="font-semibold">New Entity</h3>
          </div>
          <div className="space-y-4">
            <Input label="Name" placeholder="John Doe" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" placeholder="user@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" placeholder="555-000-0199" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Button onClick={handleCreate} loading={loading}>
              <UserPlus size={16} /> Create Entity
            </Button>
          </div>
        </Card>

        {/* Lookup Entity */}
        <Card delay={0.2}>
          <div className="flex items-center gap-2 mb-4">
            <Search size={18} className="text-primary-light" />
            <h3 className="font-semibold">Lookup Entity</h3>
          </div>
          <div className="space-y-4">
            <Input label="Entity ID" placeholder="Enter entity ID" type="number"
              value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            <Button onClick={handleSearch} loading={loading}>
              <Search size={16} /> Search
            </Button>
          </div>
        </Card>
      </div>

      {/* Entity Data Browser */}
      <Card delay={0.3}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary-light" />
            <h3 className="font-semibold">Entity Data</h3>
            <Badge>{total} records</Badge>
          </div>
          <button
            onClick={fetchList}
            title="Refresh"
            className="p-2 rounded-lg text-text-secondary hover:text-primary-light hover:bg-bg-card-hover transition-colors"
          >
            <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              placeholder="Search name / email / phone..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <select
            value={orderBy}
            onChange={(e) => { setOrderBy(e.target.value); setPage(1) }}
            className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer"
          >
            {ORDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Risk Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {RISK_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              onClick={() => { setRiskFilter(f.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                riskFilter === f.value
                  ? 'bg-primary/15 text-primary-light border-primary/40'
                  : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['ID', 'Name', 'Email', 'Phone', 'Risk Score', 'Level', 'Created At', 'Action'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-text-secondary py-3 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-secondary">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{loadingList ? 'Loading...' : 'No matching entities'}</p>
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDetail(row.id)}
                    className="border-b border-border/50 hover:bg-bg-card-hover/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-sm font-mono text-text-secondary">#{row.id}</td>
                    <td className="py-3 px-3 text-sm font-medium text-text-primary">{row.name}</td>
                    <td className="py-3 px-3 text-sm text-text-secondary">{row.email}</td>
                    <td className="py-3 px-3 text-sm text-text-secondary">{row.phone}</td>
                    <td className={`py-3 px-3 text-sm font-bold ${scoreColor(row.risk_level)}`}>
                      {row.score ?? '—'}
                    </td>
                    <td className="py-3 px-3">
                      {row.risk_level
                        ? <Badge variant={riskBadge(row.risk_level)}>{row.risk_level}</Badge>
                        : <Badge variant={riskBadge()}>Unscored</Badge>}
                    </td>
                    <td className="py-3 px-3 text-xs text-text-secondary">
                      {(row.create_time || '').slice(0, 19).replace('T', ' ') || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(row.id) }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-light bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <FileText size={12} /> Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Page size</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="px-2 py-1 bg-bg-dark border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>items · Total {total}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-text-secondary">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Entity Detail Modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="📋 Entity Full Profile">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'ID', value: `#${detail.entity.id}` },
                { label: 'Name', value: detail.entity.name },
                { label: 'Email', value: detail.entity.email },
                { label: 'Phone', value: detail.entity.phone },
              ].map((item) => (
                <div key={item.label} className="bg-bg-dark rounded-lg p-3">
                  <p className="text-xs text-text-secondary">{item.label}</p>
                  <p className="text-sm font-medium mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            {detail.risk_score && (
              <div className="bg-bg-dark rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary">Risk Score</p>
                  <p className="text-3xl font-bold mt-1">{detail.risk_score.score}</p>
                </div>
                <Badge variant={riskBadge(detail.risk_score.risk_level)}>
                  {detail.risk_score.risk_level}
                </Badge>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-text-secondary" />
                <h4 className="text-sm font-semibold">Event Records ({detail.event_list?.length || 0})</h4>
              </div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {detail.event_list?.map((ev: any) => (
                  <div key={ev.id} className="bg-bg-dark rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm">{ev.type}</span>
                    <span className="text-xs text-text-secondary">
                      {ev.timestamp?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                )) || <p className="text-xs text-text-secondary">No events</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-text-secondary" />
                <h4 className="text-sm font-semibold">Rule Hits ({groupedHits.length})</h4>
              </div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {groupedHits.map((hit: any) => (
                  <div key={hit.rule_id} className="bg-bg-dark rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-mono">{hit.rule_id}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary">
                        {hit.timestamp?.slice(0, 19).replace('T', ' ')}
                      </span>
                      <span className="text-sm font-bold text-red-400">+{hit.score}</span>
                    </div>
                  </div>
                ))}
                {groupedHits.length === 0 && (
                  <p className="text-xs text-text-secondary">No hits</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Import Modal */}
      <BatchImportModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onImported={fetchList}
      />
    </div>
  )
}