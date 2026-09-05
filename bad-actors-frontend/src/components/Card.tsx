import { motion } from 'framer-motion'
import type {ReactNode} from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export default function Card({ children, className = '', hover = true, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
      className={`bg-bg-card border border-border rounded-xl p-6 shadow-sm ${
        hover ? 'hover:border-slate-300 hover:shadow-md' : ''
      } transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  )
}