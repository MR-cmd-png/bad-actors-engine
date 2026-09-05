import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listRelationships, createRelationship } from '../api'

// 关系网络：通用边表的录入与浏览（subject/object 为 actor/company/property 节点）
export default function Relationships() {
  return (
    <CrudPage
      title="关系网络"
      description="谁与谁、什么性质（边表：subject —关系→ object）"
      fetchList={listRelationships}
      createItem={createRelationship}
      fields={[
        { key: 'subject_type', label: '主体类型', type: 'select', options: ['actor', 'company', 'property'], required: true },
        { key: 'subject_id', label: '主体 ID', type: 'number', required: true },
        { key: 'object_type', label: '客体类型', type: 'select', options: ['actor', 'company', 'property'], required: true },
        { key: 'object_id', label: '客体 ID', type: 'number', required: true },
        { key: 'relation_type', label: '关系类型', type: 'select', options: ['控股', '任职', '关联交易', '亲属', '代持', '担保', '诉讼对手', '其他'], required: true },
        { key: 'confidence', label: '置信度', type: 'select', options: ['高', '中', '低'] },
        { key: 'nature_description', label: '性质描述', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        {
          key: 'edge', label: '关系边',
          render: (r) => (
            <span className="text-xs">
              {r.subject_type}#{r.subject_id}
              <span className="text-primary-light font-semibold"> —{r.relation_type}→ </span>
              {r.object_type}#{r.object_id}
            </span>
          ),
        },
        { key: 'relation_type', label: '类型', render: (r) => <Badge>{r.relation_type}</Badge> },
        { key: 'confidence', label: '置信度', render: (r) => <Badge variant={r.confidence === '高' ? 'high' : r.confidence === '中' ? 'medium' : 'low'}>{r.confidence}</Badge> },
        { key: 'nature_description', label: '描述' },
      ]}
    />
  )
}
