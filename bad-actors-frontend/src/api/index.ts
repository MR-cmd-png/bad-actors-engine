import apiClient from './client'

// ======================== Property ========================
export const createProperty = (data: Record<string, any>) =>
  apiClient.post('/property/create', data)
export const listProperties = (params?: Record<string, any>) =>
  apiClient.get('/property/list', { params })
export const getPropertyDetail = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}`)
export const updateProperty = (propertyId: number, data: Record<string, any>) =>
  apiClient.patch(`/property/${propertyId}`, data)
export const deleteProperty = (propertyId: number) =>
  apiClient.delete(`/property/${propertyId}`)

// ======================== Property intelligence (profile + timeline) ========================
export const getPropertyProfile = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}/profile`)
export const getPropertyTimeline = (propertyId: number) =>
  apiClient.get(`/property/${propertyId}/timeline`)

// ======================== Generic CRUD helpers ========================
// Lists use /list suffix where bare path conflicts with SPA deep-link.
// Updates are PATCH partial, deletes are hard delete (admin-only on server).
const crud = (path: string, listPath?: string) => ({
  list: (params?: Record<string, any>) => apiClient.get(`/${listPath ?? path}`, { params }),
  create: (data: Record<string, any>) => apiClient.post(`/${path}/create`, data),
  detail: (id: number) => apiClient.get(`/${path}/${id}`),
  update: (id: number, data: Record<string, any>) => apiClient.patch(`/${path}/${id}`, data),
  remove: (id: number) => apiClient.delete(`/${path}/${id}`),
})

export const actorApi = crud('actor')
export const companyApi = crud('company')
export const relationshipApi = crud('relationship')
export const eventApi = crud('event', 'event/list')        // SPA deep-link conflict
export const signalApi = crud('signal')
export const sourceApi = crud('source')
export const evidenceApi = crud('evidence', 'evidence/list')  // SPA deep-link conflict
export const riskAssessmentApi = crud('risk-assessment')
export const investigationApi = crud('investigation')
export const timelineApi = crud('timeline')

// Backwards-compat named exports (older CrudPage configs still reference these)
export const listActors = actorApi.list
export const createActor = actorApi.create
export const updateActor = actorApi.update
export const deleteActor = actorApi.remove

export const listCompanies = companyApi.list
export const createCompany = companyApi.create
export const updateCompany = companyApi.update
export const deleteCompany = companyApi.remove

export const listRelationships = relationshipApi.list
export const createRelationship = relationshipApi.create
export const updateRelationship = relationshipApi.update
export const deleteRelationship = relationshipApi.remove

export const listEvents = eventApi.list
export const createEvent = eventApi.create
export const updateEvent = eventApi.update
export const deleteEvent = eventApi.remove

export const listSignals = signalApi.list
export const createSignal = signalApi.create
export const updateSignal = signalApi.update
export const deleteSignal = signalApi.remove

export const listSources = sourceApi.list
export const createSource = sourceApi.create
export const updateSource = sourceApi.update
export const deleteSource = sourceApi.remove

export const listEvidence = evidenceApi.list
export const createEvidence = evidenceApi.create
export const updateEvidence = evidenceApi.update
export const deleteEvidence = evidenceApi.remove

export const listRiskAssessments = riskAssessmentApi.list
export const createRiskAssessment = riskAssessmentApi.create
export const updateRiskAssessment = riskAssessmentApi.update
export const deleteRiskAssessment = riskAssessmentApi.remove

export const listInvestigations = investigationApi.list
export const createInvestigation = investigationApi.create
export const updateInvestigation = investigationApi.update
export const deleteInvestigation = investigationApi.remove

export const listTimelines = timelineApi.list
export const createTimeline = timelineApi.create
export const updateTimeline = timelineApi.update
export const deleteTimeline = timelineApi.remove

// ======================== Dashboard ========================
export const getDashboardOverview = () => apiClient.get('/dashboard/overview')
