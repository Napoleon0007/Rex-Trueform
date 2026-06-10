import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useSettleEvent } from '../../hooks/useEvents'
import { useEventBets } from '../../hooks/useBets'
import { pickLabel } from '../../lib/utils'
import type { EventWithResult } from '../../types/database'

interface SettleModalProps {
  event: EventWithResult
  open: boolean
  onClose: () => void
}

type BetRow = {
  id: string
  prediction: number
  prediction_away: number | null
  amount: number
  profiles: { display_name: string; username: string }
}

// Mirrors settle_event exactly (closest wins + matched stakes, 018/019):
// pick = correct option, score/numeric = smallest distance; losers pay in
// at most the winners' total stake and get the unmatched remainder back;
// winners split the collected pool in proportion to stake on top of their
// own stake. Nobody right / everyone tied = full refunds.
function calcPayouts(
  bets: BetRow[],
  actualHome: number,
  actualAway: number | null,
  eventType: 'numeric' | 'score' | 'pick',
) {
  const totalBet = bets.reduce((s, b) => s + b.amount, 0)

  const withDistance = bets.map((b) => {
    const distance =
      eventType === 'pick'
        ? (b.prediction === actualHome ? 0 : 1)
        : eventType === 'score'
        ? Math.abs(b.prediction - actualHome) + Math.abs((b.prediction_away ?? 0) - (actualAway ?? 0))
        : Math.abs(b.prediction - actualHome)
    return { ...b, distance }
  })

  // Pick events only win on an exact match; closest events always have
  // at least one winner (the smallest distance).
  const minDist = Math.min(...withDistance.map((b) => b.distance))
  const isWin = (b: { distance: number }) =>
    eventType === 'pick' ? b.distance === 0 : b.distance === minDist

  const winnerTotal = withDistance.filter(isWin).reduce((s, b) => s + b.amount, 0)
  const refundAll = (winnerTotal === 0 && totalBet > 0) || winnerTotal === totalBet

  const pool = refundAll
    ? 0
    : withDistance
        .filter((b) => !isWin(b))
        .reduce((s, b) => s + Math.min(b.amount, winnerTotal), 0)

  return withDistance
    .map((b) => {
      const win = isWin(b)
      const payout = refundAll
        ? b.amount
        : win
        ? Math.round(b.amount + (pool * b.amount) / winnerTotal)
        : b.amount - Math.min(b.amount, winnerTotal) // giveback of unmatched stake
      return { ...b, score: win ? b.amount : 0, payout }
    })
    .sort((a, b) => b.payout - a.payout)
}

export default function SettleModal({ event, open, onClose }: SettleModalProps) {
  const settleEvent = useSettleEvent()
  const { data: bets = [] } = useEventBets(event.id)
  const isScore = event.event_type === 'score'
  const isPick  = event.event_type === 'pick'
  const options = event.options ?? []

  const [homeResult, setHomeResult] = useState('')
  const [awayResult, setAwayResult] = useState('')
  const [pickResult, setPickResult] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const parsedHome = parseInt(homeResult, 10)
  const parsedAway = parseInt(awayResult, 10)
  const homeValid  = !isNaN(parsedHome) && parsedHome >= 0
  const awayValid  = !isNaN(parsedAway) && parsedAway >= 0

  const inputValid = isPick
    ? pickResult !== null && pickResult >= 1 && pickResult <= options.length
    : isScore
    ? homeValid && awayValid
    : homeValid

  const actualForCalc = isPick ? (pickResult ?? 0) : parsedHome

  const preview = useMemo(() => {
    if (!inputValid || bets.length === 0) return null
    return calcPayouts(
      bets as BetRow[],
      actualForCalc,
      isScore ? parsedAway : null,
      event.event_type,
    )
  }, [inputValid, actualForCalc, parsedAway, bets, isScore, event.event_type])

  async function handleSettle() {
    if (!inputValid) { setError('Enter a valid result'); return }
    try {
      await settleEvent.mutateAsync({
        eventId: event.id,
        actualResult: isPick ? (pickResult as number) : parsedHome,
        ...(isScore ? { actualAway: parsedAway } : {}),
      })
      onClose()
      setHomeResult('')
      setAwayResult('')
      setPickResult(null)
      setConfirmed(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to settle event')
    }
  }

  const resultLabel = isPick
    ? pickLabel(options, pickResult ?? 0)
    : isScore
    ? `${event.team_home} ${parsedHome} – ${parsedAway} ${event.team_away}`
    : `${parsedHome} ${event.unit}`

  return (
    <Modal open={open} onClose={onClose} title="Enter actual result">
      <div className="space-y-5">
        {/* Event info */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm">
          <p className="font-medium text-slate-200">{event.event_name}</p>
          {isScore ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {event.team_home} vs {event.team_away}
            </p>
          ) : isPick ? (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{options.join(' · ')}</p>
          ) : null}
        </div>

        {/* Result input */}
        {isPick ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Who won?</p>
            {options.length < 2 ? (
              <p className="text-sm text-rose-400">This market is misconfigured — no options to pick from.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {options.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setPickResult(i + 1); setConfirmed(false) }}
                    className={`w-full rounded-xl py-3 px-3 text-base font-bold border transition-colors truncate ${
                      pickResult === i + 1
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
            <p className="text-sm font-medium text-slate-300 mb-2">Actual final score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_home}</p>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={homeResult}
                  onChange={(e) => { setHomeResult(e.target.value); setConfirmed(false) }}
                  autoFocus
                  className="w-full rounded-xl border border-casino-line bg-casino-elevated px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
              <span className="text-2xl font-black text-slate-600 mt-5">–</span>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1 text-center">{event.team_away}</p>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={awayResult}
                  onChange={(e) => { setAwayResult(e.target.value); setConfirmed(false) }}
                  className="w-full rounded-xl border border-casino-line bg-casino-elevated px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Actual result ({event.unit})
            </label>
            <input
              type="number"
              placeholder="e.g. 3"
              value={homeResult}
              onChange={(e) => { setHomeResult(e.target.value); setConfirmed(false) }}
              step="1"
              autoFocus
              className="w-full rounded-xl border border-casino-line bg-casino-elevated px-4 py-2.5 text-base text-white placeholder:text-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>
        )}

        {/* Live calculator */}
        {preview && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
              Auto-calculated payouts
            </p>
            <div className="rounded-xl border border-casino-hairline bg-casino-chip overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-casino-hairline">
                    <th className="text-left px-3 py-2 text-xs text-slate-600 font-medium">Player</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-600 font-medium">Predicted</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-600 font-medium">
                      {isPick ? 'Result' : 'Off by'}
                    </th>
                    <th className="text-right px-3 py-2 text-xs text-slate-600 font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={row.id} className={i < preview.length - 1 ? 'border-b border-casino-elevated' : ''}>
                      <td className="px-3 py-2 font-medium text-slate-300">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {i === 1 && preview.length > 1 && <span className="mr-1">🥈</span>}
                        {i === 2 && preview.length > 2 && <span className="mr-1">🥉</span>}
                        {row.profiles.display_name || row.profiles.username}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">
                        {isPick
                          ? pickLabel(options, row.prediction)
                          : isScore
                          ? `${row.prediction}–${row.prediction_away ?? 0}`
                          : row.prediction
                        }
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {isPick ? (
                          row.distance === 0
                            ? <span className="text-emerald-400 font-bold">✓ Correct</span>
                            : <span className="text-slate-600">✗ Wrong</span>
                        ) : row.distance === 0 ? (
                          <span className="text-emerald-400 font-bold">Exact!</span>
                        ) : (
                          <span className="text-slate-500">+{row.distance}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-orange-400">
                        {row.payout} Ŧ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600">Total pool: {bets.reduce((s, b) => s + b.amount, 0)} Ŧ</p>
          </div>
        )}

        {bets.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-2">No bets placed on this event.</p>
        )}

        {/* Confirm step */}
        {inputValid && !confirmed && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
            <p className="text-amber-300 font-medium">
              Confirm: the actual result was <span className="text-orange-400 font-bold">{resultLabel}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500">This will distribute payouts to all players and cannot be undone.</p>
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
          disabled={!inputValid || !confirmed}
        >
          Settle & pay out
        </Button>
      </div>
    </Modal>
  )
}
