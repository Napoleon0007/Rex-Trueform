import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { usePlaceBet, useUpdateBet } from '../../hooks/useBets'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useAuthStore } from '../../store/authStore'
import { pickLabel, formatPrediction } from '../../lib/utils'
import { toast } from '../../store/toastStore'
import type { Bet, EventWithResult } from '../../types/database'

interface BetModalProps {
  event: EventWithResult
  open: boolean
  onClose: () => void
  /** When provided, the modal edits this bet instead of placing a new one. */
  existingBet?: Bet | null
}

export default function BetModal({ event, open, onClose, existingBet }: BetModalProps) {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const placeBet = usePlaceBet()
  const updateBet = useUpdateBet()
  const isScore = event.event_type === 'score'
  const isPick  = event.event_type === 'pick'
  const options = event.options ?? []
  const isEdit  = !!existingBet

  // Editing refunds the old stake first, so that much extra is spendable.
  const maxSpendable = balance + (existingBet?.amount ?? 0)
  const mutation = isEdit ? updateBet : placeBet

  const [pick, setPick] = useState<number | null>(null)
  const [predHome, setPredHome] = useState('')
  const [predAway, setPredAway] = useState('')
  const [prediction, setPrediction] = useState('')
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')

  // (Re)seed the form whenever the modal opens — prefilled from the existing bet in edit mode.
  useEffect(() => {
    if (!open) return
    setError('')
    if (existingBet) {
      setPick(isPick ? existingBet.prediction : null)
      setPredHome(isScore ? String(existingBet.prediction) : '')
      setPredAway(isScore ? String(existingBet.prediction_away ?? '') : '')
      setPrediction(!isPick && !isScore ? String(existingBet.prediction) : '')
      setAmount(existingBet.amount)
    } else {
      setPick(null)
      setPredHome('')
      setPredAway('')
      setPrediction('')
      setAmount(0)
    }
  }, [open, existingBet, isPick, isScore])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (amount < 1 || amount > maxSpendable) { setError(`Amount must be between 1 and ${maxSpendable}`); return }

    try {
      let chosenPrediction: number
      let chosenAway: number | undefined

      if (isPick) {
        if (pick === null) { setError('Pick an option first'); return }
        chosenPrediction = pick
      } else if (isScore) {
        const home = parseInt(predHome, 10)
        const away = parseInt(predAway, 10)
        if (isNaN(home) || home < 0) { setError('Enter a valid home score'); return }
        if (isNaN(away) || away < 0) { setError('Enter a valid away score'); return }
        chosenPrediction = home
        chosenAway = away
      } else {
        const pred = parseInt(prediction, 10)
        if (isNaN(pred)) { setError('Enter a valid whole number'); return }
        chosenPrediction = pred
      }

      await mutation.mutateAsync({
        eventId: event.id,
        prediction: chosenPrediction,
        ...(chosenAway !== undefined ? { predictionAway: chosenAway } : {}),
        amount,
      })

      const label = formatPrediction(event, chosenPrediction, chosenAway)
      toast.success(`${isEdit ? 'Bet updated' : 'Bet placed'} · ${amount} Ŧ on ${label}`, '🎟')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    }
  }

  // Chip denominations you can afford. Tapping a chip ADDS it to your stake
  // (tap 5 three times → 15). The box below also takes any custom amount.
  const chips = [2, 5, 10, 25, 50, 100].filter((v) => v <= maxSpendable)

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? 'Edit bet' : 'Bet'} on "${event.event_name}"`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-400">
          {event.description && <p className="mb-1">{event.description}</p>}
          {isScore ? (
            <p className="font-medium text-slate-200">
              {event.team_home} <span className="text-slate-500 mx-1">vs</span> {event.team_away}
            </p>
          ) : isPick ? (
            <p className="font-medium text-slate-200 line-clamp-2">{options.join(' · ')}</p>
          ) : (
            <p>Unit: <span className="text-slate-200">{event.unit}</span></p>
          )}
        </div>

        {isPick ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Your pick</p>
            {options.length < 2 ? (
              <p className="text-sm text-rose-400">This market is misconfigured — no options to pick from.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {options.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPick(i + 1)}
                    className={`w-full rounded-xl py-3 px-3 text-base font-bold border transition-colors truncate ${
                      pick === i + 1
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-casino-line bg-casino-elevated text-slate-300 hover:border-orange-500/40 hover:text-orange-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isScore ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Your predicted score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_home}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={predHome}
                  onChange={(e) => setPredHome(e.target.value)}
                  className="w-full rounded-xl border border-casino-line bg-casino-elevated px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
              <span className="text-2xl font-black text-slate-600 mt-5">–</span>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_away}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={predAway}
                  onChange={(e) => setPredAway(e.target.value)}
                  className="w-full rounded-xl border border-casino-line bg-casino-elevated px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
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
            <span>How many Truth Tokens?</span>
            <span className="text-xs text-slate-500">{maxSpendable} available</span>
          </label>
          {/* Tap a chip to ADD it to your stake (tap 5 three times → 15). */}
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAmount((a) => Math.min(a + c, maxSpendable))}
                className="flex-1 rounded-xl border border-casino-line bg-casino-elevated py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-orange-500/40 hover:text-orange-300 active:scale-95"
              >
                +{c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(maxSpendable)}
              className="flex-1 rounded-xl border border-orange-500/40 bg-orange-500/10 py-2 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-500/20 active:scale-95"
            >
              All
            </button>
          </div>

          {/* Or type any custom amount. */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={maxSpendable}
              value={amount}
              onChange={(e) => setAmount(Math.min(Math.max(0, Math.floor(Number(e.target.value) || 0)), maxSpendable))}
              className="w-full flex-1 rounded-xl border border-casino-line bg-casino-elevated px-4 py-2.5 text-center text-lg font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setAmount(0)}
              disabled={amount === 0}
              className="rounded-xl border border-casino-line px-4 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-slate-400">
          {isPick
            ? 'Correct pickers win — they take the losers\' matched money in proportion to their stakes. Unmatched stake comes back to you.'
            : isScore
            ? 'Closest score takes the winnings — spot on beats everyone. Ties split by stake, and losers get back whatever the winners couldn\'t match.'
            : 'Closest prediction takes the winnings. Ties split by stake, and losers get back whatever the winners couldn\'t match.'
          }
        </div>

        <Button
          type="submit"
          loading={mutation.isPending}
          className="w-full"
          size="lg"
          disabled={maxSpendable === 0 || amount < 1 || (isPick && pick === null)}
        >
          {isEdit
            ? `Update bet · ${amount} Ŧ`
            : isPick && pick !== null
            ? `${pickLabel(options, pick)} · ${amount} Ŧ`
            : `Place bet · ${amount} Ŧ`
          }
        </Button>
      </form>
    </Modal>
  )
}
