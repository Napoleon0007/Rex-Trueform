import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useJuice, BIG_WIN } from '../store/juice'
import { toast } from '../store/toastStore'
import { sfx } from '../lib/sfx'
import { useKidsWarning, KidsAtHomeModal, TABLE_MAX } from '../components/games/KidsWarning'
import { drawHorseNames, SILKS } from '../lib/horseNames'

// ── The Rex Racing Ring ───────────────────────────────────────────────────────
// An arcade chase-cam race: you sit right behind the pack on a turf course that
// recedes to a finish line at the horizon. 8 horses, random names + odds every
// race. Bet a horse to win; payout = stake × odds (odds include the stake, same
// convention as Roulette). Spends/pays the one shared token wallet via useWallet.

const FIELD = 8
const CHIPS = [2, 5, 10, 25, 50, 100]
const BASE_SPEED = 0.082 // laps(progress)/sec at rating 1.0 → ~12–13s a race

type Phase = 'bet' | 'running' | 'done'
type Horse = { id: number; name: string; rating: number; odds: number }
type RaceResult = { win: boolean; amount: number; winnerId: number }

// Build a fresh field: random names, a hidden speed rating, and fair-ish odds
// derived from those ratings (favourites pay less) with a small house edge.
function makeField(): Horse[] {
  const names = drawHorseNames(FIELD)
  const ratings = Array.from({ length: FIELD }, () => 0.84 + Math.random() * 0.32)
  const weights = ratings.map((r) => Math.pow(r, 3))
  const sum = weights.reduce((a, b) => a + b, 0)
  return ratings.map((rating, id) => {
    const prob = weights[id] / sum
    const fair = 1 / prob
    const odds = Math.max(1.5, Math.min(20, Math.round(fair * 0.88 * 10) / 10))
    return { id, name: names[id], rating, odds }
  })
}

// Screen position for a horse at progress p (0 = gate, 1 = finish line).
// Lanes fan out near the camera and converge toward the horizon for depth.
function place(lane: number, p: number) {
  const laneCenter = 50 + (lane - (FIELD - 1) / 2) * (74 / (FIELD - 1))
  const spread = 0.32 + (1 - p) * 0.68
  const x = 50 + (laneCenter - 50) * spread
  const y = 90 - p * 64 // 90% (foreground) → 26% (horizon/finish)
  const scale = 1.2 - p * 0.74
  return { x, y, scale, z: Math.round((1 - p) * 100) }
}

export default function RacesPage() {
  const wallet = useWallet()
  const celebrate = useJuice((s) => s.celebrate)
  const commiserate = useJuice((s) => s.commiserate)
  const kids = useKidsWarning()

  const [horses, setHorses] = useState<Horse[]>(() => makeField())
  const [phase, setPhase] = useState<Phase>('bet')
  const [picked, setPicked] = useState<number | null>(null)
  const [stake, setStake] = useState(0)
  const [chip, setChip] = useState(5)
  const [order, setOrder] = useState<number[]>(() => horses.map((h) => h.id))
  const [result, setResult] = useState<RaceResult | null>(null)
  const [showGo, setShowGo] = useState(false)

  // Animation state lives in refs so the 8 sprites move via direct DOM writes
  // (smooth 60fps) instead of re-rendering React on every frame.
  const progress = useRef<number[]>(new Array(FIELD).fill(0))
  const surge = useRef<number[]>(new Array(FIELD).fill(0))
  const spriteRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)
  const boardTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pickedRef = useRef<number | null>(null)
  const stakeRef = useRef(0)
  const horsesRef = useRef<Horse[]>(horses)
  useEffect(() => { horsesRef.current = horses }, [horses])

  function paint(i: number) {
    const el = spriteRefs.current[i]
    if (!el) return
    const { x, y, scale, z } = place(i, progress.current[i])
    el.style.left = `${x}%`
    el.style.top = `${y}%`
    el.style.transform = `translate(-50%,-100%) scale(${scale})`
    el.style.zIndex = String(z)
  }

  // Reset everyone to the gate whenever a new field is laid out.
  useLayoutEffect(() => {
    progress.current = new Array(FIELD).fill(0)
    surge.current = new Array(FIELD).fill(0)
    for (let i = 0; i < FIELD; i++) paint(i)
    setOrder(horses.map((h) => h.id))
  }, [horses])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (boardTimer.current) clearInterval(boardTimer.current)
  }, [])

  function addChip(value: number) {
    if (phase !== 'bet') return
    if (picked === null) { toast.error('Pick a horse first'); return }
    const next = stake + value
    if (next > TABLE_MAX) { toast.error(`Table max is ${TABLE_MAX} ₿`); return }
    if (!wallet.canBet(next)) { toast.error('Not enough Bitcoin'); return }
    sfx.clink()
    kids.check(next)
    setStake(next)
  }

  function startRace() {
    if (phase !== 'bet') return
    if (picked === null) { toast.error('Pick a horse to back'); return }
    if (stake <= 0) { toast.error('Place a bet first'); return }
    if (!wallet.canBet(stake)) { toast.error('Not enough Bitcoin'); return }

    pickedRef.current = picked
    stakeRef.current = stake
    wallet.bet(stake, 'races')
    sfx.spin()

    setResult(null)
    setPhase('running')
    setShowGo(true)
    setTimeout(() => setShowGo(false), 900)

    lastTs.current = null
    rafRef.current = requestAnimationFrame(tick)
    boardTimer.current = setInterval(() => {
      const ranked = [...Array(FIELD).keys()].sort(
        (a, b) => progress.current[b] - progress.current[a],
      )
      setOrder(ranked)
    }, 140)
  }

  function tick(ts: number) {
    if (lastTs.current === null) lastTs.current = ts
    const dt = Math.min((ts - lastTs.current) / 1000, 0.05)
    lastTs.current = ts

    let leaderP = 0
    for (let i = 0; i < FIELD; i++) {
      if (progress.current[i] >= 1) { leaderP = Math.max(leaderP, 1); continue }
      surge.current[i] = surge.current[i] * 0.9 + (Math.random() - 0.5) * 0.07
      surge.current[i] = Math.max(-0.18, Math.min(0.18, surge.current[i]))
      const speed = BASE_SPEED * (horsesRef.current[i].rating + surge.current[i])
      progress.current[i] = Math.min(1, progress.current[i] + speed * dt)
      paint(i)
      leaderP = Math.max(leaderP, progress.current[i])
    }

    if (leaderP >= 1) { finish(); return }
    rafRef.current = requestAnimationFrame(tick)
  }

  function finish() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (boardTimer.current) clearInterval(boardTimer.current)
    rafRef.current = null
    boardTimer.current = null

    const ranked = [...Array(FIELD).keys()].sort(
      (a, b) => progress.current[b] - progress.current[a],
    )
    setOrder(ranked)
    const winnerId = ranked[0]

    const myId = pickedRef.current
    const myStake = stakeRef.current
    if (myId === winnerId) {
      const win = Math.round(myStake * horsesRef.current[winnerId].odds)
      wallet.payout(win, 'races')
      win >= BIG_WIN ? sfx.jackpot() : sfx.win()
      celebrate(win)
      setResult({ win: true, amount: win, winnerId })
    } else {
      sfx.lose()
      commiserate()
      setResult({ win: false, amount: 0, winnerId })
    }
    setPhase('done')
  }

  function nextRace() {
    setHorses(makeField())
    setPicked(null)
    setStake(0)
    setResult(null)
    setPhase('bet')
  }

  const leaderId = order[0]
  const silk = (i: number) => SILKS[i % SILKS.length]

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes rexHorseBob { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-3px) rotate(1deg)} }
        @keyframes rexTurf { to { background-position: 0 64px } }
        @keyframes rexGo { 0%{transform:scale(.4);opacity:0} 30%{transform:scale(1.1);opacity:1} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-white">
          🏇 Rex Racing Ring
        </h1>
        <div className="rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-amber-300">
          {wallet.balance} ₿
        </div>
      </div>

      {/* ── The track ── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border-2 border-amber-900/60 shadow-2xl"
        style={{ height: 'min(46vh, 340px)', perspective: '600px' }}
      >
        {/* sky + grandstand */}
        <div
          className="absolute inset-x-0 top-0 h-[24%]"
          style={{ background: 'linear-gradient(#7dd3fc, #bae6fd 55%, #d6b48a)' }}
        >
          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-[repeating-linear-gradient(90deg,#9a3412_0_6px,#7c2d12_6px_12px)] opacity-70" />
        </div>

        {/* finish gantry at the horizon */}
        <div className="absolute left-1/2 top-[20%] z-[120] -translate-x-1/2 text-center">
          <div className="rounded bg-rose-600 px-2 py-0.5 text-[9px] font-black text-white shadow">FINISH</div>
          <div className="mx-auto mt-0.5 h-2 w-28 bg-[repeating-linear-gradient(90deg,#000_0_6px,#fff_6px_12px)]" />
        </div>

        {/* turf — a trapezoid receding to the horizon */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(31% 24%, 69% 24%, 100% 100%, 0% 100%)', background: '#fafafa' }}
        >
          <div
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(32% 25%, 68% 25%, 98% 100%, 2% 100%)',
              background:
                'repeating-linear-gradient(90deg,#4ca832 0 9%,#3f9128 9% 18%), linear-gradient(#3f9128,#4ca832)',
            }}
          >
            {/* scrolling ground lines convey speed while running */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'repeating-linear-gradient(#ffffff 0 3px, transparent 3px 64px)',
                animation: 'rexTurf .5s linear infinite',
                animationPlayState: phase === 'running' ? 'running' : 'paused',
              }}
            />
          </div>
        </div>

        {/* the field */}
        <div className="absolute inset-0">
          {horses.map((h, i) => {
            const s = silk(i)
            return (
              <div
                key={h.id}
                ref={(el) => { spriteRefs.current[i] = el }}
                className="absolute"
                style={{ left: '50%', top: '90%', width: 40, transform: 'translate(-50%,-100%)' }}
              >
                <div
                  style={{
                    animation: 'rexHorseBob .32s ease-in-out infinite',
                    animationPlayState: phase === 'running' ? 'running' : 'paused',
                  }}
                  className="flex flex-col items-center"
                >
                  {/* jockey cap */}
                  <div className="h-2.5 w-2.5 rounded-full border border-black/40" style={{ background: s.cap }} />
                  {/* silk jersey + saddlecloth number */}
                  <div
                    className="-mt-0.5 flex h-3.5 w-5 items-center justify-center rounded-sm border border-black/40 text-[8px] font-black"
                    style={{ background: s.body, color: s.cap }}
                  >
                    {i + 1}
                  </div>
                  {/* horse hindquarters */}
                  <div className="-mt-0.5 h-3 w-6 rounded-[40%] border border-black/40 bg-gradient-to-b from-[#8a5a3b] to-[#5e3a22]" />
                </div>
                <div className="mx-auto h-1 w-5 rounded-full bg-black/30 blur-[1px]" />
              </div>
            )
          })}
        </div>

        {/* GO! flash */}
        {showGo && (
          <div className="pointer-events-none absolute inset-0 z-[130] flex items-center justify-center">
            <span className="text-5xl font-black text-amber-300 drop-shadow-lg" style={{ animation: 'rexGo .9s ease-out forwards' }}>
              GO!
            </span>
          </div>
        )}

        {/* live running order */}
        <div className="absolute left-2 top-2 z-[125] rounded-lg bg-black/55 px-2 py-1 text-[10px] leading-tight text-white backdrop-blur-sm">
          <div className="mb-0.5 font-bold text-amber-300">Order</div>
          {order.slice(0, 4).map((id, pos) => (
            <div key={id} className="flex items-center gap-1">
              <span className="w-3 text-slate-400">{pos + 1}</span>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: silk(id).body }} />
              <span className="max-w-[92px] truncate">{horses[id].name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Result banner ── */}
      {phase === 'done' && result && (
        <div
          className={`rounded-xl px-4 py-3 text-center font-bold ${
            result.win ? 'bg-emerald-600/90 text-white' : 'bg-rose-900/80 text-rose-100'
          }`}
        >
          {result.win ? (
            <>🏆 {horses[result.winnerId].name} romps home — you win {result.amount} ₿!</>
          ) : (
            <>🏁 {horses[result.winnerId].name} takes it. {picked !== null ? 'Not your runner this time.' : ''}</>
          )}
        </div>
      )}

      {/* ── Betting card ── */}
      <div className="rounded-2xl bg-black/40 p-3 backdrop-blur-sm">
        {phase === 'done' ? (
          <button
            onClick={nextRace}
            className="w-full rounded-xl bg-amber-500 py-3 text-center font-black text-black active:scale-[0.99]"
          >
            Next race →
          </button>
        ) : (
          <>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {phase === 'running' ? 'And they’re off!' : 'Back a horse to win'}
            </div>

            <div className="space-y-1.5">
              {horses.map((h, i) => {
                const s = silk(i)
                const isPicked = picked === i
                const isLeading = phase === 'running' && leaderId === i
                return (
                  <button
                    key={h.id}
                    disabled={phase !== 'bet'}
                    onClick={() => { setPicked(i); setStake(0); sfx.clink() }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                      isPicked ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/5'
                    } ${phase === 'bet' ? 'active:scale-[0.99]' : 'opacity-90'}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-black" style={{ background: s.body, color: s.cap }}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-white">
                      {h.name} {isLeading && <span className="text-amber-300">• leading</span>}
                    </span>
                    <span className="rounded bg-black/40 px-1.5 py-0.5 text-xs font-bold text-amber-300">
                      {h.odds.toFixed(1)}×
                    </span>
                  </button>
                )
              })}
            </div>

            {phase === 'bet' && (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setChip(c); addChip(c) }}
                      className={`h-9 w-9 rounded-full border-2 text-xs font-black text-white ${
                        chip === c ? 'border-amber-300' : 'border-white/30'
                      } bg-gradient-to-b from-rose-600 to-rose-800`}
                    >
                      {c}
                    </button>
                  ))}
                  {stake > 0 && (
                    <button onClick={() => setStake(0)} className="ml-auto rounded-lg px-3 text-xs font-bold text-slate-300 underline">
                      clear
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 text-sm text-slate-300">
                    {picked !== null ? (
                      <>Stake <b className="text-white">{stake} ₿</b> on <b className="text-amber-300">{horses[picked].name}</b>
                        {stake > 0 && <> → wins <b className="text-emerald-400">{Math.round(stake * horses[picked].odds)} ₿</b></>}
                      </>
                    ) : (
                      'Tap a horse, then add chips.'
                    )}
                  </div>
                  <button
                    onClick={startRace}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 font-black text-black active:scale-[0.98]"
                  >
                    Race! 🏇
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <KidsAtHomeModal open={kids.open} onClose={kids.close} />
    </div>
  )
}
