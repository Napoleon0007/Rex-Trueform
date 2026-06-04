import { useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useSessionPnl } from '../../store/sessionPnl'
import RouletteWheel from './RouletteWheel'
import Roulette from './Roulette'
import Blackjack from './Blackjack'
import Poker from './Poker'
import Slots from './Slots'

type Game = 'roulette' | 'blackjack' | 'poker' | 'slots'

const GAMES: { key: Game; label: string; emoji: string; blurb: string }[] = [
  { key: 'roulette',  label: 'Roulette',  emoji: '🎡', blurb: 'Spin the wheel' },
  { key: 'blackjack', label: 'Blackjack', emoji: '🃏', blurb: 'Beat the dealer to 21' },
  { key: 'poker',     label: 'Poker',     emoji: '♠️', blurb: "Casino Hold'em vs the house" },
  { key: 'slots',     label: 'Slots',     emoji: '🎰', blurb: 'Pull for the jackpot' },
]

const BANTER = [
  'Place your bets, gentlemen.',
  'House always wins… eventually.',
  'Feeling lucky tonight?',
  'Chips on the felt, please.',
  "Don't spend it all in one hand.",
]

// A real croupier (photo cutout) standing at the table, ready to take your chips.
function Croupier({ line }: { line: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative mb-2 max-w-[150px] rounded-2xl bg-white px-3 py-1.5 text-center text-[11px] font-bold text-[#160a04] shadow-lg">
        {line}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
      <img
        src="/croupier.png"
        alt="Croupier"
        className="h-40 w-auto origin-bottom object-contain animate-[dealerSway_4s_ease-in-out_infinite]"
        style={{ filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.6))' }}
      />
    </div>
  )
}

// A tower of casino chips standing upright on the tilted felt. The outer node lies
// flat on the felt (so its contact shadow stays an ellipse); the inner stack is
// counter-rotated so it stands up like a real chip tower seen at an angle, and
// drops into place on entry.
function ChipStack3D({ colors, x, y, delay = 0 }: { colors: string[]; x: number; y: number; delay?: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>
      {/* contact shadow grounding the stack on the felt */}
      <div className="absolute left-1/2 top-1/2 h-3 w-11 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/55 blur-[3px]" />
      <div className="reveal-chip flex flex-col-reverse items-center" style={{ transformOrigin: 'bottom center', animationDelay: `${delay}s` }}>
        {colors.map((c, i) => (
          <div key={i} className="relative h-[6px] w-9 rounded-full border border-black/40"
            style={{ background: c, marginTop: -2, boxShadow: 'inset 0 1px rgba(255,255,255,0.45), 0 1px 1px rgba(0,0,0,0.4)' }}>
            {/* dashed edge spots like a real chip rim */}
            <span className="absolute inset-x-1 top-1/2 h-[2px] -translate-y-1/2"
              style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0 3px, transparent 3px 8px)' }} />
          </div>
        ))}
        {/* top face of the stack */}
        <div className="h-2 w-9 rounded-full border border-black/30" style={{ background: colors[colors.length - 1], boxShadow: 'inset 0 0 4px rgba(255,255,255,0.5)' }} />
      </div>
    </div>
  )
}

function PnlChip() {
  const net = useSessionPnl((s) => s.net)
  const reset = useSessionPnl((s) => s.reset)
  if (net === 0) return null
  const up = net > 0
  return (
    <button
      onClick={reset}
      title="Tonight's net — tap to reset"
      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
        up ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
           : 'border-rose-400/50 bg-rose-500/15 text-rose-300'
      }`}
    >
      {up ? '▲' : '▼'} {up ? '+' : ''}{net} 🪙 tonight
    </button>
  )
}

// Parallax: the jungle plate shifts a few px against the cursor for a diorama
// feel. Reads --mx/--my (set on the stage by the pointer handler below).
const PARALLAX_BG = 'translate(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -9px)) scale(1.16)'

// Rainforest backdrop: an AI render pushed back + blurred for depth of field and
// graded to the emerald/gold theme, so the sharp croupier pops in front. A painted
// CSS jungle sits behind it as an instant, zero-cost fallback until /rainforest.png
// exists — then the photo takes over automatically.
function Backdrop() {
  const [hasPhoto, setHasPhoto] = useState(true)
  return (
    <div className="backdrop-fade pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="jungle-css absolute inset-0" style={{ transform: PARALLAX_BG }} />
      {hasPhoto && (
        <img src="/rainforest.png" alt="" onError={() => setHasPhoto(false)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: PARALLAX_BG, filter: 'blur(3px) brightness(0.6) saturate(1.08)' }} />
      )}
      {/* golden god-rays filtering down through the canopy */}
      <div className="god-rays absolute inset-0" />
      {/* mist creeping along the forest floor */}
      <div className="jungle-mist absolute inset-x-0 bottom-0 h-2/5" />
      {/* vignette: hug the edges, focus the centre */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 28%, rgba(2,12,7,0.5) 70%, rgba(0,0,0,0.92) 100%)' }} />
    </div>
  )
}

// Fireflies / light motes drifting up through the scene. Fixed positions keep the
// dance deterministic (no layout thrash, no Math.random in render).
const FIREFLIES = [
  { l: 12, t: 58, d: 0, dur: 7 },    { l: 22, t: 40, d: 1.4, dur: 8 },
  { l: 34, t: 64, d: 2.6, dur: 6.5 }, { l: 46, t: 33, d: 0.8, dur: 9 },
  { l: 58, t: 60, d: 3.2, dur: 7.5 }, { l: 68, t: 42, d: 1.9, dur: 8.5 },
  { l: 78, t: 55, d: 2.2, dur: 7 },   { l: 88, t: 37, d: 0.5, dur: 9.5 },
  { l: 28, t: 27, d: 4, dur: 8 },     { l: 72, t: 25, d: 3.6, dur: 7.2 },
]
function Fireflies() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10"
      style={{ transform: 'translate(calc(var(--mx, 0) * 7px), calc(var(--my, 0) * 5px))' }}>
      {FIREFLIES.map((f, i) => (
        <span key={i} className="firefly"
          style={{ left: `${f.l}%`, top: `${f.t}%`, animationDelay: `${f.d}s`, animationDuration: `${f.dur}s` }} />
      ))}
    </div>
  )
}

// Brass pendant lamp hanging over the table, throwing a warm volumetric cone of
// light down onto the felt — the classic "pool of light in a dark room" look.
function PendantLamp() {
  return (
    <>
      <div className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 flex-col items-center">
        <div className="h-7 w-px bg-amber-900/70" />
        <div className="relative h-5 w-16 rounded-b-[45%] rounded-t-md"
          style={{ background: 'linear-gradient(180deg,#3a2a16,#170f07)', boxShadow: '0 5px 10px rgba(0,0,0,0.6)' }}>
          <div className="absolute -bottom-1.5 left-1/2 h-3.5 w-7 -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle,#fff6cf,#f6b73c 55%,transparent 75%)', filter: 'blur(1px)' }} />
        </div>
      </div>
      <div className="light-cone pointer-events-none absolute left-1/2 top-9 z-[4] -translate-x-1/2" />
    </>
  )
}

export default function GamesTable() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const [game, setGame] = useState<Game | null>(null)
  const [line] = useState(() => BANTER[Math.floor(Math.random() * BANTER.length)])
  const stageRef = useRef<HTMLDivElement>(null)

  // Subtle pointer parallax: store the cursor offset as CSS vars on the stage so the
  // jungle and fireflies can drift against it — no React re-render.
  const onStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2))
    el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2))
  }
  const onStageLeave = () => {
    const el = stageRef.current
    if (!el) return
    el.style.setProperty('--mx', '0')
    el.style.setProperty('--my', '0')
  }

  return (
    <div className="mt-10">
      <div className="overflow-hidden rounded-3xl border-4 border-[#3a2210] shadow-2xl shadow-black/60"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #0f7a47 0%, #0a5e38 45%, #064027 100%)' }}>
        {/* felt header */}
        <div className="flex items-center justify-between gap-2 border-b border-black/20 px-5 py-3">
          <h3 className="font-black uppercase tracking-[0.2em] text-amber-300 text-sm">🎰 The Games Table</h3>
          <div className="flex items-center gap-2">
            <PnlChip />
            <span className="rounded-full border border-amber-400/40 bg-black/30 px-3 py-1 text-xs font-bold text-amber-300">{balance} 🪙</span>
          </div>
        </div>

        <div className="p-5">
          {!game ? (
            <div>
              {/* ===== 3D table diorama: rainforest backdrop, pendant lamp, fireflies ===== */}
              <div ref={stageRef} onPointerMove={onStageMove} onPointerLeave={onStageLeave}
                className="stage-3d games-stage relative mb-6 overflow-hidden rounded-2xl"
                style={{ height: 440, background: '#05100a' }}>

                {/* the rainforest, pushed back and blurred behind everything */}
                <Backdrop />

                {/* gold proscenium framing the scene like a lit stage window */}
                <div className="proscenium pointer-events-none absolute inset-0 z-30 rounded-2xl" />

                {/* pendant lamp + its volumetric cone of light */}
                <PendantLamp />

                {/* fireflies drifting through the air */}
                <Fireflies />

                {/* ambient floor shadow the table casts */}
                <div className="pointer-events-none absolute left-1/2 top-[72%] z-[6] h-24 w-[72%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl" />

                {/* croupier stands behind the table — sharp against the soft jungle */}
                <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
                  <div className="reveal" style={{ animationDelay: '0.35s' }}>
                    <Croupier line={line} />
                  </div>
                </div>

                {/* the table laid back into the floor */}
                <div className="table-3d table-3d--enter absolute left-1/2 z-[8]"
                  style={{ top: '46%', width: 440, height: 280, marginLeft: -220, transformStyle: 'preserve-3d' }}>
                  {/* extruded underside = visible table thickness */}
                  <div className="metal-silver absolute inset-0 rounded-[50%]"
                    style={{ transform: 'translateZ(-26px)', filter: 'brightness(0.42)' }} />
                  {/* silver edge / apron with a slow sheen sweep */}
                  <div className="metal-silver absolute inset-0 overflow-hidden rounded-[50%]"
                    style={{ boxShadow: '0 34px 60px rgba(0,0,0,0.85), inset 0 2px 6px rgba(255,255,255,0.55)' }}>
                    <div className="sheen absolute inset-0" />
                  </div>
                  {/* felt top */}
                  <div className="felt-3d absolute overflow-hidden rounded-[50%]"
                    style={{ inset: 18, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)', transformStyle: 'preserve-3d' }}>
                    {/* warm pool of light landing on the felt */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
                      style={{ background: 'radial-gradient(ellipse, rgba(255,224,150,0.30), transparent 70%)', mixBlendMode: 'screen' }} />
                    {/* recessed chrome wheel bowl at the far end of the felt */}
                    <div className="metal-silver absolute left-[24%] top-[12%] h-[42%] w-[28%] overflow-hidden rounded-full"
                      style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.75), 0 8px 16px rgba(0,0,0,0.6)' }}>
                      <div className="sheen absolute inset-0" />
                      <RouletteWheel idle className="absolute inset-[10%] h-[80%] w-[80%]" />
                    </div>
                    {/* chip towers standing on the felt, dropping in on entry */}
                    <ChipStack3D colors={['#c0182b', '#15110c', '#caa14a']} x={60} y={50} delay={0.7} />
                    <ChipStack3D colors={['#0f7a3d', '#caa14a', '#caa14a', '#15110c']} x={73} y={64} delay={0.85} />
                    <ChipStack3D colors={['#15110c', '#c0182b', '#caa14a']} x={38} y={70} delay={1} />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-amber-50">What do you want to play?</p>
                <p className="mb-6 mt-1 text-sm text-amber-200/60">One table. One stack of gold. Your call.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {GAMES.map((g) => (
                  <button key={g.key} onClick={() => setGame(g.key)}
                    className="group rounded-2xl border border-amber-500/30 bg-black/25 p-5 transition-all hover:border-amber-400 hover:bg-black/40 active:scale-95">
                    <div className="text-4xl">{g.emoji}</div>
                    <div className="mt-2 font-black uppercase tracking-widest text-amber-200">{g.label}</div>
                    <div className="mt-0.5 text-xs text-amber-200/50">{g.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setGame(null)} className="mb-4 flex items-center gap-1.5 text-sm text-amber-200/70 hover:text-amber-200">
                ← Change game
              </button>
              {game === 'roulette' && <Roulette />}
              {game === 'blackjack' && <Blackjack />}
              {game === 'poker' && <Poker />}
              {game === 'slots' && <Slots />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
