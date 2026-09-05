import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { relationshipApi } from '../api'
import { RELATION_TYPES, t } from '../api/enums'

export default function Relationships() {
  const relOptions = ['Controlling', 'Position', 'Related Party Transaction', 'Family', 'Nominee Holding', 'Guarantee', 'Litigation Counterparty', 'Other']
  const confOptions = ['High', 'Medium', 'Low']
  return (
    <CrudPage
      title="Relationships"
      description="Edges between actors, companies and properties"
      fetchList={relationshipApi.list}
      createItem={relationshipApi.create}
      updateItem={relationshipApi.update}
      deleteItem={relationshipApi.remove}
      fields={[
        { key: 'subject_type', label: 'Subject type', type: 'select', options: ['actor', 'company', 'property'], required: true },
        { key: 'subject_id', label: 'Subject ID', type: 'number', required: true },
        { key: 'object_type', label: 'Object type', type: 'select', options: ['actor', 'company', 'property'], required: true },
        { key: 'object_id', label: 'Object ID', type: 'number', required: true },
        { key: 'relation_type', label: 'Relation type', type: 'select', options: relOptions, required: true },
        { key: 'nature_description', label: 'Description', type: 'textarea' },
        { key: 'confidence', label: 'Confidence', type: 'select', options: confOptions, required: true },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'subject_type', label: 'Subject' },
        { key: 'subject_id', label: 'S.ID' },
        { key: 'relation_type', label: 'Relation', render: (r) => <Badge>{t(r.relation_type, RELATION_TYPES)}</Badge> },
        { key: 'object_type', label: 'Object' },
        { key: 'object_id', label: 'O.ID' },
        { key: 'confidence', label: 'Conf.', render: (r) => <Badge>{r.confidence}</Badge> },
      ]}
    />
  )
}
