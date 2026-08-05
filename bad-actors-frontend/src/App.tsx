import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import Events from './pages/Events'
import Rules from './pages/Rules'
import Scoring from './pages/Scoring'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entities" element={<Entities />} />
          <Route path="/events" element={<Events />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/scoring" element={<Scoring />} />
          {/* Deleted:<Route path="/risk-score" element={<RiskScore />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}