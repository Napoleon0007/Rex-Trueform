import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { usePlaceBet } from '../../hooks/useBets'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useAuthStore } from '../../store/authStore'
import type { EventWithResult } from '../../types/database'

interface BetModalProps {
  event: EventWithResult
  open: boolean
  onClose: () => void
}

export default function BetModal({ event, open, onClose }: BetModalProps) {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const placeBet = usePlaceBet()

  const [prediction, setPrediction] = useState('')
  const [amount, setAmount] = useState(1)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const pred = parseInt(prediction, 10)
    if (isNaN(pred)) { setError('Enter a valid whole number'); return }
    if (amount < 1 || amount > balance) { setError(`Amount must be between 1 and ${balance}`); return }

    try {
      await placeBet.mutateAsync({ eventId: event.id, prediction: pred, amount })
      onClose()
      setPrediction('')
      setAmount(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Bet on "${event.event_name}"`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-400">
          {event.description && <p className="mb-1">{event.description}</p>}
          <p>Unit: <span className="text-slate-200">{event.unit}</span></p>
        </div>

        <Input
          label={`Your prediction (${event.unit})`}
          type="number"
          placeholder="e.g. 3"
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          step="1"
          autoFocus
        />

        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm font-medium text-slate-300">
            <span>Tokens to wager</span>
            <span className="text-orange-400 font-bold">{amount} 🪙</span>
          </label>
          <input
            type="range"
            min={1}
            max={Math.max(balance, 1)}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>1</span>
            <span className="text-slate-500">{balance} available</span>
            <span>{balance}</span>
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-slate-400">
          Payout is proportional to accuracy and pool size — more precise predictions win bigger.
        </div>

        <Button
          type="submit"
          loading={placeBet.isPending}
          className="w-full"
          size="lg"
          disabled={balance === 0}
        >
          Place bet · {amount} 🪙
        </Button>
      </form>
    </Modal>
  )
}
