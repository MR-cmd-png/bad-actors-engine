import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listSignals, createSignal } from '../api'

// 预警信号管理：早期指标 / 观察发现（红旗高亮，创建后自动上时间线）
export default function Signals() {
  return (
    <CrudPage
      title="信号"
      description="预警 / 异常 / 趋势 / 关联红旗等早期指标"
      fetchList={listSignals}
      createItem={createSignal}
      filterByProperty
      fields={[
        { key: 'property_id', label: '所属物业 ID', type: 'number', required: true },
        { key: 'indicator', label: '信号内容', required: true },
        { key: 'signal_type', label: '信号类型', type: 'select', options: ['预警', '异常', '趋势', '关联红旗', '其他'], required: true },
        { key: 'importance', label: '重要度', type: 'select', options: ['低', '中', '高'] },
        { key: 'status', label: '状态', type: 'select', options: ['待核实', '已确认', '已排除'] },
        { key: 'event_id', label: '关联事件 ID（可空）', type: 'number' },
        { key: 'observed_at', label: '观察时间（可空，ISO 格式）', placeholder: '2025-01-10T09:00:00' },
        { key: 'description', label: '描述', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        {
          key: 'indicator', label: '信号内容',
          render: (r) => (
            <span className={r.importance === '高' ? 'font-medium text-red-400' : 'font-medium text-text-primary'}>
              {r.indicator}
            </span>
          ),
        },
        { key: 'signal_type', label: '类型' },
        { key: 'importance', label: '重要度', render: (r) => <Badge variant={r.importance === '高' ? 'high' : r.importance === '中' ? 'medium' : 'low'}>{r.importance}</Badge> },
        { key: 'status', label: '状态', render: (r) => <Badge variant={r.status === '已确认' ? 'high' : r.status === '待核实' ? 'medium' : 'low'}>{r.status}</Badge> },
        { key: 'observed_at', label: '观察时间' },
        { key: 'event_id', label: '关联事件' },
      ]}
    />
  )
}
