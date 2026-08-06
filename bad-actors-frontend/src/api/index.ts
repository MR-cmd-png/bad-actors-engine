import apiClient from './client'
export const batchCreateEntities = (
  entities: Array<{ name: string; email: string; phone: string }>
) => apiClient.post('/entities/batch', { entities })
// Enable/disable rule
export const toggleRule = (ruleId: string, active: boolean) =>
  apiClient.patch(`/rule/${encodeURIComponent(ruleId)}/toggle`, { active })
// ======================== Entity ========================
export interface EntityCreate {
  name: string
  email: string
  phone: string
}

export interface Entity {
  id: number
  name: string
  email: string
  phone: string
}

export const createEntity = (data: EntityCreate) =>
  apiClient.post('/entity/create', data)

export const getEntityDetail = (entityId: number) =>
  apiClient.get(`/entity/${entityId}`)

// ======================== Event ========================
export interface EventCreate {
  entity_id: number
  type: string
  metadata_json: Record<string, any>
}

export const createEvent = (data: EventCreate) =>
  apiClient.post('/event/create', data)

// ======================== Rule ========================
export interface RuleCreate {
  rule_id: string
  definition: {
    condition: string
    score: number
    event_types?: string[]
  }
  active: boolean
}

export const createRule = (data: RuleCreate) =>
  apiClient.post('/rule/create', data)

// Edit rule (update definition: condition / score / associated event types)
export const updateRule = (
  ruleId: string,
  definition: { condition: string; score: number; event_types: string[] }
) => apiClient.put(`/rule/${encodeURIComponent(ruleId)}`, { definition })

export const listActiveRules = () =>
  apiClient.get('/rule/list')

export const deleteRule = (ruleId: string) =>
  apiClient.post(`/rule/${encodeURIComponent(ruleId)}/delete`)

// ======================== Score ========================
export const calcEntityScore = (entityId: number) =>
  apiClient.post(`/entity/${entityId}/calc_score`)

// ======================== Dashboard ========================
export const getHighRiskEntities = () =>
  apiClient.get('/dashboard/high_risk')
export interface EntityListParams {
  page?: number
  page_size?: number
  keyword?: string
  risk_level?: string
  order_by?: string
}

export const listEntities = (params: {
  page?: number; page_size?: number; keyword?: string;
  risk_level?: string; order_by?: string
}) => apiClient.get('/entities', { params })
// Batch recalculate all entity risk scores
// Batch recalculate all entity risk scores
export const batchCalculateScore = (only_with_events: boolean) =>
  apiClient.post('/risk/batch-calculate', null, {
    params: { only_with_events },
    timeout: 600000,   // 10 minutes, batch recalculation is slow
  })
export const calculateScore = (entity_id: number) =>
  apiClient.post(`/risk/calculate/${entity_id}`)