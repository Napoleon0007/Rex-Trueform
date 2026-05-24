import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvents'
import { useUserBet } from '../hooks/useBets'
import { useAuthStore } from '../store/authStore'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import BetModal from '../components/events/BetModal'
import ResultsScreen from '../components/results/ResultsScreen'
import SettleModal from '../components/results/SettleModal'
import { timeUntil, formatDateTime } from '../lib/utils'

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)

  const { data: event, isLoading, error } = useEvent(id!)
  const { data: userBet } = useUserBet(id!, user?.id)

  const [betOpen, setBetOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-6 w-32 animate-pulse rounded-lg bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="pt-8 text-center">
        <p className="text-slate-400">Event not found.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 text-sm text-orange-400 underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  const isOpen = event.status === 'open' && new Date(event.closing_time) > new Date()
  const canSettle = profile?.is_admin && (event.status === 'open' || event.status === 'closed')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back
      </button>

      {/* Event header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-xl font-bold leading-tight text-slate-50">{event.event_name}</h1>
          <StatusBadge status={event.status} className="shrink-0 mt-0.5" />
        </div>

        {event.description && (
          <p className="text-sm text-slate-400">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Unit: <span className="text-slate-300">{event.unit}</span></span>
          <span>·</span>
          {isOpen
            ? <span className="text-orange-400">⏱ {timeUntil(event.closing_time)} to bet</span>
            : <span>Closed {formatDateTime(event.closing_time)}</span>
          }
        </div>
      </div>

      {/* Settled → show results */}
      {event.status === 'settled' ? (
        <ResultsScreen event={event} />
      ) : (
        <>
          {/* User's existing bet */}
          {userBet ? (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500/70 mb-2">Your bet</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-50">
                    {userBet.prediction} <span className="text-slate-400 text-sm font-normal">{event.unit}</span>
                  </p>
                  <p className="text-xs text-slate-500">{userBet.amount} tokens wagered</p>
                </div>
                <span className="text-3xl">🎟</span>
              </div>
            </div>
          ) : isOpen && balance > 0 ? (
            <Button onClick={() => setBetOpen(true)} className="w-full" size="lg">
              Place your bet 🎯
            </Button>
          ) : isOpen && balance === 0 ? (
            <div className="rounded-2xl border border-white/10 p-4 text-center text-sm text-slate-500">
              You have no tokens left this month.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 p-4 text-center text-sm text-slate-500">
              Betting is closed — waiting for the result.
            </div>
          )}

          {/* Admin: settle button */}
          {canSettle && (
            <div className="pt-2 border-t border-white/5">
              <p className="mb-2 text-xs text-slate-600 uppercase tracking-widest">Admin</p>
              <Button variant="outline" onClick={() => setSettleOpen(true)} className="w-full">
                Enter result & settle event
              </Button>
            </div>
          )}
        </>
      )}

      <BetModal event={event} open={betOpen} onClose={() => setBetOpen(false)} />
      <SettleModal event={event} open={settleOpen} onClose={() => setSettleOpen(false)} />
    </div>
  )
}
