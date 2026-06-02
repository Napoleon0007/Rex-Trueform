import { rankLabel, isRed, type Card } from '../../lib/cards'
import PinUpArt from './PinUpArt'

// Face cards (J/Q/K) carry the vintage pin-up motif as a watermark behind the
// rank/suit; the rank and suit stay bold and legible so hands read at a glance.
// The card back is a gold pin-up on deep casino red.
export default function PlayingCard({ card, hidden, small }: { card?: Card; hidden?: boolean; small?: boolean }) {
  const w = small ? 'h-14 w-10 text-sm' : 'h-20 w-14 text-lg'

  if (hidden || !card) {
    return (
      <div className={`${w} relative overflow-hidden rounded-md border border-amber-900/50 shadow-md`}
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #7c1620, #5a0f17)' }}>
        <div className="absolute inset-1 rounded-sm border border-amber-400/40" />
        <PinUpArt color="#e9c46a" className="absolute inset-0 h-full w-full p-1.5 opacity-80" />
      </div>
    )
  }

  const red = isRed(card.suit)
  const isFace = card.rank >= 11
  return (
    <div className={`${w} relative overflow-hidden rounded-md border border-black/10 bg-[#fbfaf5] shadow-md font-bold ${red ? 'text-rose-600' : 'text-slate-900'} flex flex-col justify-between p-1 leading-none animate-[barServe_0.3s_ease-out]`}>
      {isFace && (
        <PinUpArt
          color={red ? '#e11d48' : '#1f2937'}
          className="pointer-events-none absolute inset-0 h-full w-full p-1"
          style={{ opacity: 0.18 }}
        />
      )}
      <span className="relative self-start">{rankLabel(card.rank)}</span>
      <span className="relative self-center text-xl">{card.suit}</span>
      <span className="relative self-end rotate-180">{rankLabel(card.rank)}</span>
    </div>
  )
}
