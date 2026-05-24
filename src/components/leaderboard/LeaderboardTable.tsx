import { useAuthStore } from '../../store/authStore'
import type { LeaderboardEntry, YearlyLeaderboardEntry } from '../../types/database'

type Entry = LeaderboardEntry | YearlyLeaderboardEntry

interface LeaderboardTableProps {
  entries: Entry[] | undefined
  isLoading: boolean
}

function rankEmoji(rank: number) {
  return ['🥇', '🥈', '🥉'][rank - 1] ?? `${rank}`
}

export default function LeaderboardTable({ entries, isLoading }: LeaderboardTableProps) {
  const { user } = useAuthStore()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
        No results yet — place some bets!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isMe = entry.user_id === user?.id
        const isTop3 = entry.rank <= 3

        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
              isMe
                ? 'border border-orange-500/30 bg-orange-500/8'
                : isTop3
                ? 'border border-white/8 bg-white/4'
                : 'border border-white/4 bg-white/[0.02]'
            }`}
          >
            {/* Rank */}
            <span className={`w-8 text-center text-xl font-black ${isTop3 ? '' : 'text-sm text-slate-500'}`}>
              {rankEmoji(entry.rank)}
            </span>

            {/* Avatar */}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${
              isMe ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {entry.display_name?.[0] ?? '?'}
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-sm text-slate-100">
                {entry.display_name}
                {isMe && <span className="ml-1.5 text-xs text-orange-500">you</span>}
              </p>
              <p className="text-xs text-slate-500">
                {entry.bets_placed} bets · {entry.tokens_wagered} wagered
              </p>
            </div>

            {/* Tokens won */}
            <div className="text-right shrink-0">
              <p className="font-black text-base text-orange-400">{entry.tokens_won} 🪙</p>
              <p className="text-xs text-slate-600">won</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
