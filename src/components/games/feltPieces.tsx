import { CSSProperties, useEffect, useRef, useState } from 'react'

// ── Shared pieces for playing games ON the diorama felt ─────────────────────
// Everything here lives in the table's tilted plane (CasinoStage tableChildren)
// unless noted. Coordinates are % of the felt layer (404×244 inside the rim).

export const FELT_W = 404
export const FELT_H = 244

// Where the deck sits on every card game — cards deal FROM here.
export const DECK_POS = { x: 84, y: 28 }

const cardRed = (suit?: string) => suit === '♥' || suit === '♦'

// One card face (or back), shared by the dealt card and the flip card.
function CardFace({ rank, suit, back = false }: { rank?: string; suit?: string; back?: boolean }) {
  const red = cardRed(suit)
  return (
    <div className="relative rounded-[4px]" style={{ width: 34, height: 48,
      background: back ? 'repeating-linear-gradient(45deg,#8a1322 0 3px,#5a0c18 3px 6px)' : '#fbf7ee',
      border: '1px solid rgba(0,0,0,0.28)', boxShadow: '0 4px 7px rgba(0,0,0,0.55)' }}>
      {back ? (
        <div className="absolute inset-[3px] rounded-[3px] border border-amber-400/40" />
      ) : (
        <>
          <span style={{ position: 'absolute', top: 2, left: 3, fontSize: 11, fontWeight: 900, lineHeight: 1, color: red ? '#c0182b' : '#15110b' }}>{rank}<br /><span style={{ fontSize: 9 }}>{suit}</span></span>
          <span style={{ position: 'absolute', bottom: 2, right: 3, fontSize: 11, fontWeight: 900, lineHeight: 1, color: red ? '#c0182b' : '#15110b', transform: 'rotate(180deg)' }}>{rank}<br /><span style={{ fontSize: 9 }}>{suit}</span></span>
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 15, color: red ? '#c0182b' : '#15110b' }}>{suit}</span>
        </>
      )}
    </div>
  )
}

// Wrapper that places a card on the felt and slides it in from the deck.
function CardOnFelt({ x, y, rot, delay = 0, from = DECK_POS, children }:
  { x: number; y: number; rot: number; delay?: number; from?: { x: number; y: number }; children: React.ReactNode }) {
  // px vector back to the deal origin, fed to the feltDeal keyframe via CSS vars
  const fx = ((from.x - x) / 100) * FELT_W
  const fy = ((from.y - y) / 100) * FELT_H
  return (
    <div className="felt-deal absolute"
      style={{
        left: `${x}%`, top: `${y}%`,
        transform: 'translate(-50%,-50%) rotate(var(--rot))',
        '--rot': `${rot}deg`, '--fx': `${fx}px`, '--fy': `${fy}px`,
        animationDelay: `${delay}s`,
      } as CSSProperties}>
      {children}
    </div>
  )
}

// A legible gameplay card dealt onto the felt.
export function FeltGameCard({ x, y, rot, rank, suit, faceDown = false, delay = 0, from }:
  { x: number; y: number; rot: number; rank?: string; suit?: string; faceDown?: boolean; delay?: number; from?: { x: number; y: number } }) {
  return (
    <CardOnFelt x={x} y={y} rot={rot} delay={delay} from={from}>
      <CardFace rank={rank} suit={suit} back={faceDown} />
    </CardOnFelt>
  )
}

// A card that deals in face-down, then flips face-up when `revealed` goes true.
// The "flip" is a scaleX squash-and-swap — no preserve-3d rotateY inside the
// already-tilted plane (which Safari mangles), but it reads exactly like a flip.
export function FeltFlipCard({ x, y, rot, rank, suit, revealed, delay = 0 }:
  { x: number; y: number; rot: number; rank?: string; suit?: string; revealed: boolean; delay?: number }) {
  return (
    <CardOnFelt x={x} y={y} rot={rot} delay={delay}>
      <div className="relative" style={{ width: 34, height: 48 }}>
        <div className={`absolute inset-0 ${revealed ? 'felt-flip-out' : ''}`}><CardFace back /></div>
        <div className={`absolute inset-0 ${revealed ? 'felt-flip-in' : ''}`} style={revealed ? undefined : { transform: 'scaleX(0)' }}>
          <CardFace rank={rank} suit={suit} />
        </div>
      </div>
    </CardOnFelt>
  )
}

// The deck pile the cards deal from, sized to match the gameplay cards.
export function FeltDeck({ x = DECK_POS.x, y = DECK_POS.y, rot = -6 }: { x?: number; y?: number; rot?: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
      {[4, 3, 2, 1].map((d) => (
        <div key={d} className="absolute rounded-[4px]" style={{ left: 0, top: -d, width: 34, height: 48, background: '#5a0c18', border: '1px solid rgba(0,0,0,0.35)' }} />
      ))}
      <CardFace back />
    </div>
  )
}

// Casino chip colour by denomination (kept inside the diorama's palette).
const chipColor = (v: number) =>
  v >= 100 ? '#15110c' : v >= 50 ? '#caa14a' : v >= 25 ? '#0f7a3d' : v >= 10 ? '#2456a8' : v >= 5 ? '#c0182b' : '#e8e4da'

// A growing tower of bet chips on the felt. Every time `amount` increases, the
// delta slides in as one new chip (matching what the player just did); when the
// bet resets the tower clears. Stands upright via the billboard counter-rotation.
export function BetChips({ x, y, amount, label }: { x: number; y: number; amount: number; label?: string }) {
  const [chips, setChips] = useState<number[]>([])
  const prev = useRef(0)

  useEffect(() => {
    if (amount <= 0) { prev.current = 0; setChips([]); return }
    if (amount > prev.current) {
      const delta = amount - prev.current
      prev.current = amount
      setChips((c) => (c.length >= 12 ? [amount] : [...c, delta]))
    } else if (amount < prev.current) {
      prev.current = amount
      setChips([amount])
    }
  }, [amount])

  if (chips.length === 0) return null
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>
      {/* contact shadow grounding the tower on the felt */}
      <div className="absolute left-1/2 top-1/2 h-3 w-11 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/55 blur-[3px]" />
      <div className="billboard-up flex flex-col-reverse items-center">
        {chips.map((v, i) => (
          <div key={i} className="chip-slide relative h-[6px] w-9 rounded-full border border-black/40"
            style={{ background: chipColor(v), marginTop: -2, boxShadow: 'inset 0 1px rgba(255,255,255,0.45), 0 1px 1px rgba(0,0,0,0.4)' }}>
            <span className="absolute inset-x-1 top-1/2 h-[2px] -translate-y-1/2"
              style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0 3px, transparent 3px 8px)' }} />
          </div>
        ))}
        {/* amount tag floating above the tower */}
        <span className="mb-1.5 rounded-full border border-amber-400/50 bg-black/75 px-1.5 py-px text-[9px] font-black text-amber-300">
          {label ? `${label} ` : ''}{amount} Ŧ
        </span>
      </div>
    </div>
  )
}

// A printed marking on the felt itself (betting circle / box) — goes in
// CasinoStage's feltChildren so the ellipse clips it like real silk-screen.
export function FeltRing({ x, y, size = 56, label }: { x: number; y: number; size?: number; label?: string }) {
  return (
    <div className="felt-ring absolute flex items-center justify-center"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, transform: 'translate(-50%,-50%)' }}>
      {label && <span className="text-[8px] font-black uppercase tracking-widest text-amber-100/40">{label}</span>}
    </div>
  )
}

// Flat HUD pill for the stage overlay (totals, results). Positioned by the caller.
export function HudPill({ children, className = '', style }:
  { children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`absolute rounded-full border border-amber-400/40 bg-black/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200 shadow-lg ${className}`}
      style={style}>
      {children}
    </span>
  )
}
