import { useTruefPrice } from '../../hooks/useTruefPrice'
import { TOKEN_COLOR, TOKEN_TICKER, PUMP_FUN_URL } from '../../lib/token'

// Sub-cent prices need significant figures, not fixed decimals.
const fmtPrice = (n: number) => '$' + (n >= 0.01 ? n.toFixed(4) : n.toPrecision(3))
const fmtCap = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

// Section header that sits between the pool table and the games table:
// "Gamble for $TRUEF" — the Rex Trueform mark + the live market cap/price of
// the real coin, teeing up the house games below it.
export default function TruefBanner() {
  const { data, isLoading, isError } = useTruefPrice()
  const up = (data?.change24h ?? 0) >= 0

  return (
    <section className="relative mt-12 overflow-hidden rounded-2xl border border-amber-400/30 bg-black/55 px-5 py-7 text-center shadow-[0_0_40px_rgba(245,200,80,0.18)] backdrop-blur-sm">
      {/* warm wash behind the heading */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,200,80,0.16), transparent 65%)' }}
      />

      <div className="relative">
        <img
          src="/logo.png"
          alt="Rex Trueform"
          className="mx-auto mb-3 h-14 w-14 rounded-xl ring-1 ring-amber-400/40 shadow-[0_0_24px_rgba(245,200,80,0.35)]"
        />
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-amber-300/80">★ Rex Trueform ★</p>

        <h2
          className="mt-1 font-black uppercase leading-none"
          style={{
            fontSize: 'clamp(1.7rem, 6vw, 2.8rem)',
            letterSpacing: '-0.01em',
            background: 'linear-gradient(160deg, #ffe9a8 0%, #f5d36b 35%, #c9971f 70%, #ffe9a8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(245,200,80,0.45))',
          }}
        >
          Gamble for ${TOKEN_TICKER}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-amber-100/70">
          Take on the house — Roulette, Blackjack, Poker &amp; Slots. Winner takes the $TRUEF.
        </p>

        {/* live market cap + price of the real coin */}
        <div className="mt-4 flex flex-wrap items-stretch justify-center gap-2.5">
          {isLoading ? (
            <span className="text-xs text-slate-400">loading $TRUEF price…</span>
          ) : isError || !data ? (
            <span className="text-xs text-slate-400">$TRUEF price unavailable</span>
          ) : (
            <>
              <Stat label="Market cap" value={fmtCap(data.marketCap)} highlight />
              <Stat label="Price" value={fmtPrice(data.price)} />
              <Stat
                label="24h"
                value={`${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(1)}%`}
                tone={up ? 'up' : 'down'}
              />
            </>
          )}
        </div>

        <a
          href={PUMP_FUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs font-semibold text-amber-300/80 underline-offset-4 hover:text-amber-200 hover:underline"
        >
          View ${TOKEN_TICKER} on pump.fun →
        </a>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  highlight,
  tone,
}: {
  label: string
  value: string
  highlight?: boolean
  tone?: 'up' | 'down'
}) {
  const valueColor = tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-white'
  return (
    <div
      className="min-w-[92px] rounded-xl border border-amber-400/20 bg-black/40 px-4 py-2"
      style={highlight ? { borderColor: 'rgba(245,200,80,0.5)' } : undefined}
    >
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p
        className={`text-lg font-black ${highlight ? '' : valueColor}`}
        style={highlight ? { color: TOKEN_COLOR } : undefined}
      >
        {value}
      </p>
    </div>
  )
}
