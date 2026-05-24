import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../ui/Badge'
import { timeUntil, formatDateTime } from '../../lib/utils'
import { categoryEmoji } from '../../lib/categories'
import type { EventWithResult } from '../../types/database'
import type { Bet } from '../../types/database'

interface EventCardProps {
  event: EventWithResult
  userBet?: Bet | null
  onBet?: () => void
}

export default function EventCard({ event, userBet, onBet }: EventCardProps) {
  const navigate = useNavigate()
  const isOpen = event.status === 'open' && new Date(event.closing_time) > new Date()
  const endingSoon = isOpen && new Date(event.closing_time) <= new Date(Date.now() + 6 * 60 * 60 * 1000)
  const emoji = categoryEmoji(event.category)

  return (
    <div
      className="group relative cursor-pointer rounded-2xl border border-[#222] bg-[#111] overflow-hidden transition-all duration-200 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.99]"
      onClick={() => onBet ? onBet() : navigate(`/events/${event.id}`)}
    >
      {/* Orange top bar for open events */}
      {isOpen && <div className="h-0.5 bg-orange-500" />}

      <div className="p-4">
        {/* Category + status row */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
            <span>{emoji}</span>
            {event.category}
          </span>
          <StatusBadge status={event.status} />
        </div>

        {/* Event name */}
        <h3 className="font-bold text-white text-[15px] leading-snug mb-1 group-hover:text-orange-50 transition-colors">
          {event.event_name}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-xs text-slate-500 line-clamp-1 mb-3">{event.description}</p>
        )}

        {/* Divider */}
        <div className="border-t border-[#1e1e1e] my-3" />

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs">
          <span className={endingSoon ? 'text-orange-400 font-semibold' : isOpen ? 'text-slate-400' : 'text-slate-600'}>
            {isOpen
              ? `⏱ ${timeUntil(event.closing_time)}${endingSoon ? ' — ending soon!' : ' left'}`
              : event.status === 'settled'
              ? `✓ Result: ${event.actual_result} ${event.unit}`
              : `Closed ${formatDateTime(event.closing_time)}`
            }
          </span>
          {event.status === 'settled' && event.total_tokens_bet != null && (
            <span className="text-slate-500">🪙 {event.total_tokens_bet} pool</span>
          )}
        </div>

        {/* User's bet — shown below stats */}
        {userBet && (
          <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2">
            {event.status === 'settled' && userBet.payout != null ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Predicted <span className="text-slate-200 font-medium">{userBet.prediction} {event.unit}</span>
                </span>
                <span className={userBet.payout >= userBet.amount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {userBet.payout >= userBet.amount ? '+' : ''}{Math.round(userBet.payout - userBet.amount)} tokens
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Your bet: <span className="text-orange-400 font-semibold">{userBet.amount} tokens</span>
                  {' on '}
                  <span className="text-white font-medium">{userBet.prediction} {event.unit}</span>
                </span>
                <span className="text-orange-500">🎟</span>
              </div>
            )}
          </div>
        )}

        {/* CTA for open events with no bet */}
        {isOpen && !userBet && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-600">Unit: {event.unit}</span>
            <span className="text-xs font-semibold text-orange-500 group-hover:text-orange-400 transition-colors">
              Place bet →
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
