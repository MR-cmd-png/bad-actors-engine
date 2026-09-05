import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { evidenceApi } from '../api'
import { EVIDENCE_TYPES, t } from '../api/enums'

export default function Evidence() {
  const etOptions = ['Document', 'Statement', 'Observation', 'Data', 'Screenshot', 'Other']
  const supOptions = ['event', 'signal', 'risk_assessment', 'actor', 'company']
  return (
    <CrudPage
      title="Evidence & Claims"
      description="Facts, documents, statements supporting assessments"
      fetchList={evidenceApi.list}
      createItem={evidenceApi.create}
      updateItem={evidenceApi.update}
      deleteItem={evidenceApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number' },
        { key: 'claim', label: 'Claim', required: true },
        { key: 'evidence_type', label: 'Type', type: 'select', options: etOptions, required: true },
        { key: 'content_or_ref', label: 'Content / reference', required: true, type: 'textarea' },
        { key: 'source_id', label: 'Source ID', type: 'number', required: true },
        { key: 'supports_type', label: 'Supports type', type: 'select', options: supOptions, required: true },
        { key: 'supports_id', label: 'Supports ID', type: 'number', required: true },
        { key: 'reliability_note', label: 'Reliability note', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'claim', label: 'Claim', render: (r) => <span className="font-medium text-text-primary truncate block max-w-[260px]">{r.claim}</span> },
        { key: 'evidence_type', label: 'Type', render: (r) => <Badge>{t(r.evidence_type, EVIDENCE_TYPES)}</Badge> },
        { key: 'supports_type', label: 'Supports' },
        { key: 'supports_id', label: 'S.ID' },
        { key: 'verified_at', label: 'Verified' },
      ]}
    />
  )
}
