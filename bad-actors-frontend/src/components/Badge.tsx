// 风险等级药丸徽章：使用设计规范固定四色（High红/Medium橙/Low绿），浅底深字
interface BadgeProps {
  children: React.ReactNode
  variant?: 'low' | 'medium' | 'high' | 'default'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = {
    low: 'bg-risk-low/10 text-risk-low border-risk-low/25',
    medium: 'bg-risk-medium/10 text-[#b57708] border-risk-medium/25',
    high: 'bg-risk-high/10 text-risk-high border-risk-high/25',
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
