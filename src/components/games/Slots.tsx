import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { toast } from '../../store/toastStore'
import { sfx } from '../../lib/sfx'
import { useKidsWarning, KidsAtHomeModal } from './KidsWarning'

// Three-reel one-armed bandit. Reels are uniform over six symbols; a line of
// three pays the table below, any matching pair returns your stake, anything
// else loses. RTP works out to ~90% (a healthy house edge that keeps the shared
// token pool from inflating).
const SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']
const THREE: Record<string, number> = { '7️⃣': 50, '💎': 25, '⭐': 12, '🔔': 8, '🍋': 5, '🍒': 4 }
const PAYTABLE: { sym: string; mult: number }[] = [
  { sym: '7️⃣', mult: 50 }, { sym: '💎', mult: 25 }, { sym: '⭐', mult: 12 },
  { sym: '🔔', mult: 8 }, { sym: '🍋', mult: 5 }, { sym: '🍒', mult: 4 },
]
const CHIPS = [2, 5, 10, 25, 50, 100]
const rand = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]

function evaluate(r: string[]): { mult: number; label: string } {
  if (r[0] === r[1] && r[1] === r[2]) return { mult: THREE[r[0]] ?? 0, label: `Three ${r[0]} — jackpot!` }
  if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) return { mult: 1, label: 'Matching pair — stake back.' }
  return { mult: 0, label: 'No line — house wins.' }
}

export default function Slots() {
  const wallet = useWallet()
  const kids = useKidsWarning()
  const [stake, setStake] = useState(5)
  const [reels, setReels] = useState(['🍒', '🔔', '💎'])
  const [spinning, setSpinning] = useState(false)
  const [msg, setMsg] = useState('Set your stake and pull.')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    if (ticker.current) clearInterval(ticker.current)
  }, [])

  function pickStake(c: number) { sfx.clink(); kids.check(c); setStake(c) }

  function finish(final: string[]) {
    setReels(final)
    setSpinning(false)
    const { mult, label } = evaluate(final)
    const winnings = mult * stake
    if (winnings > 0) wallet.payout(winnings, 'slots')
    if (mult > 1) { sfx.win(); setMsg(`${label} +${winnings} ₿ 🎉`) }
    else if (mult === 1) setMsg(label)
    else { sfx.lose(); setMsg(label) }
  }

  function pull() {
    if (spinning) return
    if (!wallet.canBet(stake)) { toast.error('Not enough Bitcoin'); return }
    wallet.bet(stake, 'slots')
    setSpinning(true)
    setMsg('Spinning…')

    const final = [rand(), rand(), rand()]
    const stopped = { count: 0 }
    ticker.current = setInterval(() => {
      setReels((prev) => prev.map((_, i) => (i < stopped.count ? final[i] : rand())))
    }, 80)

    ;[600, 950, 1300].forEach((t, i) => {
      const to = setTimeout(() => {
        stopped.count = i + 1
        sfx.clink()
        if (i === 2) {
          if (ticker.current) clearInterval(ticker.current)
          finish(final)
        }
      }, t)
      timers.current.push(to)
    })
  }

  return (
    <div className="space-y-5 text-center">
      <KidsAtHomeModal open={kids.open} onClose={kids.close} />

      {/* Cabinet */}
      <div className="mx-auto max-w-xs rounded-3xl border-4 border-amber-500/70 bg-gradient-to-b from-[#3a2210] to-[#1a0c04] p-4 shadow-2xl shadow-black/60">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-amber-300" style={{ textShadow: '0 0 14px rgba(245,200,80,0.8)' }}>
          ★ Lucky Springbok ★
        </p>
        <div className="flex items-stretch justify-center gap-2">
          {reels.map((s, i) => (
            <div key={i}
              className={`flex h-24 w-20 items-center justify-center rounded-xl border-2 border-amber-700/50 bg-[#fbfaf5] text-5xl shadow-inner ${spinning ? 'blur-[1px]' : ''}`}
              style={{ transition: 'filter 0.2s' }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold text-amber-100">{msg}</p>

      {/* Stake chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => pickStake(c)} disabled={spinning}
            className={`h-9 w-9 rounded-full border-2 text-xs font-black transition disabled:opacity-40 ${stake === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
        ))}
      </div>

      <button onClick={pull} disabled={spinning}
        className="rounded-full bg-amber-500 px-10 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 transition hover:bg-amber-400 active:scale-95 disabled:opacity-60">
        {spinning ? 'Spinning…' : `Pull · ${stake} ₿`}
      </button>

      {/* Paytable */}
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-1.5 text-[11px]">
        {PAYTABLE.map((p) => (
          <div key={p.sym} className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 font-bold text-amber-200/80">
            <span className="text-base">{p.sym}{p.sym}{p.sym}</span>
            <span className="text-amber-400">{p.mult}×</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-amber-200/50">Any matching pair returns your stake.</p>
    </div>
  )
}
