import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useUserBet } from '../../hooks/useBets'
import EventCard from './EventCard'
import BetModal from './BetModal'
import type { EventWithResult } from '../../types/database'

function EventItemWithBet({ event }: { event: EventWithResult }) {
  const { user } = useAuthStore()
  const { data: userBet } = useUserBet(event.id, user?.id)
  const [betOpen, setBetOpen] = useState(false)

  const isOpen = event.status === 'open' && new Date(event.closing_time) > new Date()

  return (
    <>
      <EventCard
        event={event}
        userBet={userBet}
        onBet={isOpen ? () => setBetOpen(true) : undefined}
      />
      {isOpen && (
        <BetModal event={event} existingBet={userBet} open={betOpen} onClose={() => setBetOpen(false)} />
      )}
    </>
  )
}

interface EventListProps {
  events: EventWithResult[] | undefined
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export default function EventList({ events, isLoading, isError, onRetry }: EventListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-casino-card border border-casino-elevated" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 py-12 text-center">
        <p className="text-2xl">⚠️</p>
        <p className="mt-2 text-sm text-slate-400">Couldn't load markets.</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 text-sm font-semibold text-orange-400 hover:text-orange-300 underline">
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-casino-border py-16 text-center text-sm text-slate-600">
        No markets here yet
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {events.map((event) => (
        <EventItemWithBet key={event.id} event={event} />
      ))}
    </div>
  )
}
