// 风险等级药丸徽章（浅色底 + 深色字，对照参考稿 Clean/Medium/High 配色）
interface BadgeProps {
  children: React.ReactNode
  variant?: 'low' | 'medium' | 'high' | 'default'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[variant]}`}
    >
      {children}
    </span>
  )
}
