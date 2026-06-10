import { CSSProperties } from 'react'
import RouletteWheel from './RouletteWheel'

// ── The game picker: four "living" tiles, each a tiny moving preview of its game
// (a real spinning wheel, ticking slot reels, a hole-card flip, a riffling royal
// flush) instead of a flat emoji. Pure CSS motion — no WebGL, light on mobile. ──

export type Game = 'roulette' | 'blackjack' | 'poker' | 'slots'

const GAMES: { key: Game; label: string; blurb: string; accent: string }[] = [
  { key: 'roulette',  label: 'Roulette',  blurb: 'Spin the wheel',          accent: '#c0182b' },
  { key: 'blackjack', label: 'Blackjack', blurb: 'Beat the dealer to 21',   accent: '#0f7a3d' },
  { key: 'poker',     label: 'Poker',     blurb: "Texas Hold'em vs the house", accent: '#caa14a' },
  { key: 'slots',     label: 'Slots',     blurb: 'Pull for the jackpot',     accent: '#f5b301' },
]

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']

// ── small building blocks ──
function MiniCard({ rank, suit, className = '', style }:
  { rank: string; suit: string; className?: string; style?: CSSProperties }) {
  const red = suit === '♥' || suit === '♦'
  return (
    <div
      className={`relative flex h-10 w-7 flex-col justify-between rounded-[4px] border border-black/15 bg-[#fbf7ee] p-0.5 font-black leading-none shadow-md ${className}`}
      style={{ fontSize: 9, color: red ? '#c0182b' : '#15110b', ...style }}
    >
      <span className="self-start">{rank}{suit}</span>
      <span className="self-center" style={{ fontSize: 12 }}>{suit}</span>
      <span className="self-end rotate-180">{rank}{suit}</span>
    </div>
  )
}

function CardBack() {
  return (
    <div className="h-10 w-7 rounded-[4px] border border-amber-900/50 shadow-md"
      style={{ background: 'repeating-linear-gradient(45deg,#8a1322 0 3px,#5a0c18 3px 6px)' }}>
      <div className="m-[3px] h-[calc(100%-6px)] rounded-[3px] border border-amber-400/40" />
    </div>
  )
}

// ── the four motifs ──
function RouletteMotif() {
  return (
    <div className="relative h-16 w-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
      <RouletteWheel idle className="h-full w-full" />
      <span className="absolute left-1/2 top-0.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white shadow" />
    </div>
  )
}

function SlotsMotif() {
  const strip = [...SLOT_SYMBOLS, ...SLOT_SYMBOLS]
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 w-8 overflow-hidden rounded-md border-2 border-amber-700/50 bg-[#fbfaf5]"
          style={{ boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.25)' }}>
          <div className="flex flex-col" style={{ animation: `tileReel ${1.3 + i * 0.5}s steps(6) infinite` }}>
            {strip.map((s, j) => (
              <span key={j} className="flex h-12 w-full shrink-0 items-center justify-center text-2xl">{s}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BlackjackMotif() {
  return (
    <div className="flex items-end gap-1.5" style={{ perspective: 600 }}>
      <MiniCard rank="A" suit="♠" className="-rotate-6" />
      {/* the dealer's hole card: face-down, flips to reveal the King (→ 21), repeats */}
      <div className="relative h-10 w-7" style={{ transformStyle: 'preserve-3d', animation: 'tileFlip 5s ease-in-out infinite' }}>
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><CardBack /></div>
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <MiniCard rank="K" suit="♥" />
        </div>
      </div>
      <span className="mb-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-emerald-950"
        style={{ animation: 'tileGlow 5s ease-in-out infinite' }}>21</span>
    </div>
  )
}

function PokerMotif() {
  const fan: [string, string][] = [['10', '♠'], ['J', '♠'], ['Q', '♠'], ['K', '♠'], ['A', '♠']]
  return (
    <div className="relative flex items-end" style={{ animation: 'tileFan 4s ease-in-out infinite' }}>
      {fan.map(([r, s], i) => (
        <MiniCard key={i} rank={r} suit={s}
          className={i === 0 ? 'origin-bottom' : '-ml-3 origin-bottom'}
          style={{ transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 2}px)`, zIndex: i }} />
      ))}
    </div>
  )
}

const MOTIF: Record<Game, JSX.Element> = {
  roulette: <RouletteMotif />,
  blackjack: <BlackjackMotif />,
  poker: <PokerMotif />,
  slots: <SlotsMotif />,
}

export default function GameTiles({ onPick }: { onPick: (g: Game) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {GAMES.map((g, i) => (
        <button
          key={g.key}
          onClick={() => onPick(g.key)}
          className="game-tile group reveal relative flex flex-col items-center justify-end overflow-hidden rounded-2xl border border-amber-500/25 p-4 pt-5 text-center transition-transform duration-300 hover:-translate-y-1 active:scale-95"
          style={{
            animationDelay: `${0.1 + i * 0.08}s`,
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 60%),'
              + 'linear-gradient(180deg, #0c2e1e, #06190f)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* accent glow that lifts in on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: `radial-gradient(ellipse at 50% 32%, ${g.accent}55, transparent 65%)` }} />
          {/* engraved gold inner frame */}
          <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-amber-400/15 transition-colors group-hover:border-amber-400/45" />
          {/* sheen sweep, revealed on hover */}
          <div className="sheen pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />

          {/* the living motif */}
          <div className="relative z-10 flex h-[72px] items-center justify-center">{MOTIF[g.key]}</div>

          <div className="relative z-10 mt-3 font-black uppercase tracking-[0.18em] text-amber-100"
            style={{ textShadow: `0 0 12px ${g.accent}66` }}>{g.label}</div>
          <div className="relative z-10 mt-0.5 text-[11px] text-amber-200/55">{g.blurb}</div>
        </button>
      ))}
    </div>
  )
}
