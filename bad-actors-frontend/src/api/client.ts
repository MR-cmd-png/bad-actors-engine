import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'https://bad-actors-engine-production.up.railway.app',
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