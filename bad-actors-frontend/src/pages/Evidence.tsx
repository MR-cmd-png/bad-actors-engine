import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listEvidence, createEvidence } from '../api'

// 证据与主张管理：每条证据挂一个 Source，supports 指向被支撑的节点（创建后自动上时间线）
export default function Evidence() {
  return (
    <CrudPage
      title="证据与主张"
      description="支撑评估的事实 / 文件 / 陈述 / 观察（来源即底层支撑）"
      fetchList={listEvidence}
      createItem={createEvidence}
      filterByProperty
      fields={[
        { key: 'claim', label: '主张/事实描述', required: true },
        { key: 'evidence_type', label: '证据类型', type: 'select', options: ['文件', '陈述', '观察', '数据', '截图', '其他'], required: true },
        { key: 'source_id', label: '来源 ID', type: 'number', required: true },
        { key: 'supports_type', label: '支撑对象类型', type: 'select', options: ['event', 'signal', 'risk_assessment', 'actor', 'company'], required: true },
        { key: 'supports_id', label: '支撑对象 ID', type: 'number', required: true },
        { key: 'content_or_ref', label: '内容或存放指引', required: true },
        { key: 'property_id', label: '关联物业 ID（可空）', type: 'number' },
        { key: 'reliability_note', label: '可靠性说明' },
        { key: 'verified_at', label: '核实时间（可空，ISO 格式）', placeholder: '2026-03-01T14:00:00' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'claim', label: '主张', render: (r) => <span className="font-medium text-text-primary">{r.claim}</span> },
        { key: 'evidence_type', label: '类型', render: (r) => <Badge>{r.evidence_type}</Badge> },
        { key: 'source_id', label: '来源' },
        { key: 'supports', label: '支撑对象', render: (r) => `${r.supports_type}#${r.supports_id}` },
        { key: 'content_or_ref', label: '内容/存放' },
        { key: 'verified_at', label: '核实时间' },
      ]}
    />
  )
}
