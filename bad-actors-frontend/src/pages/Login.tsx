import { useState } from 'react'
import { useAuth } from '../api/auth'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'

// 登录页：ANABASED 海军蓝 + 红色主色（对照参考稿品牌体系）
export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      {/* 氛围光斑 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl border border-border p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/30">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-[22px] leading-none font-extrabold tracking-wide text-text-primary">ANABASED</h1>
            <p className="text-[11px] font-bold tracking-[0.22em] text-primary mt-1.5">BAD ACTORS ENGINE</p>
            <p className="text-sm text-text-secondary mt-4">Sign in to the Due-Diligence Intelligence Workbench</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg-dark border border-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-bg-dark border border-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to landing
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
