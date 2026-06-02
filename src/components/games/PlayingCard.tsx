import { rankLabel, isRed, type Card } from '../../lib/cards'

export default function PlayingCard({ card, hidden, small }: { card?: Card; hidden?: boolean; small?: boolean }) {
  const w = small ? 'h-14 w-10 text-sm' : 'h-20 w-14 text-lg'
  if (hidden || !card) {
    return (
      <div className={`${w} rounded-md border border-amber-900/40 shadow-md`} style={{ background: 'repeating-linear-gradient(45deg,#7c1620,#7c1620 5px,#5a0f17 5px,#5a0f17 10px)' }} />
    )
  }
  const red = isRed(card.suit)
  return (
    <div className={`${w} relative rounded-md border border-black/10 bg-[#fbfaf5] shadow-md font-bold ${red ? 'text-rose-600' : 'text-slate-900'} flex flex-col justify-between p-1 leading-none animate-[barServe_0.3s_ease-out]`}>
      <span className="self-start">{rankLabel(card.rank)}</span>
      <span className="self-center text-xl">{card.suit}</span>
      <span className="self-end rotate-180">{rankLabel(card.rank)}</span>
    </div>
  )
}
