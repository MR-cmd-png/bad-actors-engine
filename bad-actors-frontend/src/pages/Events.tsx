import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { eventApi } from '../api'
import { EVENT_CATEGORIES, SEVERITY, SIGNAL_STATUS, t } from '../api/enums'

const sevVariant = (v: any) => v === '极高' || v === '高' ? 'high' : v === '中' ? 'medium' : v === '低' ? 'low' : 'default'

export default function Events() {
  const catOptions = ['指控', '合同纠纷', '监管处罚', '诉讼', '仲裁', '可疑交易', '投诉', '其他']
  const sevOptions = ['低', '中', '高']
  const statusOptions = ['进行中', '已确认', '已解决', '已关闭']
  return (
    <CrudPage
      title="Events"
      description="Incidents, allegations, disputes, suspicious activity"
      fetchList={eventApi.list}
      createItem={eventApi.create}
      updateItem={eventApi.update}
      deleteItem={eventApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'title', label: 'Title', required: true },
        { key: 'event_category', label: 'Category', type: 'select', options: catOptions, required: true },
        { key: 'severity', label: 'Severity', type: 'select', options: sevOptions, required: true },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
        { key: 'actor_id', label: 'Actor ID', type: 'number' },
        { key: 'company_id', label: 'Company ID', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
        { key: 'event_category', label: 'Category', render: (r) => <Badge>{t(r.event_category, EVENT_CATEGORIES)}</Badge> },
        { key: 'severity', label: 'Severity', render: (r) => <Badge variant={sevVariant(r.severity)}>{t(r.severity, SEVERITY)}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{t(r.status, SIGNAL_STATUS)}</Badge> },
        { key: 'occurred_at', label: 'Occurred' },
      ]}
    />
  )
}
