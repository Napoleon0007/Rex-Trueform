import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEvents, useDeleteEvent, useVoidEvent } from '../hooks/useEvents'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import CreateEventModal from '../components/events/CreateEventModal'
import EditEventModal from '../components/events/EditEventModal'
import SettleModal from '../components/results/SettleModal'
import { categoryEmoji } from '../lib/categories'
import { timeUntil, formatDateTime } from '../lib/utils'
import type { EventWithResult } from '../types/database'

export default function AdminPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing]   = useState<EventWithResult | null>(null)
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
            <EventRow
              key={event.id}
              event={event}
              onEdit={() => setEditing(event)}
              onSettle={() => setSettling(event)}
            />
          ))}
        </section>
      )}

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Open</h2>
          {open.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onEdit={() => setEditing(event)}
            />
          ))}
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">Settled</h2>
          {settled.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onEdit={() => setEditing(event)}
              onSettle={() => setSettling(event)}
            />
          ))}
        </section>
      )}

      {!isLoading && !allEvents?.length && (
        <p className="rounded-2xl border border-dashed border-[#222] py-8 text-center text-sm text-slate-600">
          No markets yet. Create one!
        </p>
      )}

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <EditEventModal event={editing} open onClose={() => setEditing(null)} />
      )}
      {settling && (
        <SettleModal event={settling} open onClose={() => setSettling(null)} />
      )}
    </div>
  )
}

function EventRow({
  event,
  onEdit,
  onSettle,
}: {
  event: EventWithResult
  onEdit?: () => void
  onSettle?: () => void
}) {
  const navigate = useNavigate()
  const deleteEvent = useDeleteEvent()
  const voidEvent   = useVoidEvent()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmVoid,   setConfirmVoid]   = useState(false)
  const [actionError,   setActionError]   = useState('')

  const isClosed   = event.status === 'closed'
  const isSettled  = event.status === 'settled'
  const emoji      = categoryEmoji(event.category)

  async function handleDelete() {
    setActionError('')
    try {
      await deleteEvent.mutateAsync(event.id)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Delete failed')
      setConfirmDelete(false)
    }
  }

  async function handleVoid() {
    setActionError('')
    try {
      await voidEvent.mutateAsync(event.id)
      setConfirmVoid(false)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Void failed')
      setConfirmVoid(false)
    }
  }

  const resultStr = isSettled
    ? event.event_type === 'score'
      ? `${event.team_home} ${event.actual_result}–${event.actual_away} ${event.team_away}`
      : `Result: ${event.actual_result} ${event.unit}`
    : null

  return (
    <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#141414] transition-colors"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <span className="text-lg shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-white text-sm">{event.event_name}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {isSettled && resultStr
              ? resultStr
              : isClosed
              ? `Closed ${formatDateTime(event.closing_time)}`
              : `⏱ Closes in ${timeUntil(event.closing_time)}`
            }
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={event.status} />

          {/* Open events: Edit */}
          {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}

          {/* Closed + Settled: Enter / Re-enter result */}
          {onSettle && (
            <Button size="sm" variant="outline" onClick={onSettle}>
              {isSettled ? 'Re-enter result' : 'Enter result'}
            </Button>
          )}

          {/* Closed + Settled: Void */}
          {(isClosed || isSettled) && !confirmVoid && (
            <Button
              size="sm"
              variant="outline"
              className="!border-rose-500/40 !text-rose-400 hover:!border-rose-500 hover:!text-rose-300"
              onClick={() => { setConfirmVoid(true); setConfirmDelete(false) }}
            >
              Void
            </Button>
          )}

          {/* All statuses: Delete */}
          {!confirmDelete && (
            <Button
              size="sm"
              variant="outline"
              className="!border-rose-500/40 !text-rose-400 hover:!border-rose-500 hover:!text-rose-300"
              onClick={() => { setConfirmDelete(true); setConfirmVoid(false) }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Void confirmation */}
      {confirmVoid && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {isSettled
              ? <>Payouts will be <span className="text-rose-400">reversed</span> and bets <span className="text-amber-400">refunded</span>.</>
              : <>All bets will be <span className="text-amber-400">refunded</span>.</>
            }
          </p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={() => setConfirmVoid(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={voidEvent.isPending}
              className="!bg-rose-600 hover:!bg-rose-500"
              onClick={handleVoid}
            >
              Confirm void
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Delete permanently?{' '}
            {isSettled
              ? 'Token history remains — only the event record is removed.'
              : isClosed
              ? 'Refunds already processed via void.'
              : 'Only possible if no bets placed.'
            }
          </p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={deleteEvent.isPending}
              className="!bg-rose-600 hover:!bg-rose-500"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-2">
          <p className="text-xs text-rose-400">{actionError}</p>
        </div>
      )}
    </div>
  )
}
