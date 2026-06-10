import { useRef, useState } from 'react'
import { makeDeck, shuffle, blackjackValue, rankLabel, type Card } from '../../lib/cards'
import { useWallet } from '../../hooks/useWallet'
import { toast } from '../../store/toastStore'
import { sfx } from '../../lib/sfx'
import { useJuice } from '../../store/juice'
import { useKidsWarning, KidsAtHomeModal } from './KidsWarning'
import CasinoStage from './CasinoStage'
import { FeltGameCard, FeltFlipCard, FeltDeck, FeltRing, BetChips, HudPill } from './feltPieces'

type Phase = 'bet' | 'player' | 'dealer' | 'done'
const CHIPS = [2, 5, 10, 25, 50, 100]

// fan a hand around the centre of the felt: index i of n → x%, with a slight tilt
const fanX = (i: number, n: number) => 50 + (i - (n - 1) / 2) * 6.5
const fanRot = (i: number, n: number) => (i - (n - 1) / 2) * 5

export default function Blackjack() {
  const wallet = useWallet()
  const celebrate = useJuice((s) => s.celebrate)
  const commiserate = useJuice((s) => s.commiserate)
  const kids = useKidsWarning()
  const deck = useRef<Card[]>([])
  const [bet, setBet] = useState(5)
  const [phase, setPhase] = useState<Phase>('bet')
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [msg, setMsg] = useState('Place your bet and deal.')

  const draw = () => {
    if (deck.current.length < 15) deck.current = shuffle(makeDeck())
    return deck.current.pop()!
  }

  const settle = (p: Card[], d: Card[]) => {
    const pv = blackjackValue(p).total, dv = blackjackValue(d).total
    const pBJ = p.length === 2 && pv === 21
    let win = 0, text = ''
    if (pv > 21) text = 'Bust. House wins.'
    else if (pBJ && !(d.length === 2 && dv === 21)) { win = bet * 2.5; text = 'Blackjack! 3:2 🎉' }
    else if (dv > 21 || pv > dv) { win = bet * 2; text = 'You win! ✊' }
    else if (pv === dv) { win = bet; text = 'Push — bet returned.' }
    else text = 'House wins.'
    if (win > 0) wallet.payout(Math.round(win), 'blackjack')
    if (win > bet) { Math.round(win) >= 200 ? sfx.jackpot() : sfx.win(); celebrate(Math.round(win)) }
    else if (win === 0) { sfx.lose(); commiserate() }
    setMsg(text)
    setPhase('done')
  }

  const dealerPlay = (p: Card[], d: Card[]) => {
    const hand = d.slice()
    while (blackjackValue(hand).total < 17) hand.push(draw())
    setDealer(hand)
    settle(p, hand)
  }

  function deal() {
    if (!wallet.canBet(bet)) { toast.error('Not enough $TRUEF'); return }
    wallet.bet(bet, 'blackjack')
    sfx.deal()
    const p = [draw(), draw()], d = [draw(), draw()]
    setPlayer(p); setDealer(d)
    if (blackjackValue(p).total === 21) { setPhase('dealer'); setMsg('Blackjack!'); setTimeout(() => dealerPlay(p, d), 600) }
    else { setPhase('player'); setMsg('Hit or stand?') }
  }

  function hit() {
    sfx.deal()
    const p = [...player, draw()]
    setPlayer(p)
    if (blackjackValue(p).total > 21) settle(p, dealer)
  }
  const stand = () => { setPhase('dealer'); dealerPlay(player, dealer) }
  function double() {
    if (!wallet.canBet(bet)) { toast.error('Not enough to double'); return }
    sfx.clink()
    wallet.bet(bet, 'blackjack'); setBet(bet * 2)
    const p = [...player, draw()]
    setPlayer(p)
    if (blackjackValue(p).total > 21) settle(p, dealer)
    else { setPhase('dealer'); dealerPlay(p, dealer) }
  }
  function next() { setPhase('bet'); setPlayer([]); setDealer([]); setMsg('Place your bet and deal.') }

  const hideHole = phase === 'player'
  const pv = blackjackValue(player).total
  const dv = blackjackValue(hideHole ? dealer.slice(0, 1) : dealer).total

  function pickBet(c: number) { sfx.clink(); kids.check(c); setBet(c) }

  return (
    <div className="space-y-4 text-center">
      <KidsAtHomeModal open={kids.open} onClose={kids.close} />

      {/* ── the hand plays out ON the diorama felt ── */}
      <CasinoStage
        mode="game"
        feltChildren={<FeltRing x={24} y={52} label="bet" />}
        tableChildren={
          <>
            <FeltDeck />
            {/* dealer's hand on her side of the felt — hole card flips on her turn */}
            {dealer.map((c, i) =>
              i === 1 ? (
                <FeltFlipCard key={i} x={fanX(i, dealer.length)} y={26} rot={fanRot(i, dealer.length)}
                  rank={rankLabel(c.rank)} suit={c.suit} revealed={!hideHole} delay={0.3} />
              ) : (
                <FeltGameCard key={i} x={fanX(i, dealer.length)} y={26} rot={fanRot(i, dealer.length)}
                  rank={rankLabel(c.rank)} suit={c.suit} delay={i < 2 ? 0.15 : (i - 2) * 0.18} />
              )
            )}
            {/* your hand at the near rail */}
            {player.map((c, i) => (
              <FeltGameCard key={i} x={fanX(i, player.length)} y={74} rot={fanRot(i, player.length)}
                rank={rankLabel(c.rank)} suit={c.suit} delay={i < 2 ? i * 0.22 : 0} />
            ))}
            {/* your stake slides into the betting circle on deal */}
            <BetChips x={24} y={52} amount={phase === 'bet' ? 0 : bet} />
          </>
        }
        overlay={
          <>
            {dealer.length > 0 && (
              <HudPill style={{ left: '50%', top: '45%', transform: 'translateX(-50%)' }}>
                Dealer · {hideHole ? `${dv}+` : dv}
              </HudPill>
            )}
            {player.length > 0 && (
              <HudPill style={{ left: '50%', top: '88%', transform: 'translateX(-50%)' }}>
                You · {pv}
              </HudPill>
            )}
          </>
        }
      />

      <p className="text-sm font-semibold text-amber-100">{msg}</p>

      {/* controls */}
      {phase === 'bet' && (
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => pickBet(c)} className={`h-10 w-10 rounded-full border-2 text-xs font-black transition ${bet === c ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-white/20 text-slate-300'}`}>{c}</button>
            ))}
          </div>
          <button onClick={deal} className="rounded-full bg-amber-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-emerald-950 hover:bg-amber-400 active:scale-95 transition">Deal · {bet} Ŧ</button>
        </div>
      )}
      {phase === 'player' && (
        <div className="flex justify-center gap-2">
          <button onClick={hit} className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400 active:scale-95">Hit</button>
          <button onClick={stand} className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-400 active:scale-95">Stand</button>
          {player.length === 2 && <button onClick={double} className="rounded-full border-2 border-amber-400 px-6 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-400/10 active:scale-95">Double</button>}
        </div>
      )}
      {phase === 'done' && (
        <button onClick={next} className="rounded-full border-2 border-amber-400 px-8 py-2.5 text-sm font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400/10 active:scale-95">Next hand</button>
      )}
    </div>
  )
}
