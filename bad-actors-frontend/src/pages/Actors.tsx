import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { actorApi } from '../api'
import { ACTOR_TYPES, t } from '../api/enums'

export default function Actors() {
  const actorOptions = ['自然人', '法定代表人', '负责人', '承包商', '租户', '供应商', '前员工', '其他']
  return (
    <CrudPage
      title="Actors"
      description="People or entities tied to the property"
      fetchList={actorApi.list}
      createItem={actorApi.create}
      updateItem={actorApi.update}
      deleteItem={actorApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'name', label: 'Name', required: true },
        { key: 'actor_type', label: 'Actor type', type: 'select', options: actorOptions, required: true },
        { key: 'role_in_property', label: 'Role at property' },
        { key: 'email', label: 'Email', type: 'text', placeholder: 'you@example.com' },
        { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555 123 4567' },
        { key: 'background_notes', label: 'Background notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'actor_type', label: 'Type', render: (r) => <Badge>{t(r.actor_type, ACTOR_TYPES)}</Badge> },
        { key: 'role_in_property', label: 'Role' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'create_time', label: 'Created' },
      ]}
    />
  )
}
