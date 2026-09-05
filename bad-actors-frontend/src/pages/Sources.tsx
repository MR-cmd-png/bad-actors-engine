import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { sourceApi } from '../api'
import { SOURCE_TYPES, CONFIDENCE, t } from '../api/enums'

export default function Sources() {
  const stOptions = ['Business Registry', 'Court Document', 'News', 'Regulatory Notice', 'Contract', 'Interview', 'Site Visit', 'Whistleblower', 'Other']
  const relOptions = ['High', 'Medium', 'Low']
  return (
    <CrudPage
      title="Sources"
      description="Where the intelligence came from"
      fetchList={sourceApi.list}
      createItem={sourceApi.create}
      updateItem={sourceApi.update}
      deleteItem={sourceApi.remove}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'source_type', label: 'Type', type: 'select', options: stOptions, required: true },
        { key: 'reference', label: 'Reference' },
        { key: 'reliability', label: 'Reliability', type: 'select', options: relOptions, required: true },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'source_type', label: 'Type', render: (r) => <Badge>{t(r.source_type, SOURCE_TYPES)}</Badge> },
        { key: 'reliability', label: 'Reliability', render: (r) => <Badge>{t(r.reliability, CONFIDENCE)}</Badge> },
        { key: 'reference', label: 'Reference' },
        { key: 'obtained_at', label: 'Obtained' },
      ]}
    />
  )
}
