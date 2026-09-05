import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { companyApi } from '../api'
import { ORG_TYPES, t } from '../api/enums'

export default function Companies() {
  const options = ['Company', 'Trust', 'Partnership', 'Social Org', 'Other']
  return (
    <CrudPage
      title="Companies & Organizations"
      description="Legal entities linked to the property"
      fetchList={companyApi.list}
      createItem={companyApi.create}
      updateItem={companyApi.update}
      deleteItem={companyApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'name', label: 'Name', required: true },
        { key: 'org_type', label: 'Type', type: 'select', options, required: true },
        { key: 'registration_no', label: 'Reg. number' },
        { key: 'jurisdiction', label: 'Jurisdiction' },
        { key: 'role', label: 'Role' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'org_type', label: 'Type', render: (r) => <Badge>{t(r.org_type, ORG_TYPES)}</Badge> },
        { key: 'registration_no', label: 'Reg #' },
        { key: 'role', label: 'Role' },
        { key: 'create_time', label: 'Created' },
      ]}
    />
  )
}
