import { useState } from 'react'
import { createEvent } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { Zap } from 'lucide-react'
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
  const [history, setHistory] = useState<any[]>([])

  const handleCreate = async () => {
    if (!form.entity_id || !form.type) {
      setMessage('Please enter entity ID and select an event type')
      return
    }
    setLoading(true)
    try {
      let meta = {}
      try { meta = form.metadata ? JSON.parse(form.metadata) : {} } catch { meta = {} }
      const res: any = await createEvent({
        entity_id: Number(form.entity_id),
        type: form.type,
        metadata_json: meta,
      })
      setMessage('✅ Event created successfully!')
      setHistory([res.data, ...history])
      setForm({ entity_id: '', type: '', metadata: '' })
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
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
            <Input label="Entity ID" placeholder="Associated entity ID" type="number"
              value={form.entity_id}
              onChange={(e) => setForm({ ...form, entity_id: e.target.value })} />

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
              <Zap size={16} /> Submit Event
            </Button>
          </div>
        </Card>

        {/* Recent Events */}
        <Card delay={0.2}>
          <h3 className="font-semibold mb-4">📝 Events Created This Session</h3>
          <div className="space-y-3 max-h-[500px] overflow-auto">
            {history.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Zap size={48} className="mx-auto mb-3 opacity-30" />
                <p>No event records</p>
              </div>
            ) : (
              history.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-bg-dark rounded-lg p-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm font-medium">{ev.type}</span>
                    </div>
                    <span className="text-xs font-mono text-text-secondary">#{ev.id}</span>
                  </div>
                  <div className="mt-2 text-xs text-text-secondary">
                    Entity ID: {ev.entity_id} • {ev.timestamp?.slice(0, 19).replace('T', ' ')}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}