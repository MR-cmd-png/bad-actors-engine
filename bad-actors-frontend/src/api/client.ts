import axios from 'axios'

// baseURL 策略：优先 VITE_API_BASE_URL；开发态走 vite proxy(/api -> http://localhost:8000)；
// 生产构建默认指向 Railway 域名，可用 .env 覆盖
const env = (import.meta as any).env || {}
const API_BASE_URL: string =
  env.VITE_API_BASE_URL ||
  (env.DEV ? '/api' : 'https://bad-actors-engine-production.up.railway.app')

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401 and errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete apiClient.defaults.headers.common['Authorization']
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const message = error.response?.data?.detail || error.message || 'Request failed'
    console.error(`[API Error] ${message}`)
    return Promise.reject(new Error(message))
  }
)

export default apiClient
