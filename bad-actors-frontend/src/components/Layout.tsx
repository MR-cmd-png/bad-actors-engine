import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Zap,
  Shield,
  Activity,
  ArrowLeft,
  LogOut,
  UserCircle,
  Crown,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '../api/auth'

const adminNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/entities', label: 'Entities', icon: Users },
  { path: '/events', label: 'Events', icon: Zap },
  { path: '/rules', label: 'Rules', icon: Shield },
  { path: '/scoring', label: 'Risk Scoring', icon: Activity },
]

const userNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/entities', label: 'Entities', icon: Users },
  { path: '/events', label: 'Events', icon: Zap },
  { path: '/rules', label: 'Rules', icon: Shield },
  { path: '/scoring', label: 'Risk Scoring', icon: Activity },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navItems = user?.role === 'admin' ? adminNavItems : userNavItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card border-r border-border flex flex-col shrink-0">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="h-16 flex items-center gap-3 px-6 border-b border-border hover:bg-bg-card-hover transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Bad Actor</h1>
            <p className="text-[10px] text-text-secondary">Detection Engine</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/15 text-primary-light'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <UserCircle size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.username}</p>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' ? (
                    <Crown size={12} className="text-amber-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                  <span className={`text-xs ${user.role === 'admin' ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {user.role === 'admin' ? 'Administrator' : 'Viewer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-primary-light hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Landing
          </button>
          <div className="text-xs text-text-secondary text-center pt-1">
            MVP v1.1 • 2026
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          key={window.location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
