import { ReactNode, useMemo, useRef } from 'react'
import { useSessionPnl } from '../../store/sessionPnl'
import { bubbleLine } from '../../lib/dealerLines'
import RouletteWheel from './RouletteWheel'

// ── The casino diorama, extracted from GamesTable so every game can play ON it ──
// One perspective stage: jungle backdrop, pendant lamp, fireflies, the dealer and
// the tilted elliptical table. The picker dresses it with idle props; each game
// renders its live scene into the same tilted plane via `tableChildren`.

// The house dealer — a glamorous woman (real photo cutout) at the table.
export function Dealer({ line }: { line: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative mb-2 max-w-[150px] rounded-2xl bg-white px-3 py-1.5 text-center text-[11px] font-bold text-[#160a04] shadow-lg">
        {line}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
      <img
        src="/dealer-woman.png"
        alt="The dealer"
        className="h-52 w-auto origin-bottom object-contain animate-[dealerSway_4s_ease-in-out_infinite]"
        style={{ filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.65))' }}
      />
    </div>
  )
}

// A tower of casino chips standing upright on the tilted felt. The outer node lies
// flat on the felt (so its contact shadow stays an ellipse); the inner stack is
// counter-rotated so it stands up like a real chip tower seen at an angle, and
// drops into place on entry.
export function ChipStack3D({ colors, x, y, delay = 0 }: { colors: string[]; x: number; y: number; delay?: number }) {
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

// Parallax: the jungle plate shifts a few px against the cursor for a diorama
// feel. Reads --mx/--my (set on the stage by the pointer handler below).
const PARALLAX_BG = 'translate(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -9px)) scale(1.16)'

// Real rainforest backdrop: a photo of dense jungle that drifts slightly against the
// cursor, with a warm canopy glow up top and a vignette so the lit table + dealer stay
// the focus. A hidden gaming table deep in the jungle.
function Backdrop() {
  return (
    <div className="backdrop-fade pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/rainforest.jpg)', transform: PARALLAX_BG }} />
      {/* warm canopy light up top + deep green forest-floor glow */}
      <div className="absolute inset-0" style={{ background:
        'radial-gradient(ellipse at 50% 10%, rgba(140,105,40,0.30), transparent 55%),'
        + 'radial-gradient(ellipse at 50% 122%, rgba(8,50,30,0.55), transparent 60%)' }} />
      {/* vignette: hug the edges, focus the centre */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 28%, rgba(0,0,0,0.5) 73%, rgba(0,0,0,0.92) 100%)' }} />
    </div>
  )
}

// A playing card lying flat on the felt (or a small deck). Sits in the felt's tilted
// plane, so it reads as resting on the table; rot fans it in-plane.
export function FeltCard({ x, y, rot, faceDown = false, deck = false, rank, suit }:
  { x: number; y: number; rot: number; faceDown?: boolean; deck?: boolean; rank?: string; suit?: string }) {
  const back = faceDown || deck
  const red = suit === '♥' || suit === '♦'
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
      {deck && [4, 3, 2, 1].map((d) => (
        <div key={d} className="absolute rounded-[3px]" style={{ left: 0, top: -d, width: 20, height: 28, background: '#5a0c18', border: '1px solid rgba(0,0,0,0.35)' }} />
      ))}
      <div className="relative rounded-[3px]" style={{ width: 20, height: 28,
        background: back ? 'repeating-linear-gradient(45deg,#8a1322 0 3px,#5a0c18 3px 6px)' : '#fbf7ee',
        border: '1px solid rgba(0,0,0,0.28)', boxShadow: '0 3px 5px rgba(0,0,0,0.5)' }}>
        {!back && <span style={{ position: 'absolute', top: 1.5, left: 2.5, fontSize: 7, fontWeight: 800, lineHeight: 1, color: red ? '#c0182b' : '#15110b' }}>{rank}{suit}</span>}
      </div>
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

// Idle props for the picker: the recessed wheel bowl, chip towers and a hand
// mid-deal — the table "between games".
function IdleDressing() {
  return (
    <>
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
      <ChipStack3D colors={['#caa14a', '#c0182b', '#15110c', '#caa14a', '#0f7a3d']} x={86} y={50} delay={1.1} />

      {/* the deck + a couple of cards mid-deal */}
      <FeltCard x={80} y={33} rot={-6} deck />
      <FeltCard x={48} y={58} rot={-9} faceDown />
      <FeltCard x={54} y={60} rot={7} faceDown />
      {/* the hand you've just been dealt, fanned face-up at the rail */}
      <FeltCard x={42} y={78} rot={-20} rank="A" suit="♠" />
      <FeltCard x={49} y={79} rot={-4} rank="K" suit="♥" />
      <FeltCard x={56} y={78} rot={12} rank="Q" suit="♦" />
    </>
  )
}

export type CasinoStageProps = {
  /** picker: tall stage with the full entrance reveal; game: tighter framing, quicker reveal */
  mode?: 'picker' | 'game'
  /** idle props (bowl + chip towers + decorative cards); defaults to picker mode only */
  dressing?: boolean
  /** CLIPPED layer inside the felt ellipse — printed markings (betting circles/boxes) */
  feltChildren?: ReactNode
  /** UNCLIPPED layer in the same tilted plane — live cards, chips, bowl, cabinet */
  tableChildren?: ReactNode
  /** flat 2D HUD floating over the whole stage — readouts, result badges */
  overlay?: ReactNode
  /** override the dealer's bubble (defaults to the session-P&L line) */
  dealerLine?: string
  /** override stage height */
  height?: number
}

export default function CasinoStage({
  mode = 'picker',
  dressing = mode === 'picker',
  feltChildren,
  tableChildren,
  overlay,
  dealerLine,
  height,
}: CasinoStageProps) {
  const net = useSessionPnl((s) => s.net)
  // The dealer's bubble reflects how your night is going (up = needle, down = console).
  const line = useMemo(() => dealerLine ?? bubbleLine(net), [dealerLine, net])
  const stageRef = useRef<HTMLDivElement>(null)

  const game = mode === 'game'
  const stageH = height ?? (game ? 360 : 440)
  const dealerTop = game ? 18 : 52
  const dealerDelay = game ? 0.1 : 0.35

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
    <div ref={stageRef} onPointerMove={onStageMove} onPointerLeave={onStageLeave}
      className={`stage-3d games-stage relative overflow-hidden rounded-2xl ${game ? 'mb-4' : 'mb-6'}`}
      style={{ height: stageH, background: '#05100a' }}>

      {/* the real rainforest behind everything */}
      <Backdrop />

      {/* gold proscenium framing the scene like a lit stage window */}
      <div className="proscenium pointer-events-none absolute inset-0 z-30 rounded-2xl" />

      {/* pendant lamp + its volumetric cone of light */}
      <PendantLamp />

      {/* dust motes drifting in the lamp light */}
      <Fireflies />

      {/* ambient floor shadow the table casts */}
      <div className="pointer-events-none absolute left-1/2 top-[72%] z-[6] h-24 w-[72%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl" />

      {/* the dealer stands BEHIND the table (z below the table) so the rim cuts
          off her lower body instead of her hovering cropped over the felt */}
      <div className="absolute left-1/2 z-[7] -translate-x-1/2" style={{ top: dealerTop }}>
        <div className="reveal" style={{ animationDelay: `${dealerDelay}s` }}>
          <Dealer line={line} />
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
        {/* felt top — CLIPPED at the ellipse: texture, spotlight, printed markings */}
        <div className="felt-3d absolute overflow-hidden rounded-[50%]"
          style={{ inset: 18, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)', transformStyle: 'preserve-3d' }}>
          {/* warm pool of light landing on the felt */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{ background: 'radial-gradient(ellipse, rgba(255,224,150,0.30), transparent 70%)', mixBlendMode: 'screen' }} />
          {feltChildren}
        </div>
        {/* live game layer — same plane as the felt, but NOT clipped, so upright
            pieces (chip towers, the slots cabinet) can rise past the rim */}
        <div className="absolute" style={{ inset: 18, transformStyle: 'preserve-3d' }}>
          {dressing && <IdleDressing />}
          {tableChildren}
        </div>
      </div>

      {/* flat HUD floating over the diorama (readouts, result badges) */}
      {overlay && <div className="pointer-events-none absolute inset-0 z-40">{overlay}</div>}
    </div>
  )
}
