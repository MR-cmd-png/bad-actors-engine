import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { listRiskAssessments, createRiskAssessment } from '../api'

// 风险评估管理：分析师撰写（评估人由后端按登录态注入；创建后自动上时间线）
export default function RiskAssessments() {
  return (
    <CrudPage
      title="风险评估"
      description="合规 / 法律 / 财务 / 运营 / 声誉 / 关联交易 / 欺诈风险的 analyst 判断"
      fetchList={listRiskAssessments}
      createItem={createRiskAssessment}
      filterByProperty
      fields={[
        { key: 'property_id', label: '所属物业 ID', type: 'number', required: true },
        { key: 'risk_category', label: '风险类别', type: 'select', options: ['合规', '法律', '财务', '运营', '声誉', '关联交易', '欺诈', '其他'], required: true },
        { key: 'severity', label: '严重度', type: 'select', options: ['低', '中', '高', '极高'] },
        { key: 'confidence', label: '置信度', type: 'select', options: ['高', '中', '低'] },
        { key: 'status', label: '状态', type: 'select', options: ['初评', '复核中', '已确认', '已缓解', '已关闭'] },
        { key: 'actor_id', label: '针对行为人 ID（可空）', type: 'number' },
        { key: 'rationale', label: '理由/论证', type: 'textarea', required: true },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'risk_category', label: '类别', render: (r) => <span className="font-medium text-text-primary">{r.risk_category}</span> },
        {
          key: 'severity', label: '严重度',
          render: (r) => <Badge variant={r.severity === '极高' || r.severity === '高' ? 'high' : r.severity === '中' ? 'medium' : 'low'}>{r.severity}</Badge>,
        },
        { key: 'confidence', label: '置信度' },
        { key: 'status', label: '状态' },
        { key: 'rationale', label: '论证', render: (r) => <span className="text-xs line-clamp-2">{r.rationale}</span> },
        { key: 'assessed_by', label: '评估人' },
        { key: 'assessed_at', label: '评估时间' },
      ]}
    />
  )
}
