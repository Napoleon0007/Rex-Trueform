import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { usePlaceBet } from '../../hooks/useBets'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useAuthStore } from '../../store/authStore'
import { winnerLabel } from '../../lib/utils'
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
  const isScore  = event.event_type === 'score'
  const isWinner = event.event_type === 'winner'

  const [winnerPick, setWinnerPick] = useState<1 | 2 | 3 | null>(null)
  const [predHome, setPredHome] = useState('')
  const [predAway, setPredAway] = useState('')
  const [prediction, setPrediction] = useState('')
  const [amount, setAmount] = useState(1)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (amount < 1 || amount > balance) { setError(`Amount must be between 1 and ${balance}`); return }

    try {
      if (isWinner) {
        if (winnerPick === null) { setError('Pick a result first'); return }
        await placeBet.mutateAsync({ eventId: event.id, prediction: winnerPick, amount })
        setWinnerPick(null)
      } else if (isScore) {
        const home = parseInt(predHome, 10)
        const away = parseInt(predAway, 10)
        if (isNaN(home) || home < 0) { setError('Enter a valid home score'); return }
        if (isNaN(away) || away < 0) { setError('Enter a valid away score'); return }
        await placeBet.mutateAsync({ eventId: event.id, prediction: home, predictionAway: away, amount })
        setPredHome('')
        setPredAway('')
      } else {
        const pred = parseInt(prediction, 10)
        if (isNaN(pred)) { setError('Enter a valid whole number'); return }
        await placeBet.mutateAsync({ eventId: event.id, prediction: pred, amount })
        setPrediction('')
      }
      onClose()
      setAmount(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    }
  }

  const chips = [1, 5, 10, balance].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)

  const WINNER_OPTIONS: { pick: 1 | 2 | 3; label: string }[] = [
    { pick: 1, label: event.team_home ?? 'Home' },
    { pick: 2, label: 'Draw' },
    { pick: 3, label: event.team_away ?? 'Away' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={`Bet on "${event.event_name}"`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-400">
          {event.description && <p className="mb-1">{event.description}</p>}
          {(isScore || isWinner) ? (
            <p className="font-medium text-slate-200">
              {event.team_home} <span className="text-slate-500 mx-1">vs</span> {event.team_away}
            </p>
          ) : (
            <p>Unit: <span className="text-slate-200">{event.unit}</span></p>
          )}
        </div>

        {isWinner ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Who wins?</p>
            <div className="flex flex-col gap-2">
              {WINNER_OPTIONS.map(({ pick, label }) => (
                <button
                  key={pick}
                  type="button"
                  onClick={() => setWinnerPick(pick)}
                  className={`w-full rounded-xl py-3 text-base font-bold border transition-colors ${
                    winnerPick === pick
                      ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                      : 'border-[#333] bg-[#1a1a1a] text-slate-300 hover:border-orange-500/40 hover:text-orange-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : isScore ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Your predicted score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_home}</p>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={predHome}
                  onChange={(e) => setPredHome(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
              <span className="text-2xl font-black text-slate-600 mt-5">–</span>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_away}</p>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={predAway}
                  onChange={(e) => setPredAway(e.target.value)}
                  className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
            </div>
          </div>
        ) : (
          <Input
            label={`Your prediction (${event.unit})`}
            type="number"
            placeholder="e.g. 3"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            step="1"
            autoFocus
          />
        )}

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-medium text-slate-300">
            <span>How many tokens?</span>
            <span className="text-xs text-slate-500">{balance} available</span>
          </label>
          <div className="flex gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setAmount(chip)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${
                  amount === chip
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                    : 'border-[#333] bg-[#1a1a1a] text-slate-400 hover:border-orange-500/40 hover:text-orange-300'
                }`}
              >
                {chip === balance ? 'All' : chip}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={balance}
            value={amount}
            onChange={(e) => setAmount(Math.min(Math.max(1, Number(e.target.value)), balance))}
            className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-center text-lg font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-slate-400">
          {isWinner
            ? 'Correct pickers split the entire pot — wrong picks get nothing.'
            : isScore
            ? 'Payout based on how close your predicted score is to the actual result — closest wins the most.'
            : 'Payout is proportional to accuracy and pool size — more precise predictions win bigger.'
          }
        </div>

        <Button
          type="submit"
          loading={placeBet.isPending}
          className="w-full"
          size="lg"
          disabled={balance === 0 || (isWinner && winnerPick === null)}
        >
          {isWinner && winnerPick !== null
            ? `${winnerLabel(winnerPick, event.team_home, event.team_away)} · ${amount} 🪙`
            : `Place bet · ${amount} 🪙`
          }
        </Button>
      </form>
    </Modal>
  )
}
