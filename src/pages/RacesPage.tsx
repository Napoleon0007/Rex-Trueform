import { useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useJuice, BIG_WIN } from '../store/juice'
import { toast } from '../store/toastStore'
import { sfx } from '../lib/sfx'
import { useKidsWarning, KidsAtHomeModal, TABLE_MAX } from '../components/games/KidsWarning'
import { SILKS } from '../lib/horseNames'
import { RaceSim, FIELD } from '../lib/raceSim'
import { samplePath, centrelinePoints, LAP_LENGTH } from '../components/races/track'
import RaceCanvas from '../components/races/RaceCanvas'
import RaceFallback2D from '../components/races/RaceFallback2D'
import ErrorBoundary from '../components/ErrorBoundary'
import { canUseWebGL } from '../lib/webgl'
import * as THREE from 'three'

// ── The Rex Racing Ring (3D) ──────────────────────────────────────────────────
// A real WebGL oval circuit (three.js / react-three-fiber): eight horses gallop a
// full lap of a banked turf course under a broadcast camera, and you can see the
// whole track. Bet a horse to win; payout = stake × odds, spent and paid from the
// one shared token wallet exactly like the other casino games.

const CHIPS = [2, 5, 10, 25, 50, 100]
const LENGTHS_PER_LAP = LAP_LENGTH / 2.4 // ~2.4m per horse length

type Phase = 'bet' | 'running' | 'done'
// place: 0 = won, 1 = 2nd, 2 = 3rd, -1 = out of the money (no prize)
type RaceResult = { win: boolean; place: number; amount: number; winnerId: number }

// Top-three pay: 1st = full (stake × odds), 2nd = half, 3rd = a quarter.
const PLACE_FRACTION = [1, 0.5, 0.25]

const silk = (i: number) => SILKS[i % SILKS.length]

// ── Oval minimap geometry (computed once) ──
const MINI = (() => {
  const pts = centrelinePoints(160)
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z)
  }
  const W = 170, H = 90, pad = 10
  const sx = (W - pad * 2) / (maxX - minX)
  const sz = (H - pad * 2) / (maxZ - minZ)
  const project = (x: number, z: number): [number, number] => [
    pad + (x - minX) * sx,
    pad + (z - minZ) * sz,
  ]
  const path = pts.map(([x, z], i) => `${i ? 'L' : 'M'}${project(x, z).join(',')}`).join(' ') + 'Z'
  return { W, H, project, path }
})()

export default function RacesPage() {
  const wallet = useWallet()
  const celebrate = useJuice((s) => s.celebrate)
  const commiserate = useJuice((s) => s.commiserate)
  const kids = useKidsWarning()

  const [sim, setSim] = useState(() => new RaceSim())
  const [phase, setPhase] = useState<Phase>('bet')
  const [picked, setPicked] = useState<number | null>(null)
  const [stake, setStake] = useState(0)
  const [chip, setChip] = useState(5)
  const [order, setOrder] = useState<number[]>(() => sim.order())
  const [result, setResult] = useState<RaceResult | null>(null)
  const [showGo, setShowGo] = useState(false)
  const [, force] = useState(0) // bump to refresh the minimap dots

  const pickedRef = useRef<number | null>(null)
  const stakeRef = useRef(0)
  const v = useMemo(() => new THREE.Vector3(), [])

  // Decide up front whether to mount the 3D track at all. If WebGL is off/absent
  // we render the 2D fallback directly — far more reliable than catching the
  // async throw the GPU renderer makes, which a React error boundary never sees.
  const [can3D, setCan3D] = useState(canUseWebGL)

  // Belt-and-suspenders: if a WebGL renderer still dies asynchronously (e.g. a
  // phone runs out of GPU memory mid-init), that surfaces as an uncaught window
  // error. Catch it and drop to the 2D track so the page never goes blank.
  useEffect(() => {
    if (!can3D) return
    const onErr = (e: ErrorEvent) => {
      if (/webgl|context lost|out of memory/i.test(e.message || '')) setCan3D(false)
    }
    window.addEventListener('error', onErr)
    return () => window.removeEventListener('error', onErr)
  }, [can3D])

  // The full-screen background video competes with the 3D track for GPU/memory
  // (the exact pressure that blanks phones). Freeze it while this heavy page is
  // open; resume it on the way out.
  useEffect(() => {
    const bg = document.querySelector<HTMLVideoElement>('video[data-bg-video]')
    if (bg) bg.pause()
    return () => { bg?.play?.().catch(() => {}) }
  }, [])

  function addChip(value: number) {
    if (phase !== 'bet') return
    if (picked === null) { toast.error('Pick a horse first'); return }
    const next = stake + value
    if (next > TABLE_MAX) { toast.error(`Table max is ${TABLE_MAX} Ŧ`); return }
    if (!wallet.canBet(next)) { toast.error('Not enough $TRUEF'); return }
    sfx.clink()
    kids.check(next)
    setStake(next)
  }

  function startRace() {
    if (phase !== 'bet') return
    if (picked === null) { toast.error('Pick a horse to back'); return }
    if (stake <= 0) { toast.error('Place a bet first'); return }
    if (!wallet.canBet(stake)) { toast.error('Not enough $TRUEF'); return }

    pickedRef.current = picked
    stakeRef.current = stake
    wallet.bet(stake, 'races')
    sfx.spin()

    setResult(null)
    setPhase('running')
    setShowGo(true)
    setTimeout(() => setShowGo(false), 900)
  }

  function onFinish(classified: number[]) {
    const winnerId = classified[0]
    const myId = pickedRef.current
    const myStake = stakeRef.current
    // Where did the horse I backed finish? 0 = won, 1 = 2nd, 2 = 3rd.
    const place = myId === null ? -1 : classified.indexOf(myId)
    if (place >= 0 && place <= 2) {
      const amount = Math.round(myStake * sim.runners[myId!].odds * PLACE_FRACTION[place])
      wallet.payout(amount, 'races')
      amount >= BIG_WIN ? sfx.jackpot() : sfx.win()
      celebrate(amount)
      setResult({ win: true, place, amount, winnerId })
    } else {
      sfx.lose()
      commiserate()
      setResult({ win: false, place, amount: 0, winnerId })
    }
    setOrder(classified)
    setPhase('done')
  }

  function nextRace() {
    setSim(new RaceSim())
    setPicked(null)
    setStake(0)
    setResult(null)
    setOrder([...Array(FIELD).keys()])
    setPhase('bet')
  }

  const leaderId = order[0]
  const leaderP = sim.progress[leaderId] ?? 0
  const runners = sim.runners
  const myHorseName = picked !== null ? runners[picked].name : 'your runner'

  // gap in lengths behind the leader, for the broadcast board
  const gapLengths = (id: number) =>
    Math.max(0, (leaderP - (sim.progress[id] ?? 0)) * LENGTHS_PER_LAP)

  const commentary =
    phase === 'bet'
      ? 'Runners going down to the start…'
      : phase === 'done'
      ? `${runners[order[0]].name} wins the Rex Racing Ring!`
      : leaderP > 0.86
      ? `${runners[leaderId].name} kicks for home!`
      : leaderP > 0.5
      ? `${runners[leaderId].name} leads down the back straight.`
      : `And they're off — ${runners[leaderId].name} shows the way.`

  // The no-WebGL view — also drives the sim to settlement, so a bet resolves the
  // same with or without the 3D track. Reused as both the direct render (WebGL
  // off) and the error-boundary fallback (a 3D render throw).
  const fallback2D = (
    <RaceFallback2D
      sim={sim}
      phase={phase}
      oval={MINI}
      silk={silk}
      leaderId={leaderId}
      onOrder={(ids) => { setOrder(ids); force((n) => n + 1) }}
      onFinish={onFinish}
    />
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-white">🏇 Rex Racing Ring</h1>
        <div className="rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-amber-300">
          {wallet.balance} Ŧ
        </div>
      </div>

      {/* ── The 3D track ── */}
      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-amber-900/60 bg-sky-200 shadow-2xl" style={{ height: 'min(54vh, 420px)' }}>
        {can3D ? (
          <ErrorBoundary fallback={fallback2D}>
            <RaceCanvas
              sim={sim}
              phase={phase}
              onOrder={(ids) => { setOrder(ids); force((n) => n + 1) }}
              onFinish={onFinish}
            />
          </ErrorBoundary>
        ) : (
          fallback2D
        )}

        {/* live running order — broadcast lower-third */}
        <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-lg bg-black/55 px-2 py-1 text-[10px] leading-tight text-white backdrop-blur-sm">
          <div className="mb-0.5 font-bold text-amber-300">Running order</div>
          {order.slice(0, 5).map((id, pos) => (
            <div key={id} className="flex items-center gap-1">
              <span className="w-3 text-slate-400">{pos + 1}</span>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: silk(id).body }} />
              <span className="max-w-[96px] truncate">{runners[id].name}</span>
              {phase === 'running' && pos > 0 && (
                <span className="ml-auto text-[9px] text-slate-400">{gapLengths(id).toFixed(1)}L</span>
              )}
            </div>
          ))}
        </div>

        {/* oval minimap — always shows the whole circuit */}
        <div className="pointer-events-none absolute right-2 top-2 z-20 rounded-lg bg-black/50 p-1 backdrop-blur-sm">
          <svg width={MINI.W} height={MINI.H} viewBox={`0 0 ${MINI.W} ${MINI.H}`}>
            <path d={MINI.path} fill="none" stroke="#64748b" strokeWidth={6} strokeLinecap="round" />
            <path d={MINI.path} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
            {runners.map((_, i) => {
              const { pos } = samplePath(sim.progress[i], sim.lane[i], v)
              const [px, py] = MINI.project(pos.x, pos.z)
              return <circle key={i} cx={px} cy={py} r={i === leaderId && phase !== 'bet' ? 3.4 : 2.6} fill={silk(i).body} stroke="#000" strokeWidth={0.5} />
            })}
          </svg>
        </div>

        {/* commentary strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-center text-sm font-semibold text-white">
          {commentary}
        </div>

        {/* GO! flash */}
        {showGo && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <span className="text-6xl font-black text-amber-300 drop-shadow-lg" style={{ animation: 'rexGo .9s ease-out forwards' }}>
              GO!
            </span>
          </div>
        )}
        <style>{`@keyframes rexGo{0%{transform:scale(.4);opacity:0}30%{transform:scale(1.1);opacity:1}100%{transform:scale(1.7);opacity:0}}`}</style>
      </div>

      {/* ── Result banner ── */}
      {phase === 'done' && result && (
        <div className={`rounded-xl px-4 py-3 text-center font-bold ${result.win ? 'bg-emerald-600/90 text-white' : 'bg-rose-900/80 text-rose-100'}`}>
          {result.place === 0 ? (
            <>🏆 {myHorseName} wins it — you collect {result.amount} Ŧ!</>
          ) : result.place === 1 ? (
            <>🥈 2nd place! {myHorseName} lands in the money — you collect {result.amount} Ŧ.</>
          ) : result.place === 2 ? (
            <>🥉 3rd place! {myHorseName} grabs a prize — you collect {result.amount} Ŧ.</>
          ) : (
            <>🏁 {runners[result.winnerId].name} takes it — {myHorseName} ran {result.place + 1}th. No prize this time.</>
          )}
        </div>
      )}

      {/* ── Betting card ── */}
      <div className="rounded-2xl bg-black/40 p-3 backdrop-blur-sm">
        {phase === 'done' ? (
          <button onClick={nextRace} className="w-full rounded-xl bg-amber-500 py-3 text-center font-black text-black active:scale-[0.99]">
            Next race →
          </button>
        ) : (
          <>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {phase === 'running' ? 'And they’re off!' : 'Back a horse — top 3 pay'}
            </div>

            <div className="space-y-1.5">
              {runners.map((h, i) => {
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
                      className={`h-9 w-9 rounded-full border-2 text-xs font-black text-white ${chip === c ? 'border-amber-300' : 'border-white/30'} bg-gradient-to-b from-rose-600 to-rose-800`}
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
                      <>
                        <div>
                          Stake <b className="text-white">{stake} Ŧ</b> on <b className="text-amber-300">{runners[picked].name}</b>
                          {stake > 0 && <> → win <b className="text-emerald-400">{Math.round(stake * runners[picked].odds)} Ŧ</b></>}
                        </div>
                        {stake > 0 && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            🥈 2nd {Math.round(stake * runners[picked].odds * PLACE_FRACTION[1])} Ŧ · 🥉 3rd {Math.round(stake * runners[picked].odds * PLACE_FRACTION[2])} Ŧ
                          </div>
                        )}
                      </>
                    ) : (
                      'Tap a horse, then add chips.'
                    )}
                  </div>
                  <button onClick={startRace} className="rounded-xl bg-emerald-500 px-5 py-2.5 font-black text-black active:scale-[0.98]">
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
