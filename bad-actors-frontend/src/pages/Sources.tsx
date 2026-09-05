import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listSources, createSource } from '../api'

// 信息来源管理：采集人由后端按登录态注入，无需录入
export default function Sources() {
  return (
    <CrudPage
      title="信息来源"
      description="信息从哪来、何时获得（工商登记 / 裁判文书 / 新闻 / 合同 / 访谈…）"
      fetchList={listSources}
      createItem={createSource}
      fields={[
        { key: 'name', label: '来源名称', required: true },
        { key: 'source_type', label: '来源类型', type: 'select', options: ['工商登记', '裁判文书', '新闻', '监管公告', '合同', '访谈', '现场走访', '内部举报', '其他'], required: true },
        { key: 'reliability', label: '可靠性', type: 'select', options: ['高', '中', '低'] },
        { key: 'reference', label: '链接或编号' },
        { key: 'obtained_at', label: '获得时间（可空，ISO 格式）', placeholder: '2025-01-10T09:00:00' },
        { key: 'notes', label: '备注', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: '名称', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
        { key: 'source_type', label: '类型', render: (r) => <Badge>{r.source_type}</Badge> },
        {
          key: 'reliability', label: '可靠性',
          render: (r) => <Badge variant={r.reliability === '高' ? 'low' : r.reliability === '中' ? 'medium' : 'high'}>{r.reliability}</Badge>,
        },
        { key: 'reference', label: '链接/编号' },
        { key: 'collector_id', label: '采集人' },
        { key: 'obtained_at', label: '获得时间' },
      ]}
    />
  )
}
