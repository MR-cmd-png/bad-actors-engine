import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Inbox, Edit2, Trash2, X, FileJson } from 'lucide-react'
import { cmsApi } from '../api'

/**
 * CMS 管理页（/admin/cms）：
 * 让非开发同事通过浏览器直接编辑 Landing / Dashboard 等页面的文案，
 * 彻底解决 Hostinger 文件编辑器与 Vite build hash / git 部署互斥的老问题。
 *
 * 表格行 = DB cms_pages 表的一页内容；Modal = 表单编辑器（带 JSON 校验）。
 * 写操作（PATCH/DELETE）后端已用 require_admin 保护，前端再加一层 UI guard。
 */
interface CmsRow {
  id: number
  page_key: string
  title: string | null
  subtitle: string | null
  content_json: Record<string, any>
  updated_by_id: number | null
  create_time: string
  update_time: string
}

export default function CmsEditor() {
  const [rows, setRows] = useState<CmsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create/edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [contentJsonText, setContentJsonText] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete confirm
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res: any = await cmsApi.list()
      setRows(res.data ?? [])
    } catch (e: any) {
      setError(e.message || 'Failed to load CMS pages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditingKey(null)
    setForm({ page_key: '', title: '', subtitle: '', content_json: {} })
    setContentJsonText('{}')
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: CmsRow) => {
    setEditingKey(row.page_key)
    setForm({ ...row })
    setContentJsonText(JSON.stringify(row.content_json ?? {}, null, 2))
    setFormError('')
    setModalOpen(true)
  }

  const submit = async () => {
    setFormError('')
    // 1) page_key 校验
    if (!form.page_key || !/^[a-z0-9_]+$/.test(form.page_key)) {
      setFormError('page_key must match [a-z0-9_]+ (e.g. landing_hero)'); return
    }
    // 2) content_json JSON 校验
    let parsed: Record<string, any> = {}
    try {
      parsed = JSON.parse(contentJsonText)
    } catch {
      setFormError('content_json must be valid JSON'); return
    }

    setSubmitting(true)
    try {
      const payload = {
        page_key: form.page_key,
        title: form.title || null,
        subtitle: form.subtitle || null,
        content_json: parsed,
      }
      if (editingKey) {
        // PATCH 走 page_key — 更新时 page_key 不可改
        await cmsApi.update(editingKey, {
          title: payload.title,
          subtitle: payload.subtitle,
          content_json: payload.content_json,
        })
      } else {
        await cmsApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (e: any) {
      setFormError(e.message || 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteKey) return
    setDeleting(true)
    try {
      await cmsApi.remove(deleteKey)
      setDeleteKey(null)
      await load()
    } catch {
      // 404 等直接忽略
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">CMS Content Manager</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Edit Landing / Dashboard copy without touching code. Changes take effect after page reload.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-bg-dark transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> New Page
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Inbox size={36} className="mx-auto mb-3 text-slate-300" />
            No CMS pages yet. Click "New Page" or restart backend with AUTO_SEED=1.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-dark">
              <tr className="text-left text-text-secondary text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Page Key</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Subtitle</th>
                <th className="px-4 py-3 font-medium">Content</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.page_key} className="hover:bg-bg-dark/50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-primary-light bg-primary/10 px-2 py-0.5 rounded text-xs font-mono">
                      {row.page_key}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-text-primary max-w-[220px] truncate">
                    {row.title || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[280px] truncate">
                    {row.subtitle || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                    {Object.keys(row.content_json ?? {}).length} key(s)
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {row.update_time?.slice(0, 19).replace('T', ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded hover:bg-bg-dark transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} className="text-text-secondary" />
                      </button>
                      <button
                        onClick={() => setDeleteKey(row.page_key)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-text-primary">
                {editingKey ? `Edit · ${editingKey}` : 'New CMS Page'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded hover:bg-bg-dark transition-colors"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              {/* page_key — 编辑态不可改 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Page Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.page_key}
                  onChange={e => setForm({ ...form, page_key: e.target.value })}
                  disabled={!!editingKey}
                  placeholder="e.g. landing_hero"
                  className={`w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 ${
                    editingKey ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'text-text-primary'
                  }`}
                />
                {editingKey && (
                  <p className="text-xs text-slate-400 mt-1">page_key is immutable — delete and recreate to change</p>
                )}
              </div>

              {/* title */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title ?? ''}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  placeholder="Section heading (optional)"
                />
              </div>

              {/* subtitle */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Subtitle / Description</label>
                <textarea
                  rows={2}
                  value={form.subtitle ?? ''}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  placeholder="Optional supporting copy"
                />
              </div>

              {/* content_json */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
                  <FileJson size={14} /> Content (JSON)
                </label>
                <textarea
                  rows={8}
                  value={contentJsonText}
                  onChange={e => setContentJsonText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  placeholder='{"key": "value", "items": [...]}'
                />
                <p className="text-xs text-slate-400 mt-1">Paste valid JSON — features list, stats numbers, etc.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-bg-dark/50">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (editingKey ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-text-primary mb-2">Confirm Delete</h3>
            <p className="text-sm text-text-secondary mb-5">
              Delete CMS page <code className="font-mono bg-bg-dark px-1.5 py-0.5 rounded text-xs">{deleteKey}</code>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteKey(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
