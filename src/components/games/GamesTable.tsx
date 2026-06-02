import { useState } from 'react'
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

// A stylised croupier standing at the table, ready to take your chips.
function Croupier({ line }: { line: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative mb-2 max-w-[150px] rounded-2xl bg-white px-3 py-1.5 text-center text-[11px] font-bold text-[#160a04] shadow-lg">
        {line}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
      <svg viewBox="0 0 120 130" className="h-32 w-auto origin-bottom animate-[dealerSway_4s_ease-in-out_infinite]" aria-hidden>
        {/* arms reaching to the felt */}
        <path d="M30 70 Q14 86 26 104" fill="none" stroke="#1c130a" strokeWidth="11" strokeLinecap="round" />
        <path d="M90 70 Q106 86 94 104" fill="none" stroke="#1c130a" strokeWidth="11" strokeLinecap="round" />
        <circle cx="26" cy="106" r="6" fill="#d8a878" />
        <circle cx="94" cy="106" r="6" fill="#d8a878" />
        {/* torso — black vest over white shirt */}
        <path d="M30 66 Q60 56 90 66 L94 120 L26 120 Z" fill="#15110c" />
        <path d="M52 60 L60 96 L68 60 Z" fill="#f5f3ec" />
        {/* bowtie */}
        <path d="M54 62 L60 66 L54 70 Z M66 62 L60 66 L66 70 Z" fill="#c0182b" />
        <circle cx="60" cy="66" r="2" fill="#7a1019" />
        {/* collar */}
        <path d="M52 60 L60 70 L56 58 Z M68 60 L60 70 L64 58 Z" fill="#fff" />
        {/* neck + head */}
        <rect x="55" y="48" width="10" height="10" rx="3" fill="#d8a878" />
        <circle cx="60" cy="38" r="15" fill="#e7b98a" />
        {/* hair */}
        <path d="M45 36 Q47 20 60 20 Q73 20 75 36 Q70 28 60 28 Q50 28 45 36 Z" fill="#241a12" />
        {/* eyes + smile */}
        <circle cx="54" cy="38" r="1.6" fill="#1c130a" />
        <circle cx="66" cy="38" r="1.6" fill="#1c130a" />
        <path d="M54 45 Q60 49 66 45" fill="none" stroke="#9b5a3c" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Decorative stacks of casino chips on the felt.
function ChipStack({ colors, x }: { colors: string[]; x: number }) {
  return (
    <div className="absolute bottom-1" style={{ left: `${x}%` }}>
      <div className="flex flex-col-reverse items-center">
        {colors.map((c, i) => (
          <div key={i} className="h-2 w-9 rounded-full border border-black/30"
            style={{ background: c, marginTop: -1, boxShadow: 'inset 0 1px rgba(255,255,255,0.4)' }} />
        ))}
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

export default function GamesTable() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const [game, setGame] = useState<Game | null>(null)
  const [line] = useState(() => BANTER[Math.floor(Math.random() * BANTER.length)])

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
              {/* ===== Live table scene: spinning wheel fixture, croupier, chips ===== */}
              <div className="relative mb-6 flex min-h-[200px] items-end justify-center gap-4 rounded-2xl border border-amber-900/30 bg-black/20 px-4 pb-6 pt-4">
                {/* idle wheel on the left, forever spinning */}
                <div className="relative h-28 w-28 shrink-0">
                  <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-amber-300" style={{ fontSize: 14 }}>▼</div>
                  <RouletteWheel idle className="h-full w-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]" />
                </div>
                {/* croupier centre stage */}
                <Croupier line={line} />
                {/* chip stacks on the felt */}
                <ChipStack colors={['#c0182b', '#c0182b', '#15110c', '#caa14a']} x={20} />
                <ChipStack colors={['#0f7a3d', '#caa14a', '#caa14a']} x={72} />
                <ChipStack colors={['#15110c', '#c0182b', '#caa14a', '#15110c', '#c0182b']} x={86} />
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
