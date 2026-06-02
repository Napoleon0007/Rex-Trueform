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

// A tower of casino chips standing upright on the tilted felt. We counter-rotate
// the tilt so the stack stands vertically like a real chip tower seen at an angle.
function ChipStack3D({ colors, x, y }: { colors: string[]; x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%) rotateX(-54deg)', transformOrigin: 'bottom center' }}>
      <div className="flex flex-col-reverse items-center">
        {colors.map((c, i) => (
          <div key={i} className="h-[6px] w-9 rounded-full border border-black/40"
            style={{ background: c, marginTop: -2, boxShadow: 'inset 0 1px rgba(255,255,255,0.45), 0 1px 1px rgba(0,0,0,0.4)' }} />
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
              {/* ===== 3D table platform: tilted felt, brushed-silver rim, recessed wheel ===== */}
              <div className="stage-3d relative mb-6 overflow-hidden rounded-2xl border border-amber-900/30"
                style={{ height: 360, background: 'radial-gradient(ellipse at 50% 30%, #1b2a22 0%, #0a0f0c 70%)' }}>
                {/* ambient floor shadow the table casts */}
                <div className="pointer-events-none absolute left-1/2 top-[64%] h-24 w-[72%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl" />

                {/* croupier stands behind the table */}
                <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
                  <Croupier line={line} />
                </div>

                {/* the table laid back into the floor */}
                <div className="table-3d table-3d--enter absolute left-1/2"
                  style={{ top: '44%', width: 440, height: 280, marginLeft: -220, transformStyle: 'preserve-3d' }}>
                  {/* silver edge / apron */}
                  <div className="metal-silver absolute inset-0 rounded-[50%]"
                    style={{ boxShadow: '0 30px 55px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.55)' }} />
                  {/* felt top */}
                  <div className="felt-3d absolute overflow-hidden rounded-[50%]"
                    style={{ inset: 18, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)', transformStyle: 'preserve-3d' }}>
                    {/* recessed chrome wheel bowl at the far end of the felt */}
                    <div className="metal-silver absolute left-[24%] top-[12%] h-[42%] w-[28%] rounded-full"
                      style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.75), 0 5px 12px rgba(0,0,0,0.55)' }}>
                      <RouletteWheel idle className="absolute inset-[10%] h-[80%] w-[80%]" />
                    </div>
                    {/* chip towers standing on the felt */}
                    <ChipStack3D colors={['#c0182b', '#15110c', '#caa14a']} x={60} y={50} />
                    <ChipStack3D colors={['#0f7a3d', '#caa14a', '#caa14a', '#15110c']} x={73} y={64} />
                    <ChipStack3D colors={['#15110c', '#c0182b', '#caa14a']} x={38} y={70} />
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
