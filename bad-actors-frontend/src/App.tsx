import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import Events from './pages/Events'
import Rules from './pages/Rules'
import Scoring from './pages/Scoring'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - full screen, no layout */}
        <Route path="/" element={<Landing />} />

        {/* Tool section - with sidebar layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entities" element={<Entities />} />
          <Route path="/events" element={<Events />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/scoring" element={<Scoring />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
