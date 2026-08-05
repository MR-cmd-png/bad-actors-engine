import type {InputHTMLAttributes} from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-200 ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}