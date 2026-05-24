import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useSettleEvent } from '../../hooks/useEvents'
import type { EventWithResult } from '../../types/database'

interface SettleModalProps {
  event: EventWithResult
  open: boolean
  onClose: () => void
}

export default function SettleModal({ event, open, onClose }: SettleModalProps) {
  const settleEvent = useSettleEvent()
  const [result, setResult] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const parsed = parseInt(result, 10)
  const isValid = !isNaN(parsed)

  async function handleSettle() {
    if (!isValid) { setError('Enter a valid whole number'); return }

    try {
      await settleEvent.mutateAsync({ eventId: event.id, actualResult: parsed })
      onClose()
      setResult('')
      setConfirmed(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to settle event')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Enter actual result">
      <div className="space-y-5">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm">
          <p className="font-medium text-slate-200">{event.event_name}</p>
          <p className="mt-0.5 text-xs text-slate-500">Unit: {event.unit}</p>
        </div>

        <Input
          label={`Actual result (${event.unit})`}
          type="number"
          placeholder="e.g. 3"
          value={result}
          onChange={(e) => { setResult(e.target.value); setConfirmed(false) }}
          step="1"
          autoFocus
        />

        {isValid && !confirmed && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
            <p className="text-amber-300 font-medium">Confirm: the actual result was <span className="text-orange-400 font-bold">{parsed} {event.unit}</span>?</p>
            <p className="mt-1 text-xs text-slate-500">This will distribute payouts to all players. This action cannot be undone.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmed(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setConfirmed(true)}>
                Yes, confirm
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSettle}
          loading={settleEvent.isPending}
          disabled={!isValid || !confirmed}
        >
          Settle & pay out
        </Button>
      </div>
    </Modal>
  )
}
