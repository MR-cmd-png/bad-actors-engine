import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Inbox } from 'lucide-react'
import Card from './Card'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import { useAuth } from '../api/auth'
import { listProperties } from '../api'

// 字段只支持五类，守住“最小可用”：文本 / 数字(FK) / 下拉枚举 / JSON(textarea) / 多行文本
export interface CrudField {
  key: string
  label: string
  type?: 'text' | 'number' | 'select' | 'json' | 'textarea'
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface CrudColumn {
  key: string
  label: string
  render?: (row: any) => React.ReactNode
}

interface CrudPageProps {
  title: string
  description?: string
  fetchList: (params: Record<string, any>) => Promise<any>
  createItem: (data: Record<string, any>) => Promise<any>
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

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [fetchList, filterByProperty])

  useEffect(() => {
    load(1, '')
  }, [load])

  useEffect(() => {
    if (filterByProperty) {
      listProperties({ page: 1, page_size: 100 })
        .then((res: any) => setProperties(res.data || []))
        .catch(() => setProperties([]))
    }
  }, [filterByProperty])

  const openCreate = () => {
    const init: Record<string, string> = {}
    fields.forEach((f) => { init[f.key] = '' })
    setForm(init)
    setFormError('')
    setModalOpen(true)
  }

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const payload: Record<string, any> = {}
    for (const f of fields) {
      const raw = (form[f.key] ?? '').trim()
      if (!raw) {
        if (f.required) {
          setFormError(`请填写「${f.label}」`)
          return
        }
        continue // 可空字段留空即不上送
      }
      if (f.type === 'number') {
        const n = Number(raw)
        if (Number.isNaN(n)) {
          setFormError(`「${f.label}」必须是数字`)
          return
        }
        payload[f.key] = n
      } else if (f.type === 'json') {
        try {
          payload[f.key] = JSON.parse(raw)
        } catch {
          setFormError(`「${f.label}」不是合法 JSON`)
          return
        }
      } else {
        payload[f.key] = raw
      }
    }
    setSubmitting(true)
    setFormError('')
    try {
      await createItem(payload)
      setModalOpen(false)
      load(1, propertyId)
    } catch (e: any) {
      setFormError(e.message || '提交失败')
    } finally {
      setSubmitting(false)
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
              新建
            </Button>
          )}
        </div>
      </div>

      {/* Property filter */}
      {filterByProperty && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary shrink-0">按物业过滤：</label>
          <select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
              load(1, e.target.value)
            }}
            className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">全部物业</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <Card hover={false} delay={0.1}>
        {loading ? (
          <div className="text-center py-12 text-text-secondary">加载中...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Inbox size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无数据</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-text-secondary">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => load(page - 1, propertyId)} className="!px-3 !py-1.5">
              上一页
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => load(page + 1, propertyId)} className="!px-3 !py-1.5">
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`新建 · ${title}`}>
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
                    <option value="">请选择{f.required ? '' : '（可空）'}</option>
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
                    placeholder={f.type === 'json' ? '{"key": "value"}' : f.placeholder}
                    rows={f.type === 'json' ? 3 : 4}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary font-mono"
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
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} loading={submitting}>提交</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
