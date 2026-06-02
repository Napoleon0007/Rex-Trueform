import { useRef, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { toast } from '../../store/toastStore'

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const isRed = (n: number) => RED.has(n)
const STEP = 360 / 37
const CHIPS = [2, 5, 10, 25]

type Phase = 'bet' | 'spinning' | 'done'

// Outside bets and their payout multiplier (returned per token staked, incl. stake).
const OUTSIDE: { key: string; label: string; mult: number; hit: (n: number) => boolean }[] = [
  { key: 'red',   label: 'Red',    mult: 2, hit: (n) => isRed(n) },
  { key: 'black', label: 'Black',  mult: 2, hit: (n) => n !== 0 && !isRed(n) },
  { key: 'even',  label: 'Even',   mult: 2, hit: (n) => n !== 0 && n % 2 === 0 },
  { key: 'odd',   label: 'Odd',    mult: 2, hit: (n) => n % 2 === 1 },
  { key: 'low',   label: '1–18',   mult: 2, hit: (n) => n >= 1 && n <= 18 },
  { key: 'high',  label: '19–36',  mult: 2, hit: (n) => n >= 19 && n <= 36 },
  { key: 'd1',    label: '1st 12',  mult: 3, hit: (n) => n >= 1 && n <= 12 },
  { key: 'd2',    label: '2nd 12',  mult: 3, hit: (n) => n >= 13 && n <= 24 },
  { key: 'd3',    label: '3rd 12',  mult: 3, hit: (n) => n >= 25 && n <= 36 },
]

export default function Roulette() {
  const wallet = useWallet()
  const [chip, setChip] = useState(5)
  const [bets, setBets] = useState<Record<string, number>>({})
  const [phase, setPhase] = useState<Phase>('bet')
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [msg, setMsg] = useState('Place your chips, then spin.')
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = Object.values(bets).reduce((s, n) => s + n, 0)

  function place(key: string) {
    if (phase !== 'bet') return
    if (!wallet.canBet(total + chip)) { toast.error('Not enough tokens'); return }
    setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + chip }))
  }
  function clearBets() { if (phase === 'bet') setBets({}) }

  function spin() {
    if (total === 0) { toast.error('Place a bet first'); return }
    if (!wallet.canBet(total)) { toast.error('Not enough tokens'); return }
    wallet.bet(total)
    const n = Math.floor(Math.random() * 37)
    setResult(n)
    setPhase('spinning')
    setMsg('No more bets…')
    // land pocket n under the top pointer, plus a few full turns
    setRotation((r) => {
      const base = Math.ceil(r / 360) * 360
      return base + 360 * 5 - n * STEP
    })
    spinTimer.current = setTimeout(() => settle(n), 3400)
  }

  function settle(n: number) {
    let win = 0
    for (const [key, amt] of Object.entries(bets)) {
      if (key.startsWith('n')) {
        if (Number(key.slice(1)) === n) win += amt * 36
      } else {
        const o = OUTSIDE.find((x) => x.key === key)
        if (o && o.hit(n)) win += amt * o.mult
      }
    }
    if (win > 0) { wallet.payout(win); setMsg(`${n} ${n === 0 ? '🟢' : isRed(n) ? '🔴' : '⚫'} — you win ${win} 🪙! 🎉`) }
    else setMsg(`${n} ${n === 0 ? '🟢' : isRed(n) ? '🔴' : '⚫'} — house takes it.`)
    setPhase('done')
  }

  function clear() { setBets({}); setResult(null); setPhase('bet'); setMsg('Place your chips, then spin.') }

  return (
    <div className="space-y-4">
      {/* Wheel */}
      <div className="relative mx-auto h-52 w-52">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-amber-300" style={{ fontSize: 18 }}>▼</div>
        <svg viewBox="0 0 200 200" className="h-full w-full" style={{ transform: `rotate(${rotation}deg)`, transition: phase === 'spinning' ? 'transform 3.3s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none' }}>
          <circle cx="100" cy="100" r="98" fill="#2a1206" />
          <circle cx="100" cy="100" r="92" fill="#0b3d28" />
          {Array.from({ length: 37 }, (_, n) => {
            const a = (n * STEP - 90) * (Math.PI / 180)
            const x = 100 + Math.cos(a) * 82, y = 100 + Math.sin(a) * 82
            const fill = n === 0 ? '#0f7a3d' : isRed(n) ? '#c0182b' : '#15110c'
            return (
              <g key={n}>
                <circle cx={x} cy={y} r="9.2" fill={fill} stroke="#caa14a" strokeWidth="0.6" />
                <text x={x} y={y} fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle" dominantBaseline="central" transform={`rotate(${n * STEP} ${x} ${y})`}>{n}</text>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="30" fill="#3a2210" stroke="#caa14a" strokeWidth="1.5" />
        </svg>
        {result !== null && phase === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/70 px-3 py-1 text-2xl font-black text-amber-300">{result}</span>
          </div>
        )}
      </div>

      <p className="text-center text-sm font-semibold text-amber-100">{msg}</p>

      {/* Chip selector + total */}
      <div className="flex items-center justify-center gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => setChip(c)} className={`h-9 w-9 rounded-full border-2 text-xs font-black transition ${chip === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
        ))}
        <span className="ml-2 text-xs text-amber-200/70">Staked: {total} 🪙</span>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-[auto_1fr] gap-1">
        <button onClick={() => place('n0')} disabled={phase !== 'bet'} className="relative row-span-1 rounded bg-emerald-700 px-2 text-sm font-bold text-white disabled:opacity-60">
          0{bets.n0 ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-[9px] text-black">{bets.n0}</span> : null}
        </button>
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => place(`n${n}`)} disabled={phase !== 'bet'}
              className={`relative rounded py-1 text-xs font-bold text-white disabled:opacity-60 ${isRed(n) ? 'bg-[#c0182b]' : 'bg-[#15110c]'}`}>
              {n}
              {bets[`n${n}`] ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-[9px] text-black">{bets[`n${n}`]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Outside bets */}
      <div className="grid grid-cols-3 gap-1.5">
        {OUTSIDE.map((o) => (
          <button key={o.key} onClick={() => place(o.key)} disabled={phase !== 'bet'}
            className="relative rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-bold text-slate-200 hover:border-amber-400/50 disabled:opacity-60">
            {o.label}
            {bets[o.key] ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-[9px] text-black">{bets[o.key]}</span> : null}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-2">
        {phase === 'done'
          ? <button onClick={clear} className="rounded-full border-2 border-amber-400 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">New bet</button>
          : <>
              <button onClick={clearBets} disabled={phase !== 'bet'} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-40">Clear</button>
              <button onClick={spin} disabled={phase === 'spinning'} className="rounded-full bg-amber-500 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-emerald-950 hover:bg-amber-400 active:scale-95 disabled:opacity-60">Spin</button>
            </>}
      </div>
    </div>
  )
}
