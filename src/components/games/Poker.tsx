import { useRef, useState } from 'react'
import { makeDeck, shuffle, evaluate, compareScore, rankLabel, type Card } from '../../lib/cards'
import { useWallet } from '../../hooks/useWallet'
import { toast } from '../../store/toastStore'
import { sfx } from '../../lib/sfx'
import { useJuice } from '../../store/juice'
import { useKidsWarning, KidsAtHomeModal } from './KidsWarning'
import CasinoStage from './CasinoStage'
import { FeltGameCard, FeltFlipCard, FeltDeck, BetChips } from './feltPieces'

// Heads-up Texas Hold'em vs the house. Ante to see the flop, then bet across three
// streets — flop, turn, river — choosing 1, 2 or 5 each time. Best hand at the
// showdown takes the pot (the house matches your total stake).
type Phase = 'bet' | 'flop' | 'turn' | 'river' | 'showdown' | 'done'
const ANTES = [2, 5, 10, 25]
const BET_OPTIONS = [1, 2, 5]

export default function Poker() {
  const wallet = useWallet()
  const celebrate = useJuice((s) => s.celebrate)
  const commiserate = useJuice((s) => s.commiserate)
  const kids = useKidsWarning()
  const deck = useRef<Card[]>([])
  const [ante, setAnte] = useState(5)
  const [streetBet, setStreetBet] = useState(1)
  const [pot, setPot] = useState(0)
  const [phase, setPhase] = useState<Phase>('bet')
  const [hole, setHole] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [board, setBoard] = useState<Card[]>([])
  const [msg, setMsg] = useState('Ante up to see the flop.')

  const draw = () => deck.current.pop()!

  function deal() {
    if (!wallet.canBet(ante)) { toast.error('Not enough $TRUEF'); return }
    wallet.bet(ante, 'poker')
    sfx.deal()
    deck.current = shuffle(makeDeck())
    setHole([draw(), draw()]); setDealer([draw(), draw()]); setBoard([draw(), draw(), draw()])
    setPot(ante); setStreetBet(1)
    setPhase('flop'); setMsg('The flop is out — call to see the turn.')
  }

  function fold() {
    sfx.lose()
    commiserate()
    setMsg(`Folded — ${pot} Ŧ to the house.`)
    setPhase('done')
  }

  // One betting action per street: flop → deal the turn, turn → deal the river,
  // river → showdown. Each call stakes the chosen 1/2/5 into the pot.
  function callStreet() {
    const amt = streetBet
    if (!wallet.canBet(amt)) { toast.error('Not enough $TRUEF'); return }
    sfx.clink()
    wallet.bet(amt, 'poker')
    const newPot = pot + amt
    setPot(newPot)

    if (phase === 'flop') {
      setBoard((b) => [...b, draw()])            // the turn
      setPhase('turn'); setMsg('The turn. Call again to bring the river.')
    } else if (phase === 'turn') {
      setBoard((b) => [...b, draw()])            // the river
      setPhase('river'); setMsg('The river is out. One last bet, then showdown.')
    } else if (phase === 'river') {
      setPhase('showdown')
      settle(newPot)
    }
  }

  function settle(finalPot: number) {
    const me = evaluate([...hole, ...board])
    const dl = evaluate([...dealer, ...board])
    const cmp = compareScore(me.score, dl.score)
    let win = 0
    let text = ''

    if (cmp > 0) { win = finalPot * 2; text = `${me.name} beats ${dl.name} — you win ${finalPot} Ŧ! ✊` }
    else if (cmp === 0) { win = finalPot; text = `Tie on ${me.name} — push.` }
    else { text = `Dealer's ${dl.name} beats your ${me.name}.` }

    if (win > 0) wallet.payout(win, 'poker')
    if (cmp > 0) { win >= 200 ? sfx.jackpot() : sfx.win(); celebrate(win) }
    else if (cmp < 0) { sfx.lose(); commiserate() }
    setMsg(text)
    setPhase('done')
  }

  function next() {
    setPhase('bet'); setHole([]); setDealer([]); setBoard([]); setPot(0); setStreetBet(1)
    setMsg('Ante up to see the flop.')
  }

  const reveal = phase === 'showdown' || phase === 'done'
  const betting = phase === 'flop' || phase === 'turn' || phase === 'river'
  const actionLabel = phase === 'river' ? 'Bet' : 'Call'

  function pickAnte(c: number) { sfx.clink(); kids.check(c); setAnte(c) }
  function pickBet(c: number) { sfx.clink(); setStreetBet(c) }

  return (
    <div className="space-y-4 text-center">
      <KidsAtHomeModal open={kids.open} onClose={kids.close} />

      {/* ── the whole street plays out ON the diorama felt ── */}
      <CasinoStage
        mode="game"
        tableChildren={
          <>
            <FeltDeck />
            {/* dealer's hole cards stay face-down until showdown */}
            {dealer.map((c, i) => (
              <FeltFlipCard key={i} x={46 + i * 8} y={26} rot={i === 0 ? -4 : 4}
                rank={rankLabel(c.rank)} suit={c.suit} revealed={reveal} delay={0.25 + i * 0.12} />
            ))}
            {/* the community board across the centre */}
            {board.map((c, i) => (
              <FeltGameCard key={i} x={30 + i * 10} y={50} rot={(i - 2) * 2}
                rank={rankLabel(c.rank)} suit={c.suit} delay={i < 3 ? i * 0.16 : 0} />
            ))}
            {/* your hole cards at the near rail */}
            {hole.map((c, i) => (
              <FeltGameCard key={i} x={46 + i * 8} y={74} rot={i === 0 ? -5 : 5}
                rank={rankLabel(c.rank)} suit={c.suit} delay={i * 0.14} />
            ))}
            {/* the pot grows street by street */}
            <BetChips x={16} y={50} amount={pot} label="pot" />
          </>
        }
      />

      <p className="text-sm font-semibold text-amber-100">{msg}</p>

      {/* controls */}
      {phase === 'bet' && (
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {ANTES.map((c) => (
              <button key={c} onClick={() => pickAnte(c)} className={`h-9 w-9 rounded-full border-2 text-xs font-black transition ${ante === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
            ))}
          </div>
          <button onClick={deal} className="rounded-full bg-amber-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 hover:bg-amber-400 active:scale-95">Ante · {ante} Ŧ</button>
        </div>
      )}
      {betting && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-300/60">Bet</span>
            {BET_OPTIONS.map((c) => (
              <button key={c} onClick={() => pickBet(c)} className={`h-9 w-9 rounded-full border-2 text-xs font-black transition ${streetBet === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={callStreet} className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400 active:scale-95">{actionLabel} · {streetBet} Ŧ</button>
            <button onClick={fold} className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-400 active:scale-95">Fold</button>
          </div>
        </div>
      )}
      {phase === 'done' && (
        <button onClick={next} className="rounded-full border-2 border-amber-400 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">Next hand</button>
      )}
    </div>
  )
}
