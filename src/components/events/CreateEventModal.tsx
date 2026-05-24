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

export default function CreateEventModal({ open, onClose }: CreateEventModalProps) {
  const createEvent = useCreateEvent()
  const [form, setForm] = useState({
    event_name: '',
    description: '',
    category: 'General',
    unit: '',
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
    if (!form.unit.trim()) { setError('Unit is required'); return }
    if (!form.closing_time) { setError('Closing time is required'); return }

    const closingDate = new Date(form.closing_time)
    if (closingDate <= new Date()) { setError('Closing time must be in the future'); return }

    try {
      await createEvent.mutateAsync({
        event_name: form.event_name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        unit: form.unit.trim(),
        closing_time: closingDate.toISOString(),
      })
      onClose()
      setForm({ event_name: '', description: '', category: 'General', unit: '', closing_time: '' })
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
        <Input
          label="Event name"
          placeholder="e.g. Springboks vs All Blacks — total points"
          value={form.event_name}
          onChange={(e) => set('event_name', e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Description <span className="text-slate-600">(optional)</span></label>
          <textarea
            className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 resize-none transition-colors"
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
