import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlight?: boolean
}

export default function Card({ className, highlight, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        highlight
          ? 'border border-orange-500/30 bg-orange-500/5 shadow-lg shadow-orange-500/10'
          : 'bg-[#111] border border-[#222]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
