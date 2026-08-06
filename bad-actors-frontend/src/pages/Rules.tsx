import { useEffect, useState } from 'react'
import { createRule, listActiveRules, toggleRule, updateRule, deleteRule } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { Shield, Plus, ToggleLeft, ToggleRight, Eye, Tag, Pencil, Check, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

const EVENT_TYPES = [
  'Property Damage',
  'Tort Involving Network and Data Property',
  'Tort Involving Creditors\' Rights and Interest-Based Property',
  'Overdue and Unpaid',
  'Misrepresentation and False Disclosure',
  'Breach of Trust and Breach of Contract',
]

const CONDITIONS = [
  {
    value: 'property tort',
    label: 'Property Tort',
    event_types: ['Property Damage', 'Tort Involving Network and Data Property', 'Tort Involving Creditors\' Rights and Interest-Based Property'],
  },
  {
    value: 'conduct in violation of the principle of good faith',
    label: 'Conduct in Violation of Good Faith',
    event_types: ['Overdue and Unpaid', 'Misrepresentation and False Disclosure', 'Breach of Trust and Breach of Contract'],
  },
  {
    value: 'email_domain in disposable_list',
    label: 'Email Domain in Disposable List',
    event_types: [],
  },
]

function getEventTypesForCondition(condition: string): string[] {
  const cond = CONDITIONS.find((c) => c.value === condition)
  return cond ? cond.event_types : EVENT_TYPES
}

export default function Rules() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState({ rule_id: '', condition: '', score: '', event_types: [] as string[] })
  const [message, setMessage] = useState('')
  const [detailRule, setDetailRule] = useState<any>(null)
  const [editRule, setEditRule] = useState<any>(null)
  const [editForm, setEditForm] = useState({ condition: '', score: '', event_types: [] as string[] })

  const toggleEventType = (list: string[], type: string): string[] => {
    return list.includes(type) ? list.filter((t) => t !== type) : [...list, type]
  }

  const handleConditionChange = (condition: string) => {
    const allowed = getEventTypesForCondition(condition)
    setForm((prev) => ({
      ...prev,
      condition,
      event_types: prev.event_types.filter((t) => allowed.includes(t)),
    }))
  }

  const handleEditConditionChange = (condition: string) => {
    const allowed = getEventTypesForCondition(condition)
    setEditForm((prev) => ({
      ...prev,
      condition,
      event_types: prev.event_types.filter((t) => allowed.includes(t)),
    }))
  }

  const fetchRules = async () => {
    try {
      const res: any = await listActiveRules()
      setRules(res.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { fetchRules() }, [])

  const handleCreate = async () => {
    if (!form.rule_id || !form.condition || !form.score) {
      setMessage('Please fill in all fields')
      return
    }
    const scoreNum = Number(form.score)
    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 100) {
      setMessage('❌ Hit score must be an integer between 1 and 100')
      return
    }
    setLoading(true)
    try {
      await createRule({
        rule_id: form.rule_id,
        definition: {
          condition: form.condition,
          score: scoreNum,
          event_types: form.event_types,
        },
        active: true,
      })
      setMessage('✅ Rule created successfully!')
      setForm({ rule_id: '', condition: '', score: '', event_types: [] })
      fetchRules()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const openEdit = (rule: any) => {
    setEditRule(rule)
    setEditForm({
      condition: rule.definition?.condition || '',
      score: String(rule.definition?.score ?? ''),
      event_types: [...(rule.definition?.event_types || [])],
    })
  }

  const handleUpdate = async () => {
    const scoreNum = Number(editForm.score)
    if (!editForm.condition || !Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 100) {
      setMessage('❌ Please enter match condition, score must be integer 1-100')
      return
    }
    try {
      await updateRule(editRule.rule_id, {
        condition: editForm.condition,
        score: scoreNum,
        event_types: editForm.event_types,
      })
      setMessage('✅ Rule updated successfully!')
      setEditRule(null)
      fetchRules()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleToggle = async (rule: any) => {
    setTogglingId(rule.rule_id)
    try {
      await toggleRule(rule.rule_id, !rule.active)
      setMessage(rule.active ? `⏸ Rule ${rule.rule_id} deactivated` : `▶️ Rule ${rule.rule_id} activated`)
      fetchRules()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setTogglingId(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDelete = async (rule: any) => {
    if (!confirm(`Delete rule "${rule.rule_id}"? This action cannot be undone.`)) return
    try {
      await deleteRule(rule.rule_id)
      setMessage('✅ Rule deleted successfully!')
      fetchRules()
    } catch (e: any) {
      setMessage('❌ ' + e.message)
    } finally {
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const activeCount = rules.filter((r) => r.active).length

  const currentEventTypes = getEventTypesForCondition(form.condition)
  const editEventTypes = getEventTypesForCondition(editForm.condition)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rules</h1>
        <p className="text-sm text-text-secondary mt-1">Configure risk scoring rules</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-lg bg-bg-card border border-border text-sm">
          {message}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create rule */}
        <Card delay={0.1} className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={18} className="text-primary-light" />
            <h3 className="font-semibold">New Rule</h3>
          </div>
          <div className="space-y-4">
            <Input label="Rule ID" placeholder="An integer of 1 or above"
              value={form.rule_id}
              onChange={(e) => setForm({ ...form, rule_id: e.target.value })} />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Match Condition</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => {
                  const selected = form.condition === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleConditionChange(c.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        selected
                          ? 'bg-primary/15 text-primary-light border-primary/40'
                          : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
                      }`}
                    >
                      {selected && <Check size={14} />}
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {currentEventTypes.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">Associated Event Types</label>
                <div className="flex flex-wrap gap-2">
                  {currentEventTypes.map((t) => {
                    const selected = form.event_types.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, event_types: toggleEventType(form.event_types, t) })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                          selected
                            ? 'bg-primary/15 text-primary-light border-primary/40'
                            : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
                        }`}
                      >
                        {selected && <Check size={14} />}
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <Input label="Hit Score" placeholder="An integer between 1 and 100" type="number"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })} />
            <Button onClick={handleCreate} loading={loading} className="w-full">
              <Shield size={16} /> Add Rule
            </Button>
          </div>
        </Card>

        {/* Rule List */}
        <Card delay={0.2} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">🛡️ Rule List</h3>
            <Badge>{activeCount} active</Badge>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-auto">
            {rules.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p>No rules</p>
              </div>
            ) : (
              rules.map((rule: any, i: number) => (
                <motion.div
                  key={rule.rule_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-bg-dark rounded-xl p-4 border transition-all ${
                    rule.active ? 'border-border hover:border-primary/30' : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        rule.active ? 'bg-primary/10' : 'bg-bg-card-hover'
                      }`}>
                        <Shield size={18} className={rule.active ? 'text-primary-light' : 'text-text-secondary'} />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-text-primary">
                          {rule.rule_id}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Condition: {rule.definition?.condition}
                        </p>
                        {(rule.definition?.event_types || []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {rule.definition.event_types.slice(0, 2).map((t: string) => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary-light text-[10px] font-medium">
                                {t}
                              </span>
                            ))}
                            {rule.definition.event_types.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-bg-card-hover text-text-secondary text-[10px]">
                                +{rule.definition.event_types.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-amber-400">
                        +{rule.definition?.score}
                      </span>

                      <button
                        onClick={() => setDetailRule(rule)}
                        title="View all associated event types"
                        className="p-1 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 text-text-secondary hover:text-primary-light hover:bg-primary/10"
                      >
                        <Eye size={24} />
                      </button>

                      <button
                        onClick={() => openEdit(rule)}
                        title="Edit rule"
                        className="p-1 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 text-text-secondary hover:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Pencil size={20} />
                      </button>

                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={togglingId === rule.rule_id}
                        title={rule.active ? 'Click to deactivate' : 'Click to activate'}
                        className={`p-1 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 ${
                          rule.active
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-text-secondary hover:bg-bg-card-hover'
                        }`}
                      >
                        {rule.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>

                      <button
                        onClick={() => handleDelete(rule)}
                        title="Delete rule"
                        className="p-1 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 text-text-secondary hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <Badge variant={rule.active ? 'low' : 'default'}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Rule Detail Modal */}
      <Modal
        open={!!detailRule}
        onClose={() => setDetailRule(null)}
        title={`Rule Detail · ${detailRule?.rule_id || ''}`}
      >
        {detailRule && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-dark rounded-lg p-3">
                <p className="text-xs text-text-secondary">Match Condition</p>
                <p className="text-sm font-mono mt-1 break-all">{detailRule.definition?.condition}</p>
              </div>
              <div className="bg-bg-dark rounded-lg p-3">
                <p className="text-xs text-text-secondary">Hit Score</p>
                <p className="text-sm font-bold text-amber-400 mt-1">+{detailRule.definition?.score}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-primary-light" />
                <h4 className="text-sm font-semibold">
                  Associated Event Types ({(detailRule.definition?.event_types || []).length})
                </h4>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {(detailRule.definition?.event_types || []).length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-6">
                    No associated event types (matched by built-in conditions)
                  </p>
                ) : (
                  detailRule.definition.event_types.map((t: string, i: number) => (
                    <div key={t} className="flex items-center gap-3 bg-bg-dark rounded-lg px-3 py-2.5 border border-border">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary-light text-xs flex items-center justify-center font-mono">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{t}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Rule Modal */}
      <Modal
        open={!!editRule}
        onClose={() => setEditRule(null)}
        title={`Edit Rule · ${editRule?.rule_id || ''}`}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Match Condition</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const selected = editForm.condition === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleEditConditionChange(c.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      selected
                        ? 'bg-primary/15 text-primary-light border-primary/40'
                        : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
                    }`}
                  >
                    {selected && <Check size={14} />}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {editEventTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Associated Event Types</label>
              <div className="flex flex-wrap gap-2">
                {editEventTypes.map((t) => {
                  const selected = editForm.event_types.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, event_types: toggleEventType(editForm.event_types, t) })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        selected
                          ? 'bg-primary/15 text-primary-light border-primary/40'
                          : 'bg-bg-dark text-text-secondary border-border hover:border-primary/30'
                      }`}
                    >
                      {selected && <Check size={14} />}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Input label="Hit Score" placeholder="An integer between 1 and 100" type="number"
            value={editForm.score}
            onChange={(e) => setEditForm({ ...editForm, score: e.target.value })} />
          <Button onClick={handleUpdate} className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>
    </div>
  )
}
