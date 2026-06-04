import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useProfileStats } from '../../hooks/useProfileStats'
import { getActiveMinutes } from '../../lib/timeTracker'
import Avatar from '../ui/Avatar'

function Stat({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'gold' | 'shame' }) {
  const color = tone === 'gold' ? 'text-amber-300' : tone === 'shame' ? 'text-rose-300' : 'text-white'
  return (
    <div className="rounded-xl border border-casino-border bg-casino-elevated px-2 py-2 text-center">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

export default function ProfileMenu() {
  const { user, profile, clear } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: balance = 0 } = useTokenBalance(user?.id)
  const { data: stats } = useProfileStats(user?.id)
  const [minutes, setMinutes] = useState(0)

  useEffect(() => {
    if (!open) return
    setMinutes(getActiveMinutes())
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function logout() {
    await supabase.auth.signOut()
    clear()
    navigate('/auth')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Your profile"
        className="rounded-full ring-2 ring-casino-line transition hover:ring-orange-500/60"
      >
        <Avatar url={profile?.avatar_url} name={profile?.display_name} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 animate-slide-up rounded-2xl border border-casino-line bg-casino-card p-4 shadow-2xl shadow-black/70">
          {/* identity */}
          <div className="mb-3 flex items-center gap-3">
            <Avatar url={profile?.avatar_url} name={profile?.display_name} size={46} className="ring-2 ring-orange-500/40" />
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white">{profile?.display_name ?? 'Player'}</p>
              <p className="text-xs font-bold text-orange-400">{balance} 🪙 this month</p>
            </div>
          </div>

          {/* lifetime stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Received" value={stats?.received ?? 0} />
            <Stat label="Used" value={stats?.spent ?? 0} />
            <Stat label="Games won" value={stats?.gamesWon ?? 0} />
            <Stat label="🏆 Fame" value={stats?.fame ?? 0} tone="gold" />
            <Stat label="🫏 Shame" value={stats?.shame ?? 0} tone="shame" />
            <Stat label="Minutes" value={minutes} />
          </div>

          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-casino-line bg-casino-elevated py-2 text-sm font-semibold text-slate-400 transition hover:border-rose-500/50 hover:text-white"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
