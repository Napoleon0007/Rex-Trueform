import { useAuthStore } from '../../store/authStore'
import { useCasinoStats } from '../../hooks/useCasinoStats'

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Body of the "Your casino stats" modal — the player's own table record.
export default function CasinoStats() {
  const { user } = useAuthStore()
  const { data, isLoading } = useCasinoStats(user?.id)

  if (isLoading) return <p className="py-6 text-center text-sm text-slate-400">Counting your chips…</p>
  if (!data || data.played === 0)
    return <p className="py-6 text-center text-sm text-slate-400">No casino history yet — go play a hand.</p>

  const up = data.net >= 0
  const cells = [
    { label: 'Hands played', value: data.played.toLocaleString() },
    { label: 'Win rate', value: `${Math.round(data.winRate * 100)}%` },
    { label: 'Biggest win', value: `${data.biggestWin.toLocaleString()} Ŧ` },
    { label: 'Total won', value: `${data.won.toLocaleString()} Ŧ` },
    { label: 'Total wagered', value: `${data.wagered.toLocaleString()} Ŧ` },
    { label: 'Favourite game', value: data.favourite ? titleCase(data.favourite) : '—' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-casino-line bg-black/30 p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">Net at the tables</p>
        <p className={`text-3xl font-black ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? '+' : ''}{data.net.toLocaleString()} Ŧ
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className="mt-0.5 text-base font-bold text-amber-100">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
