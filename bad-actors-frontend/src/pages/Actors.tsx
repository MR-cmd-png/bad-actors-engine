import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listActors, createActor } from '../api'

// 行为人管理：配置驱动的通用 CRUD 页
export default function Actors() {
  return (
    <CrudPage
      title="行为人"
      description="与试点物业相关或被识别的人/实体"
      fetchList={listActors}
      createItem={createActor}
      filterByProperty
      fields={[
        { key: 'property_id', label: '所属物业 ID', type: 'number', required: true },
        { key: 'name', label: '姓名/名称', required: true },
        { key: 'actor_type', label: '行为人类型', type: 'select', options: ['自然人', '法定代表人', '负责人', '承包商', '租户', '供应商', '前员工', '其他'], required: true },
        { key: 'role_in_property', label: '与物业的角色' },
        { key: 'contact_info', label: '联系方式 (JSON)', type: 'json', placeholder: '{"phone": "138xxxx", "email": "a@b.com"}' },
        { key: 'background_notes', label: '背景备注', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: '姓名', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'actor_type', label: '类型', render: (r) => <Badge>{r.actor_type}</Badge> },
        { key: 'role_in_property', label: '角色' },
        { key: 'contact_info', label: '联系方式', render: (r) => JSON.stringify(r.contact_info) },
        { key: 'property_id', label: '物业' },
        { key: 'create_time', label: '创建时间' },
      ]}
    />
  )
}
