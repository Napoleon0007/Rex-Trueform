import { useMonthlyLeaderboard } from '../../hooks/useLeaderboard'
import { useAuthStore } from '../../store/authStore'
import type { LeaderboardEntry } from '../../types/database'
import Avatar from '../ui/Avatar'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function net(e: LeaderboardEntry) {
  return e.tokens_won - e.tokens_wagered
}

interface BoardRowProps {
  place: string
  name: string
  avatarUrl: string | null
  meta: string
  value: string
  isMe: boolean
  tone: 'gold' | 'shame'
}

function BoardRow({ place, name, avatarUrl, meta, value, isMe, tone }: BoardRowProps) {
  const accent = tone === 'gold' ? 'text-amber-300' : 'text-rose-300'
  const ring = tone === 'gold' ? 'ring-amber-300/70' : 'ring-rose-300/70'
  return (
    <div className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 ${isMe ? 'ring-1 ring-inset ' + (tone === 'gold' ? 'ring-amber-300/60 bg-amber-300/10' : 'ring-rose-300/50 bg-rose-300/10') : ''}`}>
      <span className="w-5 text-center text-base font-black leading-none">{place}</span>
      <Avatar url={avatarUrl} name={name} size={30} className={`ring-2 ${ring}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-amber-50">
          {name}{isMe && <span className={`ml-1 text-[10px] ${accent}`}>you</span>}
        </p>
        <p className="truncate text-[10px] text-amber-100/40">{meta}</p>
      </div>
      <span className={`shrink-0 font-mono text-sm font-black ${accent}`}>{value}</span>
    </div>
  )
}

function EmptyBoard({ tone }: { tone: 'gold' | 'shame' }) {
  return (
    <p className="px-2 py-6 text-center text-[11px] text-amber-100/40">
      {tone === 'gold' ? 'No legends yet — go win something.' : 'Nobody’s disgraced themselves… yet.'}
    </p>
  )
}

export default function TrophyWall() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { user } = useAuthStore()
  const { data: entries = [], isLoading } = useMonthlyLeaderboard(year, month)

  const fame = [...entries].sort((a, b) => b.tokens_won - a.tokens_won).slice(0, 5)
  const shame = [...entries].sort((a, b) => net(a) - net(b)).filter((e) => net(e) < 0).slice(0, 5)
  const donkey = shame[0]

  return (
    <section className="relative mt-12">
      <div
        className="stage-3d relative overflow-hidden rounded-2xl border border-amber-900/50"
        style={{ height: 'clamp(440px, 64vw, 560px)' }}
      >
        {/* recessed back wall */}
        <div
          className="lounge-wall pointer-events-none absolute inset-0"
          style={{ transform: 'translateZ(-110px) scale(1.18)', transformOrigin: 'center top' }}
        />

        {/* hanging banner */}
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-4" style={{ transform: 'translateZ(60px)' }}>
          <div className="rounded-b-xl border border-amber-400/50 bg-gradient-to-b from-emerald-950 to-[#0c150e] px-5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.6)]">
            <p className="text-center text-[9px] font-black uppercase tracking-[0.35em] text-amber-400/80">The Boys' Quarters</p>
            <h3 className="text-center text-lg font-black uppercase tracking-tight text-amber-50" style={{ textShadow: '0 0 18px rgba(245,200,80,0.5)' }}>
              The Wall · {MONTHS[month - 1]} {year}
            </h3>
          </div>
        </div>

        {/* the two mounted plaques */}
        <div className="absolute inset-x-0 bottom-0 top-[88px] z-10 grid grid-cols-1 gap-4 px-4 pb-5 sm:grid-cols-2 sm:gap-6 sm:px-8">
          {/* ---------- HALL OF FAME ---------- */}
          <div className="relative flex" style={{ transform: 'translateZ(30px) rotateY(5deg)', transformOrigin: 'left center' }}>
            <div className="picture-light pointer-events-none absolute -top-6 left-1/2 h-28 w-40 -translate-x-1/2" />
            <div className="frame-gold w-full rounded-lg p-2 sm:p-2.5">
              <div className="rounded-md bg-gradient-to-b from-[#11160f] to-[#0a0d08] p-3">
                <div className="brass-plate mx-auto mb-2.5 w-fit rounded px-3 py-0.5 text-center text-[11px] font-black uppercase tracking-[0.2em]">
                  🏆 Hall of Fame
                </div>
                {isLoading ? (
                  <div className="space-y-2 py-2">{[0, 1, 2].map((i) => <div key={i} className="h-7 animate-pulse rounded bg-amber-200/5" />)}</div>
                ) : fame.length === 0 ? (
                  <EmptyBoard tone="gold" />
                ) : (
                  <div className="space-y-0.5">
                    {fame.map((e, i) => (
                      <BoardRow
                        key={e.user_id}
                        place={['🥇', '🥈', '🥉'][i] ?? `${i + 1}`}
                        name={e.display_name}
                        avatarUrl={e.avatar_url}
                        meta={`${e.bets_placed} bets · ${e.tokens_wagered} wagered`}
                        value={`+${e.tokens_won}`}
                        isMe={e.user_id === user?.id}
                        tone="gold"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------- WALL OF SHAME ---------- */}
          <div className="relative flex" style={{ transform: 'translateZ(30px) rotateY(-5deg)', transformOrigin: 'right center' }}>
            <div className="picture-light pointer-events-none absolute -top-6 left-1/2 h-28 w-40 -translate-x-1/2 opacity-70" />
            <div className="frame-shame w-full rounded-lg p-2 sm:p-2.5">
              <div className="rounded-md bg-gradient-to-b from-[#160d0d] to-[#0a0606] p-3">
                <div className="mx-auto mb-2.5 w-fit rounded bg-gradient-to-b from-rose-300 to-rose-700 px-3 py-0.5 text-center text-[11px] font-black uppercase tracking-[0.2em] text-rose-950">
                  🫏 Wall of Shame
                </div>
                {donkey && (
                  <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-rose-300/90">
                    Donkey of the Month: {donkey.display_name}
                  </p>
                )}
                {isLoading ? (
                  <div className="space-y-2 py-2">{[0, 1, 2].map((i) => <div key={i} className="h-7 animate-pulse rounded bg-rose-200/5" />)}</div>
                ) : shame.length === 0 ? (
                  <EmptyBoard tone="shame" />
                ) : (
                  <div className="space-y-0.5">
                    {shame.map((e, i) => (
                      <BoardRow
                        key={e.user_id}
                        place={i === 0 ? '🫏' : `${i + 1}`}
                        name={e.display_name}
                        avatarUrl={e.avatar_url}
                        meta={`${e.bets_placed} bets · ${e.tokens_wagered} wagered`}
                        value={`${net(e)}`}
                        isMe={e.user_id === user?.id}
                        tone="shame"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
