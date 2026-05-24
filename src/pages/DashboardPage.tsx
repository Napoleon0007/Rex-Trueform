import { useState, useMemo } from 'react'
import { useEvents } from '../hooks/useEvents'
import { useAuthStore } from '../store/authStore'
import { SPORT_CATEGORIES } from '../lib/categories'
import EventList from '../components/events/EventList'

type StatusFilter = 'all' | 'open' | 'ending' | 'settled'
type SortOption  = 'ending' | 'newest' | 'tokens'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',     label: 'All'         },
  { key: 'open',    label: 'Open'        },
  { key: 'ending',  label: 'Ending Soon' },
  { key: 'settled', label: 'Settled'     },
]

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'ending', label: 'Ending Soon' },
  { key: 'newest', label: 'Newest'      },
  { key: 'tokens', label: 'Most Tokens' },
]

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { data: allEvents = [], isLoading } = useEvents()

  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState<StatusFilter>('all')
  const [category, setCategory] = useState('All')
  const [sort,     setSort]     = useState<SortOption>('ending')

  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000

  const filtered = useMemo(() => {
    return allEvents
      .filter((e) => {
        if (category !== 'All') return e.category === category
        return true
      })
      .filter((e) => {
        const closing = new Date(e.closing_time).getTime()
        if (status === 'open')    return e.status === 'open' && closing > now
        if (status === 'ending')  return e.status === 'open' && closing > now && closing <= now + sixHours
        if (status === 'settled') return e.status === 'settled'
        return true
      })
      .filter((e) =>
        !search || e.event_name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        if (sort === 'ending') return new Date(a.closing_time).getTime() - new Date(b.closing_time).getTime()
        if (sort === 'tokens') return (b.total_tokens_bet ?? 0) - (a.total_tokens_bet ?? 0)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [allEvents, category, status, search, sort, now, sixHours])

  return (
    <div className="space-y-5">
      {/* Maradona background video */}
      <video
        src="/maradona.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }}
      />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: -1 }} />
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">
            Hey, <span className="text-orange-500">{profile?.display_name ?? 'Player'}</span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Place your predictions before time runs out.</p>
        </div>
      </div>

      {/* Search + sort row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#222] bg-[#111] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-colors"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-[#222] bg-[#111] px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500/50 focus:outline-none transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              status === tab.key
                ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                : 'border-[#222] bg-[#111] text-slate-500 hover:text-slate-300 hover:border-[#333]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button
          onClick={() => setCategory('All')}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            category === 'All'
              ? 'border-orange-500 bg-orange-500/15 text-orange-400'
              : 'border-[#222] bg-[#111] text-slate-500 hover:text-slate-300'
          }`}
        >
          🎯 All
        </button>
        {SPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setCategory(cat.label)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              category === cat.label
                ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                : 'border-[#222] bg-[#111] text-slate-500 hover:text-slate-300'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-slate-600">
          {filtered.length} market{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      <EventList events={filtered} isLoading={isLoading} />
    </div>
  )
}
