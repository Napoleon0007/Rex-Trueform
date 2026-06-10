import { useTruefPrice } from '../../hooks/useTruefPrice'
import { TOKEN_TICKER, TOKEN_COLOR, PUMP_FUN_URL } from '../../lib/token'

// Tiny sub-cent prices need significant figures, not fixed decimals.
const fmtPrice = (n: number) => '$' + (n >= 0.01 ? n.toFixed(4) : n.toPrecision(3))

const fmtCap = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

// The live $TRUEF strip that sits under the header. Market cap is the headline
// (Luke's call), then price, then the 24h move. The whole bar taps through to
// the real coin on pump.fun.
export default function PriceTicker() {
  const { data, isLoading, isError } = useTruefPrice()
  const up = (data?.change24h ?? 0) >= 0

  return (
    <a
      href={PUMP_FUN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-t border-casino-line bg-black/80 backdrop-blur-md transition-colors hover:bg-black/60"
      title="View $TRUEF on pump.fun"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-4 sm:px-6 py-1.5 text-xs sm:text-sm">
        <span className="font-black tracking-wide" style={{ color: TOKEN_COLOR }}>
          ${TOKEN_TICKER}
        </span>

        {isLoading ? (
          <span className="text-slate-500">loading price…</span>
        ) : isError || !data ? (
          <span className="text-slate-500">price unavailable</span>
        ) : (
          <>
            <span className="flex items-baseline gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">MC</span>
              <span className="font-black text-white">{fmtCap(data.marketCap)}</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-semibold text-slate-300">{fmtPrice(data.price)}</span>
            <span className={`font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {up ? '▲' : '▼'} {data.change24h >= 0 ? '+' : ''}
              {data.change24h.toFixed(1)}%
            </span>
          </>
        )}

        <span className="hidden text-slate-600 sm:inline">·</span>
        <span className="hidden text-[11px] text-slate-500 sm:inline">pump.fun →</span>
      </div>
    </a>
  )
}
