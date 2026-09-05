import apiClient from './client'

// ======================== 物业 ========================
export interface PropertyCreate {
  name: string
  address: string
  property_type: string
  ownership_or_management: string
  status?: string
  relevant_dates?: Record<string, any>
  description?: string
}

export const createProperty = (data: PropertyCreate) =>
  apiClient.post('/property/create', data)

export const listProperties = (params?: Record<string, any>) =>
  apiClient.get('/property/list', { params })

export const getPropertyDetail = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}`)

// 情报图景装配端点（核心）
export const getPropertyProfile = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}/profile`)

export const getPropertyTimeline = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}/timeline`)

// ======================== 通用情报 CRUD ========================
// 列表 GET /{res}/list；创建 POST /{res}/create
// （列表挂 /list 后缀：避免裸路径与前端 SPA 深链接 /property、/events、/evidence 冲突）
export const listActors = (params?: Record<string, any>) => apiClient.get('/actor', { params })
export const createActor = (data: Record<string, any>) => apiClient.post('/actor/create', data)

export const listCompanies = (params?: Record<string, any>) => apiClient.get('/company', { params })
export const createCompany = (data: Record<string, any>) => apiClient.post('/company/create', data)

export const listRelationships = (params?: Record<string, any>) => apiClient.get('/relationship', { params })
export const createRelationship = (data: Record<string, any>) => apiClient.post('/relationship/create', data)

export const listEvents = (params?: Record<string, any>) => apiClient.get('/event/list', { params })
export const createEvent = (data: Record<string, any>) => apiClient.post('/event/create', data)

export const listSignals = (params?: Record<string, any>) => apiClient.get('/signal', { params })
export const createSignal = (data: Record<string, any>) => apiClient.post('/signal/create', data)

export const listSources = (params?: Record<string, any>) => apiClient.get('/source', { params })
export const createSource = (data: Record<string, any>) => apiClient.post('/source/create', data)

export const listEvidence = (params?: Record<string, any>) => apiClient.get('/evidence/list', { params })
export const createEvidence = (data: Record<string, any>) => apiClient.post('/evidence/create', data)

export const listRiskAssessments = (params?: Record<string, any>) => apiClient.get('/risk-assessment', { params })
export const createRiskAssessment = (data: Record<string, any>) => apiClient.post('/risk-assessment/create', data)

export const listInvestigations = (params?: Record<string, any>) => apiClient.get('/investigation', { params })
export const createInvestigation = (data: Record<string, any>) => apiClient.post('/investigation/create', data)

export const listTimelines = (params?: Record<string, any>) => apiClient.get('/timeline', { params })
export const createTimeline = (data: Record<string, any>) => apiClient.post('/timeline/create', data)

// ======================== Dashboard ========================
export const getDashboardOverview = () => apiClient.get('/dashboard/overview')
