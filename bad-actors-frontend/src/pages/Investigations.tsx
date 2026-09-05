import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listInvestigations, createInvestigation } from '../api'

// 调查/案件管理：顶层容器（负责人由后端按登录态注入）
export default function Investigations() {
  return (
    <CrudPage
      title="调查案件"
      description="以调查为单位串起物业的情报工作（进行中 / 暂停 / 结案）"
      fetchList={listInvestigations}
      createItem={createInvestigation}
      filterByProperty
      fields={[
        { key: 'property_id', label: '所属物业 ID', type: 'number', required: true },
        { key: 'title', label: '调查标题', required: true },
        { key: 'case_no', label: '案件编号' },
        { key: 'status', label: '状态', type: 'select', options: ['进行中', '暂停', '结案'] },
        { key: 'summary', label: '阶段结论', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: '标题', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
        { key: 'case_no', label: '案件编号' },
        {
          key: 'status', label: '状态',
          render: (r) => <Badge variant={r.status === '进行中' ? 'medium' : r.status === '结案' ? 'low' : 'high'}>{r.status}</Badge>,
        },
        { key: 'lead_investigator_id', label: '负责人' },
        { key: 'started_at', label: '开始时间' },
        { key: 'closed_at', label: '结案时间' },
      ]}
    />
  )
}
