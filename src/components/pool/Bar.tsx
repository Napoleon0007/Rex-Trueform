import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useOrderDrink, type Drink } from '../../hooks/useBar'
import { useSessionPnl } from '../../store/sessionPnl'
import { toast } from '../../store/toastStore'
import { GREET, WIN, LOSS, BEER, TEQUILA, BROKE, POURING, pickLine } from '../../lib/tysonLines'

interface DrinkDef { key: Drink; label: string; emoji: string; cost: number; stream: string }
const DRINKS: DrinkDef[] = [
  { key: 'beer',    label: 'Beer',         emoji: '🍺', cost: 2, stream: '#f0b429' },
  { key: 'tequila', label: 'Tequila shot', emoji: '🥃', cost: 3, stream: '#e9d9a8' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A single back-bar bottle, drawn to evoke a real spirit brand: signature glass
// tint, cap/foil and label colour, with the brand on the label (full name on hover).
interface BottleDef {
  name: string         // short label printed on the bottle
  full: string         // full brand name (hover tooltip)
  body: string         // glass colour
  body2?: string       // glass gradient end
  cap: string          // cap / foil colour
  label: string        // label background
  ink?: string         // label text colour
  square?: boolean     // square-shouldered bottle (Jack Daniel's etc.)
}

function Bottle({ b }: { b: BottleDef }) {
  const body2 = b.body2 ?? b.body
  return (
    <div className="flex flex-col items-center" title={b.full}>
      <div style={{ width: 4, height: 4, background: b.cap, borderRadius: '1.5px 1.5px 0 0' }} />
      <div style={{ width: 4, height: 6, background: `linear-gradient(90deg, ${b.body}, ${body2})` }} />
      <div style={{
        position: 'relative', width: 15, height: 28,
        borderRadius: b.square ? '2px' : '3px 3px 4px 4px',
        background: `linear-gradient(95deg, rgba(255,255,255,0.4), ${b.body} 28%, ${body2} 78%, rgba(0,0,0,0.35))`,
        boxShadow: 'inset -2px 0 rgba(0,0,0,0.32), inset 2px 0 rgba(255,255,255,0.28)',
      }}>
        <div style={{
          position: 'absolute', left: 1.5, right: 1.5, top: 9, height: 12,
          background: b.label, borderRadius: 1.5, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)',
        }}>
          <span style={{ fontSize: 4.6, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em', color: b.ink ?? '#1a1206', whiteSpace: 'nowrap' }}>{b.name}</span>
        </div>
      </div>
    </div>
  )
}

// Three shelves of real, recognisable brands — whisky up top, vodka & gin in the
// middle, rum/tequila/cognac & liqueurs on the bottom.
const SHELVES: BottleDef[][] = [
  [
    { name: 'JACK',     full: "Jack Daniel's",   body: '#3a2a16', body2: '#170f07', cap: '#0c0c0c', label: '#0c0c0c', ink: '#f4f4f4', square: true },
    { name: 'JAMESON',  full: 'Jameson',         body: '#1f5c2e', body2: '#0f3a1d', cap: '#d4af37', label: '#ece6c8', ink: '#1f5c2e' },
    { name: 'WALKER',   full: 'Johnnie Walker',  body: '#6b3f12', body2: '#3a2208', cap: '#0c0c0c', label: '#c8a14a', ink: '#160a04', square: true },
    { name: 'CHIVAS',   full: 'Chivas Regal',    body: '#7a4a12', body2: '#46290a', cap: '#1f3a6b', label: '#1f3a6b', ink: '#d4af37' },
    { name: 'GLEN',     full: 'Glenfiddich',     body: '#3a7a3a', body2: '#1f4a1f', cap: '#d4af37', label: '#ece6c8', ink: '#2f5f2f' },
    { name: 'BEAM',     full: 'Jim Beam',        body: '#6b3f12', body2: '#3a2208', cap: '#f4f4f4', label: '#f4f4f4', ink: '#b00020', square: true },
  ],
  [
    { name: 'ABSOLUT',  full: 'Absolut Vodka',   body: '#cfe0ea', body2: '#9fb3c8', cap: '#8a8f96', label: '#dbe8f2', ink: '#1f4a8a' },
    { name: 'SMIRNOFF', full: 'Smirnoff',        body: '#e0e8f0', body2: '#b8c4d0', cap: '#c0392b', label: '#c0392b', ink: '#f4f4f4' },
    { name: 'GOOSE',    full: 'Grey Goose',      body: '#dfeaf2', body2: '#aebfce', cap: '#1f3a6b', label: '#e8eef5', ink: '#1f3a6b' },
    { name: 'BELV',     full: 'Belvedere',       body: '#e6eef4', body2: '#bcccd8', cap: '#1a3a2a', label: '#dbe8f2', ink: '#1a3a2a' },
    { name: 'TANQ',     full: 'Tanqueray',       body: '#1f5c4a', body2: '#0f3a2e', cap: '#c8102e', label: '#c8102e', ink: '#f4f4f4' },
    { name: 'BOMBAY',   full: 'Bombay Sapphire', body: '#2a6bb0', body2: '#16407a', cap: '#d4af37', label: '#cfe0ea', ink: '#16407a' },
  ],
  [
    { name: 'BACARDI',  full: 'Bacardi',         body: '#e6ead0', body2: '#c4c8a8', cap: '#0c0c0c', label: '#f4f4f4', ink: '#111111' },
    { name: 'CAPTAIN',  full: 'Captain Morgan',  body: '#8a5a2b', body2: '#4d3017', cap: '#0c0c0c', label: '#9c1b1b', ink: '#f4d77a' },
    { name: 'HAVANA',   full: 'Havana Club',     body: '#6b4423', body2: '#3a2412', cap: '#0c0c0c', label: '#ece6c8', ink: '#7a1f17' },
    { name: 'PATRON',   full: 'Patrón',          body: '#e6ead0', body2: '#bcc0a0', cap: '#222222', label: '#d4af37', ink: '#160a04' },
    { name: 'HENNESSY', full: 'Hennessy',        body: '#7a3f12', body2: '#46220a', cap: '#0c0c0c', label: '#1a120a', ink: '#d4af37' },
    { name: 'JÄGER',    full: 'Jägermeister',    body: '#10200f', body2: '#050a05', cap: '#d4af37', label: '#e8a020', ink: '#160a04' },
  ],
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

  // Tyson's mouth: a quip that reacts to wins, losses, drinks and idle time.
  const [quip, setQuip] = useState(() => pickLine(GREET))
  const [quipKey, setQuipKey] = useState(0)
  const say = (lines: string[]) => { setQuip(pickLine(lines)); setQuipKey((k) => k + 1) }

  // React to your live session P&L (updated by every bet/payout, anywhere).
  const net = useSessionPnl((s) => s.net)
  const prevNet = useRef(net)
  useEffect(() => {
    if (net > prevNet.current) say(WIN)
    else if (net < prevNet.current) say(LOSS)
    prevNet.current = net
  }, [net])

  // Idle banter while he's got nothing else to say.
  useEffect(() => {
    const id = setInterval(() => { if (!pouring) say(GREET) }, 9000)
    return () => clearInterval(id)
  }, [pouring])

  async function buy(d: DrinkDef) {
    if (balance < d.cost || order.isPending || pouring) return
    setPouring(d)
    say(POURING)
    try {
      await order.mutateAsync(d.key)
      await sleep(650) // let the barman finish the pour
      setServed((s) => [...s, { id: nextId.current++, emoji: d.emoji }].slice(-8))
      setSpent((v) => v + d.cost)
      say(d.key === 'beer' ? BEER : TEQUILA)
      toast.success(`${d.label} poured · −${d.cost} ₿`, d.emoji)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The bar is closed'
      if (/not enough|insufficient/i.test(msg)) say(BROKE)
      toast.error(msg)
    } finally {
      setPouring(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-900/60 shadow-2xl shadow-black/70">
      {/* ===== 3D bar diorama: receding back wall, Tyson, polished counter ===== */}
      <div className="stage-3d relative overflow-hidden" style={{ height: 360, background: 'linear-gradient(180deg,#2a1206,#160a04)' }}>
        {/* back-bar wall, pushed into depth: a big bar mirror with three shelves of
            real-brand spirits, all receding behind the bartender */}
        <div className="absolute inset-x-0 top-0 px-5 pt-2" style={{ transform: 'translateZ(-170px) scale(1.12)', transformOrigin: 'top center' }}>
          {/* the mirror */}
          <div className="bar-mirror pointer-events-none absolute inset-1 rounded-lg" />
          {/* warm light pooling on the glass */}
          <div className="pointer-events-none absolute inset-2 rounded-lg" style={{ background: 'radial-gradient(ellipse at 50% 22%, rgba(255,210,130,0.20), transparent 70%)' }} />
          {/* etched header */}
          <p className="relative text-center text-[10px] font-black uppercase tracking-[0.5em] text-amber-200/90" style={{ textShadow: '0 0 10px rgba(245,200,80,0.75)' }}>
            ★ Open Bar ★
          </p>
          {/* three glass shelves of real brands */}
          <div className="relative mt-2 space-y-1.5">
            {SHELVES.map((shelf, r) => (
              <div key={r}>
                <div className="flex items-end justify-center gap-1.5">
                  {shelf.map((b, i) => <Bottle key={i} b={b} />)}
                </div>
                {/* glass shelf with a gold lip */}
                <div className="mx-1 mt-0.5 h-[3px] rounded-sm" style={{ background: 'linear-gradient(180deg, rgba(255,235,180,0.55), rgba(201,151,31,0.5) 45%, rgba(60,40,12,0.65))', boxShadow: '0 2px 5px rgba(0,0,0,0.55)' }} />
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
          <div key={quipKey} className="relative animate-fade-in rounded-2xl bg-white px-3.5 py-2 text-xs font-bold leading-snug text-[#160a04] shadow-lg">
            {quip}
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
          <span className="text-xs text-amber-200/60">Tab: {spent} ₿</span>
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
                <span className="text-[11px] font-bold text-amber-400">{d.cost} ₿</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-amber-200/50">
          {pouring ? 'Pouring…' : `Paid from your balance · ${balance} ₿ left`}
        </p>
      </div>
    </div>
  )
}
