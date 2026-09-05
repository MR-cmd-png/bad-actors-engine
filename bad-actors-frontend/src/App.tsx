import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './api/auth'
import { PropertyProvider } from './api/propertyContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Intelligence from './pages/Intelligence'
import Actors from './pages/Actors'
import Companies from './pages/Companies'
import Relationships from './pages/Relationships'
import Events from './pages/Events'
import Signals from './pages/Signals'
import Sources from './pages/Sources'
import Evidence from './pages/Evidence'
import RiskAssessments from './pages/RiskAssessments'
import Investigations from './pages/Investigations'

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
      <PropertyProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/property" element={
              <ProtectedRoute><Intelligence /></ProtectedRoute>
            } />
            <Route path="/actors" element={
              <ProtectedRoute><Actors /></ProtectedRoute>
            } />
            <Route path="/companies" element={
              <ProtectedRoute><Companies /></ProtectedRoute>
            } />
            <Route path="/relationships" element={
              <ProtectedRoute><Relationships /></ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute><Events /></ProtectedRoute>
            } />
            <Route path="/signals" element={
              <ProtectedRoute><Signals /></ProtectedRoute>
            } />
            <Route path="/sources" element={
              <ProtectedRoute><Sources /></ProtectedRoute>
            } />
            <Route path="/evidence" element={
              <ProtectedRoute><Evidence /></ProtectedRoute>
            } />
            <Route path="/risk-assessments" element={
              <ProtectedRoute><RiskAssessments /></ProtectedRoute>
            } />
            <Route path="/investigations" element={
              <ProtectedRoute><Investigations /></ProtectedRoute>
            } />
          </Route>
        </Routes>
        </BrowserRouter>
      </PropertyProvider>
    </AuthProvider>
  )
}
