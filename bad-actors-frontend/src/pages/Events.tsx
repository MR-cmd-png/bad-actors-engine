import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listEvents, createEvent } from '../api'

// 事件管理：指控 / 纠纷 / 监管 / 诉讼 / 可疑交易（创建后自动上时间线）
export default function Events() {
  return (
    <CrudPage
      title="事件"
      description="指控 / 合同纠纷 / 监管处罚 / 诉讼 / 可疑交易等关键事件"
      fetchList={listEvents}
      createItem={createEvent}
      filterByProperty
      fields={[
        { key: 'property_id', label: '所属物业 ID', type: 'number', required: true },
        { key: 'title', label: '事件标题', required: true },
        { key: 'event_category', label: '事件类别', type: 'select', options: ['指控', '合同纠纷', '监管处罚', '诉讼', '仲裁', '可疑交易', '投诉', '其他'], required: true },
        { key: 'severity', label: '严重程度', type: 'select', options: ['低', '中', '高'] },
        { key: 'status', label: '状态', type: 'select', options: ['进行中', '已解决', '已了结'] },
        { key: 'actor_id', label: '关联行为人 ID（可空）', type: 'number' },
        { key: 'company_id', label: '关联公司 ID（可空）', type: 'number' },
        { key: 'occurred_at', label: '发生时间（可空，ISO 格式）', placeholder: '2025-06-30T10:00:00' },
        { key: 'description', label: '描述', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: '标题', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
        { key: 'event_category', label: '类别' },
        { key: 'severity', label: '严重度', render: (r) => <Badge variant={r.severity === '高' ? 'high' : r.severity === '中' ? 'medium' : 'low'}>{r.severity}</Badge> },
        { key: 'status', label: '状态' },
        { key: 'occurred_at', label: '发生时间' },
        { key: 'actor_id', label: '行为人' },
        { key: 'company_id', label: '公司' },
      ]}
    />
  )
}
