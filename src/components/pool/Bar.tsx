import { useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useOrderDrink, type Drink } from '../../hooks/useBar'
import { toast } from '../../store/toastStore'

interface DrinkDef { key: Drink; label: string; emoji: string; cost: number; stream: string }
const DRINKS: DrinkDef[] = [
  { key: 'beer',    label: 'Beer',         emoji: '🍺', cost: 2, stream: '#f0b429' },
  { key: 'tequila', label: 'Tequila shot', emoji: '🥃', cost: 3, stream: '#e9d9a8' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A little glass bottle for the back-bar shelves.
function Bottle({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: 3, height: 7, background: to, borderRadius: 1 }} />
      <div style={{ width: 11, height: 26, borderRadius: 3, background: `linear-gradient(180deg, ${from}, ${to})`, boxShadow: 'inset -2px 0 rgba(255,255,255,0.25), inset 2px 0 rgba(0,0,0,0.25)' }} />
    </div>
  )
}

const SHELF_BOTTLES = [
  ['#caa14a', '#7a4d12'], ['#d9e6f2', '#9fb3c8'], ['#3f8f5a', '#185c2f'],
  ['#e0b03a', '#8a5a12'], ['#c0392b', '#7a1f17'], ['#8fa9c9', '#3b5572'],
]

// The bartender — a background-free cutout (Mike Tyson) standing in the bar so
// the back-bar shows behind him. Subtle weight-shift sway while idle, quick lean
// when pouring. The contact shadow on the counter sells him standing there.
function Barman({ pouring }: { pouring: boolean }) {
  return (
    <div
      className={pouring ? 'origin-bottom -rotate-2' : 'animate-[barBob_3.2s_ease-in-out_infinite]'}
      style={{ transition: 'transform 0.3s' }}
    >
      <img
        src="/tyson-cut.png"
        alt="Bartender — Mike Tyson"
        className="h-44 w-auto object-contain"
        style={{ filter: 'drop-shadow(0 12px 10px rgba(0,0,0,0.65))' }}
      />
    </div>
  )
}

export default function Bar() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const order = useOrderDrink()
  const nextId = useRef(1)

  const [served, setServed] = useState<{ id: number; emoji: string }[]>([])
  const [pouring, setPouring] = useState<DrinkDef | null>(null)
  const [spent, setSpent] = useState(0)

  async function buy(d: DrinkDef) {
    if (balance < d.cost || order.isPending || pouring) return
    setPouring(d)
    try {
      await order.mutateAsync(d.key)
      await sleep(650) // let the barman finish the pour
      setServed((s) => [...s, { id: nextId.current++, emoji: d.emoji }].slice(-8))
      setSpent((v) => v + d.cost)
      toast.success(`${d.label} poured · −${d.cost} 🪙`, d.emoji)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The bar is closed')
    } finally {
      setPouring(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-900/60 shadow-2xl shadow-black/70">
      {/* ===== 3D bar diorama: receding back wall, Tyson, polished counter ===== */}
      <div className="stage-3d relative overflow-hidden" style={{ height: 320, background: 'linear-gradient(180deg,#2a1206,#160a04)' }}>
        {/* back-bar wall, pushed into depth so the shelves recede behind him */}
        <div className="absolute inset-x-0 top-0 px-6 pt-3" style={{ transform: 'translateZ(-170px) scale(1.12)', transformOrigin: 'top center' }}>
          <div className="pointer-events-none absolute inset-2 rounded-lg" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,210,130,0.22), transparent 70%)' }} />
          <p className="relative text-center text-[11px] font-black uppercase tracking-[0.5em] text-amber-300" style={{ textShadow: '0 0 14px rgba(245,200,80,0.8)' }}>
            ★ Open Bar ★
          </p>
          <div className="relative mt-3 space-y-2">
            {[0, 1].map((row) => (
              <div key={row}>
                <div className="flex items-end justify-center gap-2">
                  {SHELF_BOTTLES.slice(row * 3, row * 3 + 3).concat(SHELF_BOTTLES.slice(row * 3, row * 3 + 3)).map(([f, t], i) => (
                    <Bottle key={i} from={f} to={t} />
                  ))}
                </div>
                <div className="mx-2 h-1 rounded bg-gradient-to-b from-[#5a3a1d] to-[#2e1c0d] shadow" />
              </div>
            ))}
          </div>
        </div>

        {/* Tyson standing behind the bar (mid-depth, in front of the shelves) */}
        <div className="absolute bottom-[70px] left-1/2 z-10 -translate-x-1/2">
          <Barman pouring={!!pouring} />
        </div>

        {/* speech bubble — off to the right so we can see his face, tail points back to his mouth */}
        <div className="absolute right-3 top-8 z-20 max-w-[165px]">
          <div className="relative rounded-2xl bg-white px-3.5 py-2 text-xs font-bold leading-snug text-[#160a04] shadow-lg">
            {pouring ? 'Coming right up! 🍾' : "What'll it be, punk? Step up to my bar."}
            <span className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 bg-white" />
          </div>
        </div>

        {/* pour animation */}
        {pouring && (
          <div className="absolute bottom-[80px] right-10 z-20 flex flex-col items-center">
            <span className="text-2xl leading-none origin-bottom animate-[barPour_0.9s_ease-in-out]" style={{ display: 'inline-block' }}>🍾</span>
            <div
              className="origin-top animate-[barStream_0.9s_ease-in-out]"
              style={{ width: 3, height: 26, background: pouring.stream, borderRadius: 2, boxShadow: `0 0 6px ${pouring.stream}` }}
            />
            <span className="text-xl leading-none">{pouring.emoji}</span>
          </div>
        )}

        {/* 3D counter: polished top tilting toward the viewer + thick front apron */}
        <div className="absolute inset-x-0 bottom-0 z-10" style={{ transformStyle: 'preserve-3d' }}>
          <div className="bar-wood-top bar-gloss relative h-16" style={{ transform: 'rotateX(66deg)', transformOrigin: 'bottom', boxShadow: '0 -10px 24px rgba(0,0,0,0.45)' }}>
            {/* served drinks resting on the bar, counter-rotated so they stand up */}
            <div className="absolute inset-x-3 bottom-1 flex items-end justify-center gap-1.5" style={{ transform: 'rotateX(-66deg)', transformOrigin: 'bottom' }}>
              {served.length === 0
                ? <span className="text-xs italic text-amber-100/40">The bar's empty — call him over.</span>
                : served.map((s) => (
                    <span key={s.id} className="text-2xl leading-none animate-[barServe_0.45s_ease-out]" style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.6))' }}>
                      {s.emoji}
                    </span>
                  ))}
            </div>
          </div>
          <div className="bar-wood-face h-7 w-full" />
        </div>
      </div>

      {/* ===== Order panel ===== */}
      <div className="bg-[#160a04] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-amber-300">Order a round</span>
          <span className="text-xs text-amber-200/60">Tab: {spent} 🪙</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DRINKS.map((d) => {
            const afford = balance >= d.cost
            return (
              <button
                key={d.key}
                onClick={() => buy(d)}
                disabled={!afford || order.isPending || !!pouring}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-all active:scale-95 ${
                  afford && !pouring
                    ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20'
                    : 'border-white/10 opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl leading-none">{d.emoji}</span>
                <span className="text-xs font-semibold text-amber-100">{d.label}</span>
                <span className="text-[11px] font-bold text-amber-400">{d.cost} 🪙</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-amber-200/50">
          {pouring ? 'Pouring…' : `Paid from your balance · ${balance} 🪙 left`}
        </p>
      </div>
    </div>
  )
}
