import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

const variants = {
  primary:   'bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20',
  secondary: 'bg-[#1a1a1a] hover:bg-[#222] text-slate-50 border border-[#333]',
  danger:    'bg-rose-600 hover:bg-rose-500 text-white font-semibold',
  ghost:     'hover:bg-white/5 text-slate-400 hover:text-slate-50',
  outline:   'border border-orange-500/50 text-orange-400 hover:bg-orange-500/10',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export default Button
