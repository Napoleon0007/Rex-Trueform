import { useRef, useState } from 'react'
import { makeDeck, shuffle, evaluate, compareScore, type Card } from '../../lib/cards'
import { useWallet } from '../../hooks/useWallet'
import { toast } from '../../store/toastStore'
import PlayingCard from './PlayingCard'

// Casino Hold'em: heads-up vs the house. Ante, see the flop, then Call (2× ante)
// or Fold. Dealer qualifies with a pair of 4s or better.
type Phase = 'bet' | 'decision' | 'showdown' | 'done'
const CHIPS = [2, 5, 10, 25]

function qualifies(score: number[]) {
  return score[0] >= 2 || (score[0] === 1 && score[1] >= 4)
}

export default function Poker() {
  const wallet = useWallet()
  const deck = useRef<Card[]>([])
  const [ante, setAnte] = useState(5)
  const [callBet, setCallBet] = useState(0)
  const [phase, setPhase] = useState<Phase>('bet')
  const [hole, setHole] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [board, setBoard] = useState<Card[]>([])
  const [msg, setMsg] = useState('Ante up to see the flop.')

  const draw = () => deck.current.pop()!

  function deal() {
    if (!wallet.canBet(ante)) { toast.error('Not enough tokens'); return }
    wallet.bet(ante); setCallBet(0)
    deck.current = shuffle(makeDeck())
    setHole([draw(), draw()]); setDealer([draw(), draw()]); setBoard([draw(), draw(), draw()])
    setPhase('decision'); setMsg('Call (2× ante) or fold?')
  }

  function fold() { setMsg('Folded — ante lost.'); setPhase('done') }

  function call() {
    const c = ante * 2
    if (!wallet.canBet(c)) { toast.error('Not enough tokens to call'); return }
    wallet.bet(c); setCallBet(c)
    const full = [...board, draw(), draw()]   // turn + river
    setBoard(full)
    setPhase('showdown')
    settle(full, c)
  }

  function settle(full: Card[], c: number) {
    const me = evaluate([...hole, ...full])
    const dl = evaluate([...dealer, ...full])
    const cmp = compareScore(me.score, dl.score)
    const dq = qualifies(dl.score)
    let win = 0, text = ''

    if (cmp > 0) {
      if (dq) { win = ante * 2 + c * 2; text = `${me.name} beats ${dl.name} — you win! ✊` }
      else { win = ante * 2 + c; text = `${me.name} wins · dealer didn't qualify (call pushes).` }
    } else if (cmp === 0) {
      win = ante + c; text = `Tie on ${me.name} — push.`
    } else {
      text = dq ? `Dealer's ${dl.name} beats your ${me.name}.` : `Dealer wins with ${dl.name}.`
    }
    if (win > 0) wallet.payout(win)
    setMsg(text)
    setPhase('done')
  }

  function next() { setPhase('bet'); setHole([]); setDealer([]); setBoard([]); setCallBet(0); setMsg('Ante up to see the flop.') }

  const reveal = phase === 'showdown' || phase === 'done'

  return (
    <div className="space-y-4 text-center">
      {/* dealer */}
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-widest text-emerald-300/70">Dealer</p>
        <div className="flex justify-center gap-1.5">
          {dealer.map((c, i) => <PlayingCard key={i} card={c} hidden={!reveal} small />)}
          {dealer.length === 0 && <div className="h-14" />}
        </div>
      </div>

      {/* board */}
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-widest text-amber-300/60">Board</p>
        <div className="flex justify-center gap-1.5">
          {board.map((c, i) => <PlayingCard key={i} card={c} small />)}
          {board.length === 0 && <div className="h-14" />}
        </div>
      </div>

      <p className="text-sm font-semibold text-amber-100">{msg}</p>

      {/* player */}
      <div>
        <div className="flex justify-center gap-1.5">
          {hole.map((c, i) => <PlayingCard key={i} card={c} small />)}
          {hole.length === 0 && <div className="h-14" />}
        </div>
        <p className="mt-1.5 text-xs uppercase tracking-widest text-amber-300/70">
          You {callBet > 0 && `· ante ${ante} + call ${callBet}`}
        </p>
      </div>

      {/* controls */}
      {phase === 'bet' && (
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => setAnte(c)} className={`h-9 w-9 rounded-full border-2 text-xs font-black transition ${ante === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
            ))}
          </div>
          <button onClick={deal} className="rounded-full bg-amber-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 hover:bg-amber-400 active:scale-95">Ante · {ante} 🪙</button>
        </div>
      )}
      {phase === 'decision' && (
        <div className="flex justify-center gap-2">
          <button onClick={call} className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400 active:scale-95">Call · {ante * 2} 🪙</button>
          <button onClick={fold} className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-400 active:scale-95">Fold</button>
        </div>
      )}
      {phase === 'done' && (
        <button onClick={next} className="rounded-full border-2 border-amber-400 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">Next hand</button>
      )}
    </div>
  )
}
