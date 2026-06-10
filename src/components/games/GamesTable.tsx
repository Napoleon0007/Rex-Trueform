import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useSessionPnl } from '../../store/sessionPnl'
import CasinoStage from './CasinoStage'
import Roulette from './Roulette'
import Blackjack from './Blackjack'
import Poker from './Poker'
import Slots from './Slots'
import MuteButton from './MuteButton'
import Modal from '../ui/Modal'
import CasinoStats from './CasinoStats'
import CasinoPresence from './CasinoPresence'
import GameTiles, { type Game } from './GameTiles'

// The diorama itself lives in CasinoStage — every game now plays ON it, so this
// component is just the felt header, the picker and the game switch.

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
      {up ? '▲' : '▼'} {up ? '+' : ''}{net} Ŧ tonight
    </button>
  )
}

export default function GamesTable() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const [game, setGame] = useState<Game | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Choosing a game collapses the tall 3D table to the compact game view. Without
  // this the page keeps its old scroll offset and ends up on the Hall of Fame
  // below — so bring the table back to the top and open the game in place.
  useEffect(() => {
    if (game) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [game])

  return (
    <div ref={rootRef} className="mt-10 scroll-mt-4">
      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Your casino stats">
        <CasinoStats />
      </Modal>
      <div className="overflow-hidden rounded-3xl border-4 border-[#3a2210] shadow-2xl shadow-black/60"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #0f7a47 0%, #0a5e38 45%, #064027 100%)' }}>
        {/* felt header */}
        <div className="flex items-center justify-between gap-2 border-b border-black/20 px-5 py-3">
          <h3 className="font-black uppercase tracking-[0.2em] text-amber-300 text-sm">🎰 The Games Table</h3>
          <div className="flex items-center gap-2">
            <PnlChip />
            <span className="rounded-full border border-amber-400/40 bg-black/30 px-3 py-1 text-xs font-bold text-amber-300">{balance} Ŧ</span>
            <MuteButton />
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              title="Your casino stats"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-black/30 text-sm text-amber-300 transition hover:border-amber-400/70 active:scale-90"
            >📊</button>
          </div>
        </div>

        <div className="p-5">
          {!game ? (
            <div>
              {/* ===== the 3D diorama, dressed for "between games" ===== */}
              <CasinoStage mode="picker" />

              <CasinoPresence />

              <div className="text-center">
                <p className="text-lg font-bold text-amber-50">What do you want to play?</p>
                <p className="mb-6 mt-1 text-sm text-amber-200/60">One table. One stack of gold. Your call.</p>
              </div>
              <GameTiles onPick={setGame} />
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
