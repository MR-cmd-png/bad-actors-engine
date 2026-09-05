import { motion } from 'framer-motion'
import type {ReactNode} from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-dark shadow-sm active:scale-[0.98]',
    danger:
      'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]',
    ghost:
      'bg-bg-dark text-text-primary hover:bg-slate-200 active:scale-[0.98]',
  }

  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}