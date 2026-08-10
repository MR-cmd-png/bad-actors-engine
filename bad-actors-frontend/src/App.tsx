import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './api/auth'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import Events from './pages/Events'
import Rules from './pages/Rules'
import Scoring from './pages/Scoring'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/entities" element={
              <ProtectedRoute><Entities /></ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute><Events /></ProtectedRoute>
            } />
            <Route path="/rules" element={
              <ProtectedRoute><Rules /></ProtectedRoute>
            } />
            <Route path="/scoring" element={
              <ProtectedRoute><Scoring /></ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
