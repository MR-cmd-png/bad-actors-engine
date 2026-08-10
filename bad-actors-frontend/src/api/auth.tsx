import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import apiClient from './client'

export interface User {
  id: number
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, role?: string) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const res: any = await apiClient.get('/auth/me')
      setUser(res.data)
    } catch {
      logout()
    }
  }

  const login = async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await apiClient.post('/auth/login', { username, password })
      const newToken = res.data.access_token
      const newUser = res.data.user
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
    } catch (e: any) {
      setError(e.message || 'Login failed')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, password: string, role: string = 'user') => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await apiClient.post('/auth/register', { username, password, role })
      const newToken = res.data.access_token
      const newUser = res.data.user
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
    } catch (e: any) {
      setError(e.message || 'Registration failed')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete apiClient.defaults.headers.common['Authorization']
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
