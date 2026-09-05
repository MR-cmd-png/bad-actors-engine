import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus, RefreshCw, Inbox, Edit2, Trash2, X } from 'lucide-react'
import Card from './Card'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import { useAuth } from '../api/auth'
import { listProperties } from '../api'

// Field types: text / number (FK) / select / textarea / json (only for PilotProperty.relevant_dates)
export interface CrudField {
  key: string
  label: string
  type?: 'text' | 'number' | 'select' | 'json' | 'textarea'
  options?: string[]          // select options — display values, also sent to API (DB stores same strings)
  required?: boolean
  placeholder?: string
}

export interface CrudColumn {
  key: string
  label: string
  render?: (row: any) => ReactNode
}

interface CrudPageProps {
  title: string
  description?: string
  fetchList: (params: Record<string, any>) => Promise<any>
  createItem: (data: Record<string, any>) => Promise<any>
  updateItem?: (id: number, data: Record<string, any>) => Promise<any>
  deleteItem?: (id: number) => Promise<any>
  fields: CrudField[]
  columns: CrudColumn[]
  filterByProperty?: boolean
}

const PAGE_SIZE = 20
const fmtTime = (v: any) => (typeof v === 'string' ? v.slice(0, 19).replace('T', ' ') : (v ?? '—'))

export default function CrudPage({
  title,
  description,
  fetchList,
  createItem,
  updateItem,
  deleteItem,
  fields,
  columns,
  filterByProperty = false,
}: CrudPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [propertyId, setPropertyId] = useState('')
  const [properties, setProperties] = useState<any[]>([])

  // Create/edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (p: number, pid: string) => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, any> = { page: p, page_size: PAGE_SIZE }
      if (filterByProperty && pid) params.property_id = Number(pid)
      const res: any = await fetchList(params)
      setRows(res.data || [])
      setTotal(res.total || 0)
      setPage(p)
    } catch (e: any) {
      setError(e.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [fetchList, filterByProperty])

  useEffect(() => { load(1, '') }, [load])

  useEffect(() => {
    if (filterByProperty) {
      listProperties({ page: 1, page_size: 100 })
        .then((res: any) => setProperties(res.data || []))
        .catch(() => setProperties([]))
    }
  }, [filterByProperty])

  const openCreate = () => {
    const init: Record<string, any> = {}
    fields.forEach((f) => {
      if (f.type === 'number') {
        init[f.key] = f.required ? '' : ''
      } else {
        init[f.key] = ''
      }
    })
    setForm(init)
    setFormError('')
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (row: any) => {
    const init: Record<string, any> = {}
    fields.forEach((f) => {
      const v = row[f.key]
      if (v == null) {
        init[f.key] = ''
      } else if (f.type === 'json') {
        init[f.key] = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
      } else {
        init[f.key] = v
      }
    })
    setForm(init)
    setFormError('')
    setEditingId(row.id)
    setModalOpen(true)
  }

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const payload: Record<string, any> = {}
    for (const f of fields) {
      const raw = (form[f.key] ?? '').toString().trim()
      if (!raw) {
        if (f.required) {
          setFormError(`"${f.label}" is required`)
          return
        }
        continue
      }
      if (f.type === 'number') {
        const n = Number(raw)
        if (Number.isNaN(n)) {
          setFormError(`"${f.label}" must be a number`)
          return
        }
        payload[f.key] = n
      } else if (f.type === 'json') {
        try {
          payload[f.key] = JSON.parse(raw)
        } catch {
          setFormError(`"${f.label}" must be valid JSON`)
          return
        }
      } else {
        payload[f.key] = raw
      }
    }
    setSubmitting(true)
    setFormError('')
    try {
      if (editingId != null && updateItem) {
        await updateItem(editingId, payload)
      } else {
        await createItem(payload)
      }
      setModalOpen(false)
      load(1, propertyId)
    } catch (e: any) {
      setFormError(e.response?.data?.detail || e.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null || !deleteItem) return
    setDeleting(true)
    try {
      await deleteItem(deleteId)
      setDeleteId(null)
      load(page, propertyId)
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => load(page, propertyId)} className="!px-3">
            <RefreshCw size={15} />
          </Button>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus size={16} />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Property filter */}
      {filterByProperty && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary shrink-0">Filter by property:</label>
          <select
            value={propertyId}
            onChange={(e) => { setPropertyId(e.target.value); load(1, e.target.value) }}
            className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <Card hover={false} delay={0.1}>
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Inbox size={48} className="mx-auto mb-3 opacity-30" />
            <p>No records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((c) => (
                    <th key={c.key} className="text-left text-xs font-medium text-text-secondary py-3 px-4 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  {isAdmin && (updateItem || deleteItem) && (
                    <th className="text-right text-xs font-medium text-text-secondary py-3 px-4 whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-bg-card-hover/50 transition-colors">
                    {columns.map((c) => (
                      <td key={c.key} className="py-3 px-4 text-sm text-text-secondary align-top">
                        {c.render ? c.render(row) : fmtTime(row[c.key])}
                      </td>
                    ))}
                    {isAdmin && (updateItem || deleteItem) && (
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {updateItem && (
                            <button
                              onClick={() => openEdit(row)}
                              className="p-1.5 rounded hover:bg-bg-dark text-text-secondary hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {deleteItem && (
                            <button
                              onClick={() => setDeleteId(row.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-text-secondary">
          <span>Total {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => load(page - 1, propertyId)} className="!px-3 !py-1.5">
              Prev
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => load(page + 1, propertyId)} className="!px-3 !py-1.5">
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId != null ? `Edit · ${title}` : `New · ${title}`}
      >
        <div className="space-y-4">
          {fields.map((f) => {
            const value = form[f.key] ?? ''
            if (f.type === 'select') {
              return (
                <div key={f.key} className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-secondary">
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="">{f.required ? 'Select' : '(Optional)'}</option>
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )
            }
            if (f.type === 'json' || f.type === 'textarea') {
              return (
                <div key={f.key} className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-secondary">
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.type === 'json' ? '{"key": "value", "year": "2024-01-01"}' : f.placeholder}
                    rows={f.type === 'json' ? 3 : 4}
                    className={`w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary ${f.type === 'json' ? 'font-mono' : ''}`}
                  />
                </div>
              )
            }
            return (
              <Input
                key={f.key}
                label={`${f.label}${f.required ? ' *' : ''}`}
                type={f.type === 'number' ? 'number' : 'text'}
                value={value}
                placeholder={f.placeholder}
                onChange={(e: any) => setField(f.key, e.target.value)}
              />
            )
          })}
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingId != null ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteId != null && (
        <Modal open={true} onClose={() => setDeleteId(null)} title="Confirm Delete">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDeleteId(null)}>
                <X size={14} /> Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
