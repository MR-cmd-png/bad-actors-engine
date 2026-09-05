import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { investigationApi } from '../api'
import { INVESTIGATION_STATUS, t } from '../api/enums'

export default function Investigations() {
  const statusOptions = ['进行中', '暂停', '结案']
  return (
    <CrudPage
      title="Investigations"
      description="Top-level investigation case containers"
      fetchList={investigationApi.list}
      createItem={investigationApi.create}
      updateItem={investigationApi.update}
      deleteItem={investigationApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'title', label: 'Title', required: true },
        { key: 'case_no', label: 'Case number' },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
        { key: 'summary', label: 'Summary', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
        { key: 'case_no', label: 'Case #' },
        { key: 'status', label: 'Status', render: (r) => <Badge>{t(r.status, INVESTIGATION_STATUS)}</Badge> },
        { key: 'started_at', label: 'Started' },
      ]}
    />
  )
}
