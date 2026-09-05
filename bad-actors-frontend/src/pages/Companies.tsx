import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listCompanies, createCompany } from '../api'

// 公司/组织管理：配置驱动的通用 CRUD 页
export default function Companies() {
  return (
    <CrudPage
      title="公司组织"
      description="与物业关联的公司 / 信托 / 合伙企业等组织"
      fetchList={listCompanies}
      createItem={createCompany}
      filterByProperty
      fields={[
        { key: 'name', label: '名称', required: true },
        { key: 'org_type', label: '组织类型', type: 'select', options: ['公司', '信托', '合伙企业', '社会组织', '其他'], required: true },
        { key: 'property_id', label: '关联物业 ID（可空）', type: 'number' },
        { key: 'registration_no', label: '注册号/信用代码' },
        { key: 'jurisdiction', label: '注册地/管辖区' },
        { key: 'role', label: '关联角色' },
        { key: 'notes', label: '备注', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: '名称', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'org_type', label: '类型', render: (r) => <Badge>{r.org_type}</Badge> },
        { key: 'registration_no', label: '注册号' },
        { key: 'jurisdiction', label: '注册地' },
        { key: 'role', label: '关联角色' },
        { key: 'property_id', label: '物业' },
      ]}
    />
  )
}
