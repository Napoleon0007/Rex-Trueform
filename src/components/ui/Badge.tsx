import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
import type { EventStatus } from '../../types/database'

const statusConfig: Record<EventStatus, { label: string; className: string; dot: string }> = {
  open:    { label: 'Open',    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  closed:  { label: 'Pending', className: 'bg-orange-500/15 text-orange-400 border-orange-500/20',   dot: 'bg-orange-400' },
  settled: { label: 'Settled', className: 'bg-[#1a1a1a] text-slate-400 border-[#333]',               dot: 'bg-slate-500' },
}

interface StatusBadgeProps {
  status: EventStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, className: sc, dot } = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', sc, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'open' && 'animate-pulse', dot)} />
      {label}
    </span>
  )
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'orange' | 'green' | 'red'
}

const badgeVariants = {
  default: 'bg-[#1a1a1a] text-slate-300 border-[#333]',
  orange:  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  green:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  red:     'bg-rose-500/15 text-rose-400 border-rose-500/20',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', badgeVariants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}
