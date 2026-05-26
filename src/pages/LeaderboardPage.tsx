import { useState } from 'react'
import { useMonthlyLeaderboard, useYearlyLeaderboard } from '../hooks/useLeaderboard'
import LeaderboardTable from '../components/leaderboard/LeaderboardTable'
import { formatMonth } from '../lib/utils'
import { cn } from '../lib/utils'

type Tab = 'monthly' | 'yearly'

export default function LeaderboardPage() {
  const now = new Date()
  const [tab, setTab] = useState<Tab>('monthly')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data: monthly, isLoading: monthlyLoading } = useMonthlyLeaderboard(year, month)
  const { data: yearly, isLoading: yearlyLoading } = useYearlyLeaderboard(year)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    const next = new Date(year, month, 1)
    if (next > now) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Leaderboard 🏆</h1>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-white/8 bg-white/4 p-1 gap-1">
        {(['monthly', 'yearly'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-colors capitalize',
              tab === t
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      {tab === 'monthly' ? (
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-xl p-3 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
            ←
          </button>
          <p className="font-semibold text-slate-200">{formatMonth(year, month)}</p>
          <button
            onClick={nextMonth}
            disabled={new Date(year, month - 1) >= new Date(now.getFullYear(), now.getMonth())}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            →
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button onClick={() => setYear((y) => y - 1)} className="rounded-xl p-3 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
            ←
          </button>
          <p className="font-semibold text-slate-200">{year}</p>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= now.getFullYear()}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Table */}
      {tab === 'monthly'
        ? <LeaderboardTable entries={monthly} isLoading={monthlyLoading} />
        : <LeaderboardTable entries={yearly} isLoading={yearlyLoading} />
      }
    </div>
  )
}
