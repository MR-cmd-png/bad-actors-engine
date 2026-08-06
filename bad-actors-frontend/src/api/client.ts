import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'https://bad-actors-engine-production.up.railway.app',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Request failed'
    console.error(`[API Error] ${message}`)
    return Promise.reject(new Error(message))
  }
)

export default apiClient