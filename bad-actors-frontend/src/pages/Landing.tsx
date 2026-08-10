import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../api/auth'
import {
  Shield,
  Activity,
  Zap,
  Brain,
  Globe,
  Lock,
  ChevronRight,
  Sparkles,
  Cpu,
  Network,
  Eye,
  ArrowRight,
  ArrowUp,
  LogIn,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Detection',
    desc: 'Advanced rule engine with intelligent scoring algorithms that evolve with your data.',
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    desc: 'Live event tracking and instant risk assessment for every entity in your system.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Shield,
    title: 'Adaptive Rules',
    desc: 'Customizable rule engine to define, test, and deploy detection logic in seconds.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Lock,
    title: 'Secure by Design',
    desc: 'Enterprise-grade security with encrypted data pipelines and access control.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Network,
    title: 'Seamless Integration',
    desc: 'RESTful API architecture integrates effortlessly with your existing systems.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Eye,
    title: 'Deep Insights',
    desc: 'Comprehensive dashboards and analytics for informed risk management decisions.',
    color: 'from-indigo-500 to-violet-500',
  },
]

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<50ms', label: 'Avg Response' },
  { value: '10K+', label: 'Events/sec' },
  { value: '24/7', label: 'Active Monitor' },
]

const techStack = [
  { name: 'FastAPI', desc: 'High-Performance Backend' },
  { name: 'React 19', desc: 'Modern Frontend' },
  { name: 'MySQL', desc: 'Reliable Data Layer' },
  { name: 'Railway', desc: 'Cloud Infrastructure' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset + rect.top - 80
      window.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen bg-bg-dark">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      {/* Glowing Orbs */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]"
        animate={{
          x: [0, 50, -50, 0],
          y: [0, 30, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px]"
        animate={{
          x: [0, -40, 40, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px]"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary-light/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Bad Actor Engine</h1>
            <p className="text-[10px] text-text-secondary">Intelligent Risk Detection</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-8 text-sm"
        >
          <button onClick={() => scrollToSection('features')} className="text-text-secondary hover:text-text-primary transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection('tech')} className="text-text-secondary hover:text-text-primary transition-colors">
            Technology
          </button>
          <button onClick={() => scrollToSection('about')} className="text-text-secondary hover:text-text-primary transition-colors">
            About
          </button>
          {token && user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary-light border border-primary/30 hover:bg-primary/25 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {user.username}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-8 pt-16 pb-32 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary-light text-sm mb-8"
          >
            <Sparkles size={16} />
            <span>Next-Gen Risk Intelligence Platform</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            <span className="text-text-primary">Detect. </span>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Analyze.
            </span>
            <br />
            <span className="text-text-primary">Defend.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            An advanced behavioral analysis engine that identifies potential threats and
            high-risk entities through intelligent rule matching, real-time scoring, and
            continuous monitoring.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            {/* Primary Enter Button */}
            <motion.button
              onClick={() => navigate(token ? '/dashboard' : '/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold text-lg shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-purple-600 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative flex items-center gap-2">
                {token ? 'Enter the Engine' : 'Sign In to Get Started'}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>

            {/* Secondary Button */}
            <motion.button
              onClick={() => scrollToSection('features')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-xl bg-white/5 border border-border text-text-primary font-semibold text-lg backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
            >
              Explore Features
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-light to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-text-secondary mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-8 py-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-4">
            <Cpu size={14} />
            Core Capabilities
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Powered by{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-primary bg-clip-text text-transparent">
              Intelligence
            </span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            A comprehensive suite of tools designed to protect your business from emerging threats.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative p-6 rounded-2xl bg-white/5 border border-border backdrop-blur-sm hover:border-primary/50 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
              >
                <feature.icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Technology Section */}
      <section id="tech" className="relative z-10 px-8 py-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium mb-4">
            <Globe size={14} />
            Tech Stack
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Built on{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Modern Infrastructure
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="p-6 rounded-2xl bg-white/5 border border-border text-center backdrop-blur-sm hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Zap size={28} className="text-primary-light" />
              </div>
              <h4 className="font-semibold text-text-primary">{tech.name}</h4>
              <p className="text-xs text-text-secondary mt-1">{tech.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About / Mission Section */}
      <section id="about" className="relative z-10 px-8 py-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-border p-12 backdrop-blur-sm relative overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-4">
              <Network size={14} />
              Our Mission
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
              Reimagine Risk{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              We build intelligent systems that empower organizations to stay ahead of emerging threats.
              Our platform combines behavioral analysis, machine learning, and real-time monitoring
              to deliver actionable risk insights when you need them most.
            </p>
            <div className="flex items-center gap-4">
              <motion.button
              onClick={() => navigate(token ? '/dashboard' : '/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="group px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2"
            >
              {token ? 'Launch the Engine' : 'Sign In & Launch'}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
              <span className="text-sm text-text-secondary">
                No credit card required • Free forever tier
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-sm text-text-secondary">
              Bad Actor Engine © 2026 — All Rights Reserved
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/60 transition-all duration-300 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowUp size={22} />
        </motion.button>
      )}
    </div>
  )
}
