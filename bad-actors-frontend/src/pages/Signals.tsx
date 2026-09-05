import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { signalApi } from '../api'
import { SIGNAL_TYPES, IMPORTANCE, SIGNAL_STATUS, t } from '../api/enums'

const impVariant = (v: any) => v === '高' ? 'high' : v === '中' ? 'medium' : 'low'

export default function Signals() {
  const stOptions = ['预警', '异常', '趋势', '关联红旗', '其他']
  const impOptions = ['低', '中', '高']
  const statusOptions = ['待核实', '已确认', '已排除']
  return (
    <CrudPage
      title="Signals"
      description="Early indicators and observations"
      fetchList={signalApi.list}
      createItem={signalApi.create}
      updateItem={signalApi.update}
      deleteItem={signalApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'indicator', label: 'Indicator', required: true },
        { key: 'signal_type', label: 'Type', type: 'select', options: stOptions, required: true },
        { key: 'importance', label: 'Importance', type: 'select', options: impOptions, required: true },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
        { key: 'event_id', label: 'Event ID', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'indicator', label: 'Indicator', render: (r) => <span className="font-medium text-text-primary">{r.indicator}</span> },
        { key: 'signal_type', label: 'Type', render: (r) => <Badge>{t(r.signal_type, SIGNAL_TYPES)}</Badge> },
        { key: 'importance', label: 'Imp.', render: (r) => <Badge variant={impVariant(r.importance)}>{t(r.importance, IMPORTANCE)}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{t(r.status, SIGNAL_STATUS)}</Badge> },
        { key: 'observed_at', label: 'Observed' },
      ]}
    />
  )
}
