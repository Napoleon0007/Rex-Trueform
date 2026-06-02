import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import Roulette from './Roulette'
import Blackjack from './Blackjack'
import Poker from './Poker'

type Game = 'roulette' | 'blackjack' | 'poker'

const GAMES: { key: Game; label: string; emoji: string; blurb: string }[] = [
  { key: 'roulette',  label: 'Roulette',  emoji: '🎡', blurb: 'Spin the wheel' },
  { key: 'blackjack', label: 'Blackjack', emoji: '🃏', blurb: 'Beat the dealer to 21' },
  { key: 'poker',     label: 'Poker',     emoji: '♠️', blurb: "Casino Hold'em vs the house" },
]

export default function GamesTable() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const [game, setGame] = useState<Game | null>(null)

  return (
    <div className="mt-10">
      <div className="overflow-hidden rounded-3xl border-4 border-[#3a2210] shadow-2xl shadow-black/60"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #0f7a47 0%, #0a5e38 45%, #064027 100%)' }}>
        {/* felt header */}
        <div className="flex items-center justify-between border-b border-black/20 px-5 py-3">
          <h3 className="font-black uppercase tracking-[0.2em] text-amber-300 text-sm">🎰 The Games Table</h3>
          <span className="rounded-full border border-amber-400/40 bg-black/30 px-3 py-1 text-xs font-bold text-amber-300">{balance} 🪙</span>
        </div>

        <div className="p-5">
          {!game ? (
            <div className="py-6 text-center">
              <p className="text-lg font-bold text-amber-50">What do you want to play?</p>
              <p className="mb-6 mt-1 text-sm text-amber-200/60">One table. Your call.</p>
              <div className="grid gap-3 sm:grid-cols-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
