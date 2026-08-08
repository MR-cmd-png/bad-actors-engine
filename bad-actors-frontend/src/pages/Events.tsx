import { useState, useEffect } from 'react'
import { createEvent, listEvents } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { Zap, ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

const EVENT_TYPES = [
  'Property Damage',
  'Tort Involving Network and Data Property',
  'Tort Involving Creditors\' Rights and Interest-Based Property',
  'Overdue and Unpaid',
  'Misrepresentation and False Disclosure',
  'Breach of Trust and Breach of Contract',
]

export default function Events() {
  const [form, setForm] = useState({ entity_id: '', type: '', metadata: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [events, setEvents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [searchKeyword, setSearchKeyword] = useState('')

  const fetchEvents = async () => {
    try {
      const res: any = await listEvents({ page, page_size: pageSize, keyword: searchKeyword || undefined })
      setEvents(res.data || [])
      setTotal(res.total || 0)
    } catch (e) {
      console.error('Failed to fetch events', e)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [page])

  const handleCreate = async () => {
    if (!form.entity_id || !form.type) {
      setMessage('Please enter entity ID and select an event type')
      return
    }
    setLoading(true)
    try {
      let meta = {}
      try { meta = form.metadata ? JSON.parse(form.metadata) : {} } catch { meta = {} }
      await createEvent({
        entity_id: Number(form.entity_id),
        type: form.type,
        metadata_json: meta,
      })
      setMessage('✅ Event created successfully!')
      setForm({ entity_id: '', type: '', metadata: '' })
      setPage(1)
      fetchEvents()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchEvents()
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  const typeColorMap: Record<string, string> = {
    'Property Damage': 'bg-red-400',
    'Tort Involving Network and Data Property': 'bg-orange-400',
    'Tort Involving Creditors\' Rights and Interest-Based Property': 'bg-amber-400',
    'Overdue and Unpaid': 'bg-yellow-400',
    'Misrepresentation and False Disclosure': 'bg-lime-400',
    'Breach of Trust and Breach of Contract': 'bg-green-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-text-secondary mt-1">Record entity behavior events</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-amber-400" />
            <h3 className="font-semibold">New Behavior Event</h3>
          </div>
          <div className="space-y-4">
            <Input
              label="Entity ID"
              placeholder="Associated entity ID"
              type="number"
              value={form.entity_id}
              onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Event Type</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      form.type === t
                        ? 'bg-primary/15 text-primary-light border-primary/40'
                        : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Metadata (JSON, optional)</label>
              <textarea
                placeholder='{"amount": 500, "location": "Beijing"}'
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all h-24 resize-none"
              />
            </div>

            <Button onClick={handleCreate} loading={loading}>
              <Plus size={16} /> Submit Event
            </Button>
          </div>
        </Card>

        <Card delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">📋 Event History</h3>
              <span className="text-xs text-text-secondary bg-bg-dark px-2 py-0.5 rounded-full">
                {total} records
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search events..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-1.5 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-primary w-40"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary/80 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-auto">
            {events.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Zap size={48} className="mx-auto mb-3 opacity-30" />
                <p>No event records</p>
                <p className="text-xs mt-1">Create events to see them here</p>
              </div>
            ) : (
              events.map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-bg-dark rounded-lg p-3 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${typeColorMap[ev.type] || 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">{ev.type}</span>
                    </div>
                    <span className="text-xs font-mono text-text-secondary">#{ev.id}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                    <span>Entity ID: {ev.entity_id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {ev.timestamp?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  {ev.metadata_json && Object.keys(ev.metadata_json).length > 0 && (
                    <div className="mt-1.5 text-xs text-text-secondary bg-bg-card rounded px-2 py-1 font-mono">
                      {JSON.stringify(ev.metadata_json)}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-xs text-text-secondary">
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-border text-text-secondary disabled:opacity-30 hover:border-primary/30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-text-secondary px-2">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-border text-text-secondary disabled:opacity-30 hover:border-primary/30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
