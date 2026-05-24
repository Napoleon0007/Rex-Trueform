import { useAuthStore } from '../../store/authStore'
import { useUserBet } from '../../hooks/useBets'
import EventCard from './EventCard'
import type { EventWithResult } from '../../types/database'

function EventItemWithBet({ event }: { event: EventWithResult }) {
  const { user } = useAuthStore()
  const { data: userBet } = useUserBet(event.id, user?.id)
  return <EventCard event={event} userBet={userBet} />
}

interface EventListProps {
  events: EventWithResult[] | undefined
  isLoading?: boolean
}

export default function EventList({ events, isLoading }: EventListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-[#111] border border-[#1a1a1a]" />
        ))}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#222] py-16 text-center text-sm text-slate-600">
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
