import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useUpdateEvent } from '../../hooks/useEvents'
import { SPORT_CATEGORIES } from '../../lib/categories'
import type { EventWithResult } from '../../types/database'

interface EditEventModalProps {
  event: EventWithResult
  open: boolean
  onClose: () => void
}

const UNIT_SUGGESTIONS = ['goals', 'points', 'runs', 'seconds', 'votes', '°C', 'km/h', 'minutes']

export default function EditEventModal({ event, open, onClose }: EditEventModalProps) {
  const updateEvent = useUpdateEvent()

  function toLocalDatetime(iso: string) {
    const d = new Date(iso)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  const [eventType, setEventType] = useState<'numeric' | 'score' | 'winner'>(event.event_type ?? 'numeric')
  const [form, setForm] = useState({
    event_name: event.event_name,
    description: event.description ?? '',
    category: event.category,
    unit: (event.unit === 'score' || event.unit === 'winner') ? '' : event.unit,
    team_home: event.team_home ?? '',
    team_away: event.team_away ?? '',
    closing_time: toLocalDatetime(event.closing_time),
  })
  const [error, setError] = useState('')

  // Reset form when event changes
  useEffect(() => {
    setEventType(event.event_type ?? 'numeric')
    setForm({
      event_name: event.event_name,
      description: event.description ?? '',
      category: event.category,
      unit: (event.unit === 'score' || event.unit === 'winner') ? '' : event.unit,
      team_home: event.team_home ?? '',
      team_away: event.team_away ?? '',
      closing_time: toLocalDatetime(event.closing_time),
    })
    setError('')
  }, [event.id])

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.event_name.trim()) { setError('Event name is required'); return }
    if (!form.closing_time) { setError('Closing time is required'); return }

    const closingDate = new Date(form.closing_time)

    if (eventType === 'score') {
      if (!form.team_home.trim()) { setError('Home team name is required'); return }
      if (!form.team_away.trim()) { setError('Away team name is required'); return }
    } else {
      if (!form.unit.trim()) { setError('Unit is required'); return }
    }

    try {
      await updateEvent.mutateAsync({
        id: event.id,
        event_name: form.event_name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        event_type: eventType,
        unit: eventType === 'score' ? 'score' : form.unit.trim(),
        team_home: eventType === 'score' ? form.team_home.trim() : null,
        team_away: eventType === 'score' ? form.team_away.trim() : null,
        closing_time: closingDate.toISOString(),
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Market">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Event type toggle */}
        <div className="flex gap-2 rounded-xl border border-[#222] bg-[#0d0d0d] p-1">
          {(['score', 'numeric'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEventType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                eventType === t
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'score' ? '🏆 Score prediction' : '🔢 Numeric prediction'}
            </button>
          ))}
        </div>

        <Input
          label="Event name"
          placeholder={eventType === 'score' ? 'e.g. Springboks vs All Blacks' : 'e.g. Total points scored'}
          value={form.event_name}
          onChange={(e) => set('event_name', e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Description <span className="text-slate-600">(optional)</span></label>
          <textarea
            className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-base text-white placeholder:text-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 resize-none transition-colors"
            placeholder="Extra context for players..."
            rows={2}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Category picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Sport / Category</label>
          <div className="flex flex-wrap gap-2">
            {SPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => set('category', cat.label)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  form.category === cat.label
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                    : 'border-[#333] bg-[#1a1a1a] text-slate-400 hover:border-orange-500/40 hover:text-orange-400'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {eventType === 'score' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Home team"
              placeholder="e.g. Springboks"
              value={form.team_home}
              onChange={(e) => set('team_home', e.target.value)}
            />
            <Input
              label="Away team"
              placeholder="e.g. All Blacks"
              value={form.team_away}
              onChange={(e) => set('team_away', e.target.value)}
            />
          </div>
        )}

        {eventType === 'numeric' && (
          <div className="flex flex-col gap-2">
            <Input
              label="Unit"
              placeholder="goals, points, runs…"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {UNIT_SUGGESTIONS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => set('unit', u)}
                  className="rounded-full border border-[#333] bg-[#1a1a1a] px-2.5 py-0.5 text-xs text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Betting closes"
          type="datetime-local"
          value={form.closing_time}
          onChange={(e) => set('closing_time', e.target.value)}
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button type="submit" loading={updateEvent.isPending} className="w-full" size="lg">
          Save changes
        </Button>
      </form>
    </Modal>
  )
}
