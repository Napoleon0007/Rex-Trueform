import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useCreateEvent } from '../../hooks/useEvents'
import { SPORT_CATEGORIES } from '../../lib/categories'

interface CreateEventModalProps {
  open: boolean
  onClose: () => void
}

const UNIT_SUGGESTIONS = ['goals', 'points', 'runs', 'seconds', 'votes', '°C', 'km/h', 'minutes']

type EventType = 'winner' | 'score' | 'numeric'

const EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: 'winner', label: '⚽ Winner' },
  { type: 'score',  label: '🏆 Score' },
  { type: 'numeric', label: '🔢 Numeric' },
]

export default function CreateEventModal({ open, onClose }: CreateEventModalProps) {
  const createEvent = useCreateEvent()
  const [eventType, setEventType] = useState<EventType>('winner')
  const [form, setForm] = useState({
    event_name: '',
    description: '',
    category: 'General',
    unit: '',
    team_home: '',
    team_away: '',
    closing_time: '',
  })
  const [error, setError] = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.event_name.trim()) { setError('Event name is required'); return }
    if (!form.closing_time) { setError('Closing time is required'); return }

    const closingDate = new Date(form.closing_time)
    if (closingDate <= new Date()) { setError('Closing time must be in the future'); return }

    if (eventType === 'score' || eventType === 'winner') {
      if (!form.team_home.trim()) { setError('Home team name is required'); return }
      if (!form.team_away.trim()) { setError('Away team name is required'); return }
    } else {
      if (!form.unit.trim()) { setError('Unit is required'); return }
    }

    try {
      await createEvent.mutateAsync({
        event_name: form.event_name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        event_type: eventType,
        unit: eventType === 'numeric' ? form.unit.trim() : eventType,
        team_home: (eventType === 'score' || eventType === 'winner') ? form.team_home.trim() : undefined,
        team_away: (eventType === 'score' || eventType === 'winner') ? form.team_away.trim() : undefined,
        closing_time: closingDate.toISOString(),
      })
      onClose()
      setForm({ event_name: '', description: '', category: 'General', unit: '', team_home: '', team_away: '', closing_time: '' })
      setEventType('winner')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  function defaultClosingTime() {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Market">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Event type toggle */}
        <div className="flex gap-1.5 rounded-xl border border-[#222] bg-[#0d0d0d] p-1">
          {EVENT_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setEventType(type)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                eventType === type
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Helper text */}
        <p className="text-xs text-slate-500">
          {eventType === 'winner'
            ? 'Players pick who wins — correct pickers share the pot.'
            : eventType === 'score'
            ? 'Players predict the exact score — closest prediction wins the most.'
            : 'Players predict a number — closest prediction wins the most.'
          }
        </p>

        <Input
          label="Event name"
          placeholder={
            eventType === 'winner' ? 'e.g. South Africa vs England' :
            eventType === 'score'  ? 'e.g. Springboks vs All Blacks' :
            'e.g. Total goals scored'
          }
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

        {/* Score / Winner: team names */}
        {(eventType === 'score' || eventType === 'winner') && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Home team"
              placeholder="e.g. South Africa"
              value={form.team_home}
              onChange={(e) => set('team_home', e.target.value)}
            />
            <Input
              label="Away team"
              placeholder="e.g. England"
              value={form.team_away}
              onChange={(e) => set('team_away', e.target.value)}
            />
          </div>
        )}

        {/* Numeric: unit */}
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
          value={form.closing_time || defaultClosingTime()}
          onChange={(e) => set('closing_time', e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button type="submit" loading={createEvent.isPending} className="w-full" size="lg">
          Create market
        </Button>
      </form>
    </Modal>
  )
}
