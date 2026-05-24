import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useSettleEvent } from '../../hooks/useEvents'
import { useEventBets } from '../../hooks/useBets'
import { winnerLabel } from '../../lib/utils'
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

function calcPayouts(
  bets: BetRow[],
  actualHome: number,
  actualAway: number | null,
  eventType: 'numeric' | 'score' | 'winner',
) {
  const totalBet = bets.reduce((s, b) => s + b.amount, 0)

  if (eventType === 'winner') {
    const correctTotal = bets
      .filter((b) => b.prediction === actualHome)
      .reduce((s, b) => s + b.amount, 0)
    const nobodyRight = correctTotal === 0

    return bets
      .map((b) => {
        const correct = b.prediction === actualHome
        const payout = nobodyRight
          ? b.amount
          : correct
          ? Math.round((b.amount / correctTotal) * totalBet)
          : 0
        return { ...b, distance: correct ? 0 : 1, score: correct ? b.amount : 0, payout }
      })
      .sort((a, b) => b.payout - a.payout)
  }

  const withScores = bets.map((b) => {
    const distance =
      eventType === 'score'
        ? Math.abs(b.prediction - actualHome) + Math.abs((b.prediction_away ?? 0) - (actualAway ?? 0))
        : Math.abs(b.prediction - actualHome)
    const score = b.amount * (1 / (distance + 1))
    return { ...b, distance, score, payout: 0 }
  })

  const totalScore = withScores.reduce((s, b) => s + b.score, 0)

  return withScores
    .map((b) => ({
      ...b,
      payout: totalScore > 0 ? Math.round((b.score / totalScore) * totalBet) : 0,
    }))
    .sort((a, b) => b.payout - a.payout)
}

export default function SettleModal({ event, open, onClose }: SettleModalProps) {
  const settleEvent = useSettleEvent()
  const { data: bets = [] } = useEventBets(event.id)
  const isScore  = event.event_type === 'score'
  const isWinner = event.event_type === 'winner'

  const [homeResult, setHomeResult] = useState('')
  const [awayResult, setAwayResult] = useState('')
  const [winnerResult, setWinnerResult] = useState<1 | 2 | 3 | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const parsedHome = parseInt(homeResult, 10)
  const parsedAway = parseInt(awayResult, 10)
  const homeValid  = !isNaN(parsedHome) && parsedHome >= 0
  const awayValid  = !isNaN(parsedAway) && parsedAway >= 0

  const inputValid = isWinner
    ? winnerResult !== null
    : isScore
    ? homeValid && awayValid
    : homeValid

  const actualForCalc = isWinner ? (winnerResult ?? 0) : parsedHome

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
        actualResult: isWinner ? (winnerResult as number) : parsedHome,
        ...(isScore ? { actualAway: parsedAway } : {}),
      })
      onClose()
      setHomeResult('')
      setAwayResult('')
      setWinnerResult(null)
      setConfirmed(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to settle event')
    }
  }

  const resultLabel = isWinner
    ? winnerLabel(winnerResult ?? 0, event.team_home, event.team_away)
    : isScore
    ? `${event.team_home} ${parsedHome} – ${parsedAway} ${event.team_away}`
    : `${parsedHome} ${event.unit}`

  const WINNER_OPTIONS: { pick: 1 | 2 | 3; label: string }[] = [
    { pick: 1, label: event.team_home ?? 'Home' },
    { pick: 2, label: 'Draw' },
    { pick: 3, label: event.team_away ?? 'Away' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Enter actual result">
      <div className="space-y-5">
        {/* Event info */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm">
          <p className="font-medium text-slate-200">{event.event_name}</p>
          {(isScore || isWinner) && (
            <p className="mt-0.5 text-xs text-slate-500">
              {event.team_home} vs {event.team_away}
            </p>
          )}
        </div>

        {/* Result input */}
        {isWinner ? (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Who won?</p>
            <div className="flex flex-col gap-2">
              {WINNER_OPTIONS.map(({ pick, label }) => (
                <button
                  key={pick}
                  type="button"
                  onClick={() => { setWinnerResult(pick); setConfirmed(false) }}
                  className={`w-full rounded-xl py-3 text-base font-bold border transition-colors ${
                    winnerResult === pick
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
                  value={awayResult}
                  onChange={(e) => { setAwayResult(e.target.value); setConfirmed(false) }}
                  className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-center text-2xl font-bold text-orange-400 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
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
              className="w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-base text-white placeholder:text-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>
        )}

        {/* Live calculator */}
        {preview && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
              Auto-calculated payouts
            </p>
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    <th className="text-left px-3 py-2 text-xs text-slate-600 font-medium">Player</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-600 font-medium">Predicted</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-600 font-medium">
                      {isWinner ? 'Result' : 'Off by'}
                    </th>
                    <th className="text-right px-3 py-2 text-xs text-slate-600 font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={row.id} className={i < preview.length - 1 ? 'border-b border-[#1a1a1a]' : ''}>
                      <td className="px-3 py-2 font-medium text-slate-300">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {i === 1 && preview.length > 1 && <span className="mr-1">🥈</span>}
                        {i === 2 && preview.length > 2 && <span className="mr-1">🥉</span>}
                        {row.profiles.display_name || row.profiles.username}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400">
                        {isWinner
                          ? winnerLabel(row.prediction, event.team_home, event.team_away)
                          : isScore
                          ? `${row.prediction}–${row.prediction_away ?? 0}`
                          : row.prediction
                        }
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {isWinner ? (
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
                        {row.payout} 🪙
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600">Total pool: {bets.reduce((s, b) => s + b.amount, 0)} 🪙</p>
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
