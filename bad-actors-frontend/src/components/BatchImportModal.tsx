import { useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import Badge from './Badge'
import { batchCreateEntities } from '../api'
import { Upload, Download, FileText, Inbox } from 'lucide-react'

interface ParsedRow {
  line: number
  name: string
  email: string
  phone: string
  valid: boolean
  reason?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onImported?: () => void
}

const EMAIL_RE = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/
const PHONE_RE = /^\+?\d{7,15}$/

function parseText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const splitLine = (line: string) =>
    line.includes('\t')
      ? line.split('\t').map((s) => s.trim())
      : line.split(/[,，]/).map((s) => s.trim().replace(/^"(.*)"$/, '$1'))

  let start = 0
  let idx = { name: 0, email: 1, phone: 2 }

  const firstParts = splitLine(lines[0])
  const isHeader = firstParts.some((p) =>
    /name|email|phone|mobile|tel/i.test(p)
  )
  if (isHeader) {
    start = 1
    const find = (re: RegExp) => firstParts.findIndex((p) => re.test(p))
    const n = find(/name/i)
    const e = find(/email|mail/i)
    const p = find(/phone|mobile|tel/i)
    if (n >= 0 && e >= 0 && p >= 0) idx = { name: n, email: e, phone: p }
  }

  const rows: ParsedRow[] = []
  const seen = new Set<string>()

  for (let i = start; i < lines.length; i++) {
    const parts = splitLine(lines[i])
    const name = (parts[idx.name] || '').trim()
    const email = (parts[idx.email] || '').trim()
    const phone = (parts[idx.phone] || '').replace(/[\s-]/g, '')

    let reason = ''
    if (!name || !email || !phone) reason = 'Missing fields'
    else if (!EMAIL_RE.test(email)) reason = 'Invalid email format'
    else if (!PHONE_RE.test(phone)) reason = 'Invalid phone format'
    else {
      const key = `${email}|${phone}`
      if (seen.has(key)) reason = 'Duplicate in file'
      else seen.add(key)
    }
    rows.push({ line: i + 1, name, email, phone, valid: !reason, reason: reason || undefined })
  }
  return rows
}

export default function BatchImportModal({ open, onClose, onImported }: Props) {
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => parseText(rawText), [rawText])
  const validRows = rows.filter((r) => r.valid)
  const invalidRows = rows.filter((r) => !r.valid)

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer()
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      text = new TextDecoder('gbk').decode(buf)
    }
    setFileName(file.name)
    setRawText(text)
    setResult(null)
  }

  const downloadTemplate = () => {
    const content = '\uFEFFName,Email,Phone\nJohn,john@example.com,555-000-0199\nJane,jane@example.com,555-000-0198\n'
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'entity_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!validRows.length) return
    setImporting(true)
    try {
      const res: any = await batchCreateEntities(
        validRows.map(({ name, email, phone }) => ({ name, email, phone }))
      )
      setResult(res.data)
      if (onImported) onImported()
    } catch (e: any) {
      setResult({ success: 0, skipped: 0, details: [{ row: '-', reason: e.message }] })
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setRawText('')
    setFileName('')
    setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="📥 Batch Import Entities">
      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-dark rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{result.success}</p>
              <p className="text-xs text-text-secondary mt-1">Imported</p>
            </div>
            <div className="bg-bg-dark rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{result.skipped}</p>
              <p className="text-xs text-text-secondary mt-1">Skipped (duplicates)</p>
            </div>
          </div>

          {result.details && result.details.length > 0 && (
            <div className="bg-bg-dark rounded-lg p-3 max-h-40 overflow-auto space-y-1">
              {result.details.map((d: any, i: number) => (
                <p key={i} className="text-xs text-text-secondary">
                  Row {d.row} · <span className="text-amber-400">{d.reason}</span>
                </p>
              ))}
            </div>
          )}

          <Button onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
            <Button onClick={() => fileRef.current && fileRef.current.click()}>
              <Upload size={16} /> Select CSV File
            </Button>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-bg-card-hover text-text-primary hover:opacity-80 transition-opacity"
            >
              <Download size={16} /> Download Template
            </button>
            {fileName && (
              <span className="text-xs text-text-secondary inline-flex items-center gap-1">
                <FileText size={12} /> {fileName}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1.5">
              Or paste data directly (one per line: name, email, phone; Excel copy-paste supported)
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'John, john@example.com, 555-000-0199\nJane, jane@example.com, 555-000-0198'}
              className="w-full h-28 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {rows.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Badge>{rows.length} rows total</Badge>
              <Badge variant={'low' as any}>Valid {validRows.length}</Badge>
              {invalidRows.length > 0 && (
                <Badge variant={'high' as any}>Invalid {invalidRows.length}</Badge>
              )}
            </div>
          )}

          {rows.length > 0 ? (
            <div className="max-h-52 overflow-auto border border-border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Row#', 'Name', 'Email', 'Phone', 'Status'].map((h) => (
                      <th key={h} className="text-left text-xs text-text-secondary font-medium py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r) => (
                    <tr key={r.line} className="border-t border-border/50">
                      <td className="py-1.5 px-3 text-xs text-text-secondary">{r.line}</td>
                      <td className="py-1.5 px-3 text-xs">{r.name || '—'}</td>
                      <td className="py-1.5 px-3 text-xs text-text-secondary">{r.email || '—'}</td>
                      <td className="py-1.5 px-3 text-xs text-text-secondary">{r.phone || '—'}</td>
                      <td className="py-1.5 px-3">
                        {r.valid
                          ? <Badge variant={'low' as any}>✓</Badge>
                          : <Badge variant={'high' as any}>{r.reason}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className="text-xs text-text-secondary text-center py-2">
                  only showing first 100 of {rows.length} rows
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-text-secondary">
              <Inbox size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Preview will appear here after uploading file or pasting data</p>
            </div>
          )}

          <Button onClick={handleImport} loading={importing}>
            <Upload size={16} /> Import {validRows.length} valid records
          </Button>
        </div>
      )}
    </Modal>
  )
}