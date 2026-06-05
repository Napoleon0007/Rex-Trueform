import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useJuice } from '../../store/juice'
import { DEALER_NAME } from '../../lib/dealerLines'

// Global win/lose feedback, mounted once at the app root. Listens to the juice
// store: a win rains gold "coins" (and screen-fills on a big one); both show a
// quick dealer one-liner. Pointer-transparent so it never blocks the table.
const GOLD = ['#f7931a', '#fcd34d', '#fbbf24', '#fff7cf', '#eab308']

export default function JuiceOverlay() {
  const seq = useJuice((s) => s.seq)
  const kind = useJuice((s) => s.kind)
  const big = useJuice((s) => s.big)
  const line = useJuice((s) => s.line)
  const [show, setShow] = useState(false)
  const fired = useRef(0)

  useEffect(() => {
    if (seq === 0 || seq === fired.current) return
    fired.current = seq
    setShow(true)

    if (kind === 'win') {
      confetti({ particleCount: big ? 150 : 80, spread: big ? 110 : 75, startVelocity: 45,
        origin: { y: 0.62 }, colors: GOLD, scalar: 1.1, ticks: 220 })
      if (big) {
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 75, origin: { x: 0 }, colors: GOLD }), 160)
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 75, origin: { x: 1 }, colors: GOLD }), 160)
      }
    }

    const t = setTimeout(() => setShow(false), kind === 'win' ? 2600 : 1500)
    return () => clearTimeout(t)
  }, [seq, kind, big])

  if (!show || !kind) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div className={kind === 'win' ? (big ? 'juice-flash-big' : 'juice-flash-win') : 'juice-flash-lose'} />
      <div
        className={`juice-pop relative mx-4 max-w-[260px] rounded-2xl border px-4 py-2 text-center text-sm font-bold shadow-2xl shadow-black/60 ${
          kind === 'win' ? 'border-amber-300/60 bg-black/85 text-amber-200' : 'border-rose-400/50 bg-black/85 text-rose-200'
        }`}
      >
        <span className="block text-[10px] uppercase tracking-[0.25em] opacity-70">{DEALER_NAME}</span>
        {line}
      </div>
    </div>
  )
}
