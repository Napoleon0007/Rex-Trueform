import { useAuthStore } from '../../store/authStore'
import { useEventBets } from '../../hooks/useBets'
import Confetti from './Confetti'
import Card from '../ui/Card'
import type { EventWithResult } from '../../types/database'

interface ResultsScreenProps {
  event: EventWithResult
}

function rankLabel(i: number) {
  return ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`
}

export default function ResultsScreen({ event }: ResultsScreenProps) {
  const { user } = useAuthStore()
  const { data: bets, isLoading } = useEventBets(event.id)

  // Sort by payout descending (already ordered by DB, but client-side fallback)
  const sorted = [...(bets ?? [])].sort((a, b) => (b.payout ?? 0) - (a.payout ?? 0))

  const userBet = sorted.find((b) => b.user_id === user?.id)
  const userWon = userBet != null && (userBet.payout ?? 0) > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <Confetti trigger={userWon} />

      {/* Result hero */}
      <Card highlight className="text-center space-y-1 py-6">
        <p className="text-sm uppercase tracking-widest text-orange-500/70">Actual result</p>
        <p className="text-6xl font-black text-orange-400">{event.actual_result}</p>
        <p className="text-lg text-slate-400">{event.unit}</p>
      </Card>

      {/* Your outcome */}
      {userBet && (
        <Card className={userWon ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Your result</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200">
                You predicted <span className="text-white font-bold">{userBet.prediction}</span>
                <span className="text-slate-400"> ({Math.abs(userBet.prediction - event.actual_result!)} off)</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Wagered {userBet.amount} tokens</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${userWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Math.round(userBet.payout ?? 0)} 🪙
              </p>
              <p className={`text-xs font-semibold ${userWon ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(userBet.payout ?? 0) >= userBet.amount ? '▲' : '▼'}
                {' '}{Math.abs(Math.round((userBet.payout ?? 0) - userBet.amount))} tokens
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* All bets ranking */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">All predictions</h3>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
          </div>
        )}

        {sorted.map((bet, i) => {
          const isMe = bet.user_id === user?.id
          const distance = Math.abs(bet.prediction - event.actual_result!)
          const payout = Math.round(bet.payout ?? 0)

          return (
            <div
              key={bet.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                isMe ? 'border border-orange-500/20 bg-orange-500/5' : 'border border-white/5 bg-white/3'
              }`}
            >
              <span className="w-7 text-center text-lg">{rankLabel(i)}</span>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-100 truncate">
                  {bet.profiles.display_name}
                  {isMe && <span className="ml-1.5 text-xs text-orange-500">you</span>}
                </p>
                <p className="text-xs text-slate-500">
                  Predicted <span className="text-slate-300">{bet.prediction}</span>
                  <span className="mx-1">·</span>
                  {distance === 0
                    ? <span className="text-emerald-400">Exact! 🎯</span>
                    : <span>off by {distance}</span>
                  }
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${payout > bet.amount ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {payout} 🪙
                </p>
                <p className="text-xs text-slate-600">of {bet.amount} bet</p>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
