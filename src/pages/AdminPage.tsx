import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEvents } from '../hooks/useEvents'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import CreateEventModal from '../components/events/CreateEventModal'
import SettleModal from '../components/results/SettleModal'
import { categoryEmoji } from '../lib/categories'
import { timeUntil, formatDateTime } from '../lib/utils'
import type { EventWithResult } from '../types/database'

export default function AdminPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [settling, setSettling] = useState<EventWithResult | null>(null)

  const { data: allEvents, isLoading } = useEvents()

  if (!profile?.is_admin) {
    return (
      <div className="pt-16 text-center space-y-3">
        <p className="text-4xl">🚫</p>
        <p className="text-slate-500">Admin access only.</p>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-orange-400 underline">
          Back to markets
        </button>
      </div>
    )
  }

  const open    = allEvents?.filter((e) => e.status === 'open') ?? []
  const closed  = allEvents?.filter((e) => e.status === 'closed') ?? []
  const settled = allEvents?.filter((e) => e.status === 'settled') ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Admin <span className="text-slate-500 font-normal text-lg">⚙️</span></h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          + New market
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#111] border border-[#1a1a1a]" />)}
        </div>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500">Awaiting result</h2>
          {closed.map((event) => (
            <EventRow key={event.id} event={event} onSettle={() => setSettling(event)} />
          ))}
        </section>
      )}

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Open</h2>
          {open.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">Settled</h2>
          {settled.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </section>
      )}

      {!isLoading && !allEvents?.length && (
        <p className="rounded-2xl border border-dashed border-[#222] py-8 text-center text-sm text-slate-600">
          No markets yet. Create one!
        </p>
      )}

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {settling && (
        <SettleModal event={settling} open onClose={() => setSettling(null)} />
      )}
    </div>
  )
}

function EventRow({ event, onSettle }: { event: EventWithResult; onSettle?: () => void }) {
  const navigate = useNavigate()
  const isOpen = event.status === 'open' && new Date(event.closing_time) > new Date()
  const emoji = categoryEmoji(event.category)

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[#1e1e1e] bg-[#111] px-4 py-3 cursor-pointer hover:border-[#2a2a2a] transition-colors"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <span className="text-lg shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-white text-sm">{event.event_name}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {isOpen
            ? `⏱ Closes in ${timeUntil(event.closing_time)}`
            : event.status === 'settled'
            ? `Result: ${event.actual_result} ${event.unit}`
            : `Closed ${formatDateTime(event.closing_time)}`
          }
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={event.status} />
        {onSettle && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onSettle() }}
          >
            Enter result
          </Button>
        )}
      </div>
    </div>
  )
}
