import { useState, useMemo, useRef, useEffect } from 'react'
import { useEvents } from '../hooks/useEvents'
import { useAuthStore } from '../store/authStore'
import { SPORT_CATEGORIES } from '../lib/categories'
import EventList from '../components/events/EventList'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { data: allEvents = [], isLoading, isError, refetch } = useEvents()

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [catOpen,  setCatOpen]  = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!catOpen) return
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catOpen])

  // Ticking clock so "ending soon" / time-left labels stay live without a refetch.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // The big welcome only shows on a player's first day. After that it's a casual
  // returning greeting — we remember the first-seen date in localStorage so the
  // welcome never comes back once that first day has passed. (null = not yet
  // determined, so we render nothing rather than flash the wrong line.)
  const [firstDay, setFirstDay] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      let firstSeen = localStorage.getItem('rex_first_seen')
      if (!firstSeen) {
        firstSeen = today
        localStorage.setItem('rex_first_seen', today)
      }
      setFirstDay(firstSeen === today)
    } catch {
      setFirstDay(false)
    }
  }, [])
  const filtered = useMemo(() => {
    return allEvents
      .filter((e) => {
        if (category !== 'All') return e.category === category
        return true
      })
      .filter((e) =>
        !search || e.event_name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        // Live markets first, the one with the LEAST time left to bet on top;
        // closed/settled sink below, most recently closed first.
        const aLive = a.status === 'open' && new Date(a.closing_time).getTime() > now
        const bLive = b.status === 'open' && new Date(b.closing_time).getTime() > now
        if (aLive !== bLive) return aLive ? -1 : 1
        const aT = new Date(a.closing_time).getTime()
        const bT = new Date(b.closing_time).getTime()
        return aLive ? aT - bT : bT - aT
      })
  }, [allEvents, category, search, now])

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-black text-white">
            Hey, <span className="text-orange-500">{profile?.display_name ?? 'Player'}</span>
          </h1>
          {firstDay !== null && (
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {firstDay ? (
                <>
                  Welcome to <span className="font-bold text-white">Rex Casino</span> — a place where we gamble like men.{' '}
                  <span className="font-semibold text-orange-400">Welcome to the skulls.</span>
                </>
              ) : (
                <>What are we betting on today? <span className="font-semibold text-orange-400">🎲</span></>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative w-1/2 md:w-48">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-casino-border bg-casino-card pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Category picker */}
      <div ref={catRef} className="relative">
        <button
          onClick={() => setCatOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
            category !== 'All'
              ? 'border-orange-500 bg-orange-500/15 text-orange-400'
              : 'border-casino-border bg-casino-card text-slate-400 hover:text-slate-200 hover:border-casino-line'
          }`}
        >
          <span>
            {category === 'All'
              ? '🎯 All Sports'
              : `${SPORT_CATEGORIES.find(c => c.label === category)?.emoji} ${category}`}
          </span>
          <span className={`text-xs transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {catOpen && (
          <div className="absolute left-0 top-full mt-2 z-30 flex gap-2 overflow-x-auto hide-scrollbar pb-1 pr-4"
            style={{ maxWidth: 'calc(100vw - 2rem)' }}>
            <button
              onClick={() => { setCategory('All'); setCatOpen(false) }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                category === 'All'
                  ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                  : 'border-casino-border bg-casino-chip text-slate-500 hover:text-slate-300'
              }`}
            >
              🎯 All
            </button>
            {SPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => { setCategory(cat.label); setCatOpen(false) }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  category === cat.label
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                    : 'border-casino-border bg-casino-chip text-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && !isError && (
        <p className="text-xs text-slate-600">
          {filtered.length} market{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      <EventList events={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />
    </div>
  )
}
