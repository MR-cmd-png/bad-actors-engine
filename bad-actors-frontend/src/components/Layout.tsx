import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Users,
  Building,
  Network,
  Zap,
  AlertTriangle,
  FileText,
  FileCheck,
  ShieldAlert,
  FolderSearch,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../api/auth'
import { useProperties } from '../api/propertyContext'
import { listProperties, getDashboardOverview } from '../api'

// 侧边栏底部海岸剪影（对照参考稿的深蓝海岸意象）
const SIDEBAR_IMG =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rocky%20coastline%20aerial%20view%20at%20dusk%2C%20dark%20navy%20ocean%20waves%2C%20moody%20cinematic%20lighting%2C%20deep%20blue%20tones&image_size=portrait_4_3'

// Due-diligence intelligence workspace nav (read to all, write gated by API)
const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/property', label: 'Property Profile', icon: Building2 },
  { path: '/actors', label: 'Actors', icon: Users },
  { path: '/companies', label: 'Companies', icon: Building },
  { path: '/relationships', label: 'Relationships', icon: Network },
  { path: '/events', label: 'Events', icon: Zap },
  { path: '/signals', label: 'Signals', icon: AlertTriangle },
  { path: '/sources', label: 'Sources', icon: FileText },
  { path: '/evidence', label: 'Evidence', icon: FileCheck },
  { path: '/risk-assessments', label: 'Risk Assessments', icon: ShieldAlert },
  { path: '/investigations', label: 'Investigations', icon: FolderSearch },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { properties, selectedId, setSelectedId } = useProperties()

  const [sidebarOpen, setSidebarOpen] = useState(false) // 移动端抽屉
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [pendingSignals, setPendingSignals] = useState(0)

  // 顶栏搜索：300ms 防抖按关键词查物业
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      listProperties({ keyword: search.trim(), page: 1, page_size: 5 })
        .then((res: any) => setResults(res.data || []))
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // 铃铛角标：待核实信号数
  useEffect(() => {
    getDashboardOverview()
      .then((res: any) => setPendingSignals(res.data?.pending_signal_count ?? 0))
      .catch(() => setPendingSignals(0))
  }, [])

  const currentProperty = properties.find((p) => p.id === selectedId)
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const gotoProperty = (id: number) => {
    setSelectedId(id)
    setSearch('')
    setResults([])
    setSwitcherOpen(false)
    navigate('/property')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-page">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===================== Sidebar（深海军蓝） ===================== */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-navy flex flex-col shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-6 pt-6 pb-5 relative">
          <button
            className="absolute right-4 top-5 text-slate-400 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
          <h1 className="text-[26px] leading-none font-extrabold tracking-wide text-white">ANABASED</h1>
          <p className="text-[11px] font-bold tracking-[0.22em] text-primary mt-1.5">BAD ACTORS ENGINE</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs font-semibold tracking-[0.4em] text-white/90">STAGE 1</p>
            <p className="text-[10px] tracking-[0.18em] text-slate-400 mt-1.5">IDENTIFY. PREVENT. PROTECT.</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar bottom image */}
        <div className="relative h-36 shrink-0 overflow-hidden">
          <img src={SIDEBAR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <p className="text-[11px] font-bold tracking-[0.3em] text-white">SAFER STAYS</p>
            <p className="text-[11px] font-bold tracking-[0.3em] text-primary mt-0.5">STRONGER BUSINESS</p>
          </div>
        </div>

        {/* Lockup */}
        <div className="px-6 py-4 border-t border-white/10 text-center shrink-0">
          <p className="text-sm font-extrabold tracking-[0.15em] text-white">
            ANABASED<span className="align-super text-[8px] text-slate-400">™</span>
          </p>
          <p className="text-[9px] font-bold tracking-[0.25em] text-primary mt-1">BAD ACTORS ENGINE</p>
          <p className="text-[9px] tracking-[0.4em] text-slate-500 mt-1">STAGE 1</p>
        </div>
      </aside>

      {/* ===================== 右侧区域 ===================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center gap-3 px-4 lg:px-6 shrink-0 z-20">
          <button
            className="p-2 -ml-1 rounded-lg hover:bg-bg-dark lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* 全局搜索（真实按关键词查物业） */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties..."
              className="w-full pl-10 pr-4 py-2.5 bg-bg-dark border border-transparent rounded-full text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
            {results.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-border rounded-xl shadow-lg overflow-hidden">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => gotoProperty(p.id)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-bg-dark transition-colors"
                  >
                    <Building2 size={14} className="text-primary shrink-0" />
                    <span className="truncate text-text-primary">{p.name}</span>
                    <span className="ml-auto text-xs text-text-secondary shrink-0">{p.property_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:gap-3">
            {/* 物业切换器 */}
            <div className="relative hidden md:block">
              <button
                onClick={() => { setSwitcherOpen(!switcherOpen); setUserMenuOpen(false) }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:border-slate-300 text-sm transition-colors"
              >
                <Building2 size={15} className="text-primary" />
                <span className="max-w-[150px] truncate font-medium text-text-primary">
                  {currentProperty?.name ?? 'Select property'}
                </span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-20">
                    <div className="max-h-72 overflow-y-auto">
                      {properties.length === 0 && (
                        <p className="px-4 py-3 text-sm text-text-secondary">No properties yet</p>
                      )}
                      {properties.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => gotoProperty(p.id)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-dark transition-colors ${
                            p.id === selectedId ? 'text-primary font-semibold' : 'text-text-primary'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 通知铃铛（角标 = 待核实信号数） */}
            <button
              onClick={() => navigate('/signals')}
              className="relative p-2.5 rounded-lg hover:bg-bg-dark transition-colors"
              title="Pending signals"
            >
              <Bell size={18} className="text-text-primary" />
              {pendingSignals > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingSignals > 99 ? '99+' : pendingSignals}
                </span>
              )}
            </button>

            <div className="w-px h-7 bg-border" />

            {/* 用户菜单 */}
            <div className="relative">
              <button
                onClick={() => { setUserMenuOpen(!userMenuOpen); setSwitcherOpen(false) }}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-bg-dark transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </span>
                <span className="hidden sm:block text-left">
                  <span className="block text-sm font-semibold leading-tight text-text-primary">{user?.username}</span>
                  <span className="block text-[11px] text-text-secondary leading-tight">
                    {user?.role === 'admin' ? 'Administrator' : 'Viewer'}
                  </span>
                </span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-20">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 lg:p-6"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Footer strip */}
        <footer className="h-10 bg-white border-t border-border flex items-center justify-between px-4 lg:px-6 text-[11px] text-text-secondary shrink-0">
          <p className="truncate">
            <span className="font-extrabold tracking-wider text-text-primary">ANABASED</span>
            <span className="mx-2 text-slate-300">|</span>
            BAD ACTORS ENGINE — STAGE 1
          </p>
          <p className="hidden sm:block">Powered by smarter data. Built for real business.</p>
        </footer>
      </div>
    </div>
  )
}
