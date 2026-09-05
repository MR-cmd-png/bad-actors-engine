import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { sourceApi } from '../api'
import { SOURCE_TYPES, CONFIDENCE, t } from '../api/enums'

export default function Sources() {
  const stOptions = ['工商登记', '裁判文书', '新闻', '监管公告', '合同', '访谈', '现场走访', '内部举报', '其他']
  const relOptions = ['高', '中', '低']
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
