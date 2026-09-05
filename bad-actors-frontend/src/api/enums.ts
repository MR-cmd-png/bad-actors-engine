// ==================================================================
// 中文 → 英文 枚举映射层
// DB 存中文枚举值；前端展示、表单下拉一律用英文 label
// 反查：表单 option 的 value 仍为 DB 中文值，保证提交无误
// ==================================================================

export const ACTOR_TYPES: Record<string, string> = {
  '自然人': 'Individual',
  '法定代表人': 'Legal Representative',
  '负责人': 'Manager',
  '承包商': 'Contractor',
  '租户': 'Tenant',
  '供应商': 'Supplier',
  '前员工': 'Former Employee',
  '其他': 'Other',
}

export const ORG_TYPES: Record<string, string> = {
  '公司': 'Company',
  '信托': 'Trust',
  '合伙企业': 'Partnership',
  '社会组织': 'Social Org',
  '其他': 'Other',
}

export const RELATION_TYPES: Record<string, string> = {
  '控股': 'Controlling',
  '任职': 'Position',
  '关联交易': 'Related Party Transaction',
  '亲属': 'Family',
  '代持': 'Nominee Holding',
  '担保': 'Guarantee',
  '诉讼对手': 'Litigation Counterparty',
  '其他': 'Other',
}

export const EVENT_CATEGORIES: Record<string, string> = {
  '指控': 'Allegation',
  '合同纠纷': 'Contract Dispute',
  '监管处罚': 'Regulatory Penalty',
  '诉讼': 'Lawsuit',
  '仲裁': 'Arbitration',
  '可疑交易': 'Suspicious Transaction',
  '投诉': 'Complaint',
  '其他': 'Other',
}

export const SEVERITY: Record<string, string> = {
  '低': 'Low',
  '中': 'Medium',
  '高': 'High',
  '极高': 'Critical',
}

export const IMPORTANCE: Record<string, string> = {
  '低': 'Low',
  '中': 'Medium',
  '高': 'High',
}

export const CONFIDENCE: Record<string, string> = {
  '高': 'High',
  '中': 'Medium',
  '低': 'Low',
}

export const RISK_STATUS: Record<string, string> = {
  '初评': 'Draft',
  '复核中': 'Under Review',
  '已确认': 'Confirmed',
  '已缓解': 'Mitigated',
  '已关闭': 'Closed',
}

export const SIGNAL_STATUS: Record<string, string> = {
  '待核实': 'Pending',
  '已确认': 'Confirmed',
  '已排除': 'Dismissed',
}

export const INVESTIGATION_STATUS: Record<string, string> = {
  '进行中': 'In Progress',
  '暂停': 'Paused',
  '结案': 'Closed',
}

export const SOURCE_TYPES: Record<string, string> = {
  '工商登记': 'Business Registry',
  '裁判文书': 'Court Document',
  '新闻': 'News',
  '监管公告': 'Regulatory Notice',
  '合同': 'Contract',
  '访谈': 'Interview',
  '现场走访': 'Site Visit',
  '内部举报': 'Whistleblower',
  '其他': 'Other',
}

export const EVIDENCE_TYPES: Record<string, string> = {
  '文件': 'Document',
  '陈述': 'Statement',
  '观察': 'Observation',
  '数据': 'Data',
  '截图': 'Screenshot',
  '其他': 'Other',
}

export const SIGNAL_TYPES: Record<string, string> = {
  '预警': 'Alert',
  '异常': 'Anomaly',
  '趋势': 'Trend',
  '关联红旗': 'Connection Red Flag',
  '其他': 'Other',
}

export const RISK_CATEGORIES: Record<string, string> = {
  '合规': 'Compliance',
  '法律': 'Legal',
  '财务': 'Financial',
  '运营': 'Operational',
  '声誉': 'Reputational',
  '关联交易': 'Related Party Transaction',
  '欺诈': 'Fraud',
  '其他': 'Other',
}

export const ENTRY_TYPES: Record<string, string> = {
  '事件': 'Event',
  '信号': 'Signal',
  '证据': 'Evidence',
  '评估': 'Assessment',
  '里程碑': 'Milestone',
}

export const PROPERTY_TYPES: Record<string, string> = {
  '商场': 'Shopping Mall',
  '写字楼': 'Office Tower',
  '社区商业': 'Community Retail',
  '产业园': 'Industrial Park',
  '其他': 'Other',
}

// 通用反查：传入中文值和映射表，返回英文；未命中直接回显原值
export const t = (zh: string | undefined | null, map: Record<string, string>) =>
  zh ? (map[zh] ?? zh) : '—'
