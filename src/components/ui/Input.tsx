import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-base text-white placeholder:text-slate-600',
            'focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30',
            'transition-colors duration-150',
            error && 'border-rose-500/60',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export default Input
