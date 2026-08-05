interface BadgeProps {
  children: React.ReactNode
  variant?: 'low' | 'medium' | 'high' | 'default'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    default: 'bg-primary/15 text-primary-light border-primary/30',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[variant]}`}
    >
      {children}
    </span>
  )
}