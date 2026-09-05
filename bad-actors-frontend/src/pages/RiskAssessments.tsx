import CrudPage from '../components/CrudPage'
import Badge from '../components/Badge'
import { riskAssessmentApi } from '../api'
import { RISK_CATEGORIES, SEVERITY, CONFIDENCE, RISK_STATUS, t } from '../api/enums'

const sevVariant = (v: any) => v === '极高' ? 'high' : v === '高' ? 'high' : v === '中' ? 'medium' : 'low'

export default function RiskAssessments() {
  const catOptions = ['合规', '法律', '财务', '运营', '声誉', '关联交易', '欺诈', '其他']
  const sevOptions = ['低', '中', '高', '极高']
  const confOptions = ['高', '中', '低']
  const statusOptions = ['初评', '复核中', '已确认', '已缓解', '已关闭']
  return (
    <CrudPage
      title="Risk Assessments"
      description="Analyst-written risk evaluations (not auto-scoring)"
      fetchList={riskAssessmentApi.list}
      createItem={riskAssessmentApi.create}
      updateItem={riskAssessmentApi.update}
      deleteItem={riskAssessmentApi.remove}
      filterByProperty
      fields={[
        { key: 'property_id', label: 'Property ID', type: 'number', required: true },
        { key: 'risk_category', label: 'Category', type: 'select', options: catOptions, required: true },
        { key: 'severity', label: 'Severity', type: 'select', options: sevOptions, required: true },
        { key: 'confidence', label: 'Confidence', type: 'select', options: confOptions, required: true },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
        { key: 'actor_id', label: 'Actor ID', type: 'number' },
        { key: 'rationale', label: 'Rationale', type: 'textarea', required: true },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'risk_category', label: 'Category', render: (r) => <Badge>{t(r.risk_category, RISK_CATEGORIES)}</Badge> },
        { key: 'severity', label: 'Severity', render: (r) => <Badge variant={sevVariant(r.severity)}>{t(r.severity, SEVERITY)}</Badge> },
        { key: 'confidence', label: 'Conf.', render: (r) => <Badge>{t(r.confidence, CONFIDENCE)}</Badge> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{t(r.status, RISK_STATUS)}</Badge> },
        { key: 'assessed_at', label: 'Assessed' },
      ]}
    />
  )
}
