import PoolTable from './PoolTable'
import Bar from './Bar'
import TrophyWall from './TrophyWall'
import GamesTable from '../games/GamesTable'
import VelvetCurtain from './VelvetCurtain'

// Springbok green-and-gold velvet carpet with a gold damask weave + vignette.
const CARPET: React.CSSProperties = {
  backgroundColor: '#0a5c3b',
  backgroundImage: `
    radial-gradient(circle at 50% -10%, rgba(255,225,150,0.12), transparent 45%),
    radial-gradient(circle at 18% 28%, rgba(11,90,58,0.7), transparent 42%),
    radial-gradient(circle at 82% 72%, rgba(11,90,58,0.7), transparent 42%),
    repeating-linear-gradient(45deg,  rgba(201,151,31,0.07) 0 14px, transparent 14px 28px),
    repeating-linear-gradient(-45deg, rgba(201,151,31,0.07) 0 14px, transparent 14px 28px),
    linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.62))
  `,
}

// Allover carpet pattern: a SOLID leaping-springbok silhouette tiled in faint
// gold (original artwork — filled body & tapered legs, not the stick-figure look).
const SPRINGBOK_TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 120' width='150' height='120'>` +
  `<g transform='translate(14,26)' fill='#e9c46a'>` +
  `<ellipse cx='62' cy='46' rx='28' ry='13'/>` +
  `<circle cx='38' cy='46' r='15'/>` +
  `<circle cx='84' cy='46' r='12'/>` +
  `<path d='M82 38 Q96 30 100 18 L94 14 Q88 28 78 40 Z'/>` +
  `<ellipse cx='103' cy='15' rx='9' ry='6' transform='rotate(20 103 15)'/>` +
  `<path d='M108 12 L120 7 L116 15 L109 18 Z'/>` +
  `<path d='M99 8 Q104 -5 100 -9 L98 -8 Q101 -3 97 8 Z'/>` +
  `<path d='M102 8 Q107 -4 103 -9 L101 -8 Q104 -3 100 8 Z'/>` +
  `<path d='M24 44 L15 52 L20 54 L28 48 Z'/>` +
  `<path d='M32 56 L25 80 L31 81 L39 58 Z'/>` +
  `<path d='M46 58 L41 82 L47 83 L52 60 Z'/>` +
  `<path d='M80 56 L92 78 L97 76 L86 56 Z'/>` +
  `<path d='M72 58 L80 82 L85 80 L78 58 Z'/>` +
  `</g></svg>`,
)}")`

function VelvetRope() {
  return (
    <svg viewBox="0 0 420 64" className="mx-auto w-full max-w-sm" aria-hidden>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#c9971f" />
          <stop offset="1" stopColor="#7a5a10" />
        </linearGradient>
        <linearGradient id="rope" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8860b" />
          <stop offset="0.5" stopColor="#ffd86b" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      {/* sagging rope */}
      <path d="M60 18 Q210 70 360 18" fill="none" stroke="url(#rope)" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 18 Q210 70 360 18" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" strokeLinecap="round" transform="translate(0,3)" />
      {/* posts */}
      {[60, 360].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="18" width="8" height="40" rx="3" fill="url(#brass)" />
          <ellipse cx={x} cy="58" rx="16" ry="5" fill="rgba(0,0,0,0.4)" />
          <circle cx={x} cy="14" r="9" fill="url(#brass)" stroke="#6b4e0d" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}

export default function PoolLounge() {
  return (
    <section className="relative min-h-screen overflow-hidden" style={{ ...CARPET, zIndex: 2 }}>
      {/* velvet curtains that part as you scroll into the lounge */}
      <VelvetCurtain />
      {/* warm spotlight */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(255,210,120,0.10), transparent 60%)' }} />
      {/* springbok silhouette tiled across the whole carpet */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.13]" style={{ backgroundImage: SPRINGBOK_TILE, backgroundSize: '132px 106px' }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-14">
        <VelvetRope />

        <div className="mt-2 text-center">
          <img src="/springbok-logo.jpeg" alt="Springbok" className="mx-auto mb-3 h-24 w-auto rounded-xl drop-shadow-[0_4px_16px_rgba(201,151,31,0.4)]" />
          <p className="inline-block rounded-md border border-amber-400/50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.4em] text-amber-300 shadow-[0_0_24px_rgba(245,200,80,0.35)]">
            ★ Members Only ★
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-amber-50" style={{ fontSize: 'clamp(1.8rem, 7vw, 3.5rem)', textShadow: '0 0 22px rgba(245,200,80,0.45)' }}>
            The Boys' Quarters
          </h2>
          <p className="mt-1 text-sm text-amber-200/70">Rack 'em up. House rules. Drinks on your tab.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PoolTable />
          </div>
          <div>
            <Bar />
          </div>
        </div>

        <GamesTable />

        <TrophyWall />
      </div>
    </section>
  )
}
