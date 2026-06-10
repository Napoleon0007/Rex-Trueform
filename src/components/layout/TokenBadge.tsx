import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useTruefPrice } from '../../hooks/useTruefPrice'
import { TOKEN_GLYPH, TOKEN_COLOR, TOKEN_TICKER, TOKEN_NAME } from '../../lib/token'
import Modal from '../ui/Modal'

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 1 ? 6 : 2,
  }).format(n)

export default function TokenBadge() {
  const { user } = useAuthStore()
  const { data: balance } = useTokenBalance(user?.id)
  const [open, setOpen] = useState(false)

  const isEmpty = balance === 0
  const isLow = typeof balance === 'number' && balance > 0 && balance <= 5

  const tone = isEmpty
    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
    : isLow
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
    : 'border-orange-500/40 bg-orange-500/10 text-orange-400'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-transform hover:scale-105 active:scale-95 ${tone}`}
        title="Tap to see what your $TRUEF are worth"
      >
        <span className="text-base font-bold leading-none" style={{ color: TOKEN_COLOR }}>{TOKEN_GLYPH}</span>
        <span className="text-sm font-bold">{balance ?? '—'}</span>
        {(isLow || isEmpty) && (
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {isEmpty ? 'empty' : 'low'}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Your ${TOKEN_NAME}`}>
        <TruefValue balance={balance} />
      </Modal>
    </>
  )
}

function TruefValue({ balance }: { balance: number | undefined }) {
  const { data, isLoading, isError } = useTruefPrice()
  const price = data?.price
  const have = typeof balance === 'number'

  return (
    <div className="space-y-4 text-center">
      <div>
        <p className="text-4xl font-black" style={{ color: TOKEN_COLOR }}>
          {TOKEN_GLYPH} {have ? balance!.toLocaleString('en-US') : '—'}
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-400">your holdings</p>
      </div>

      <div className="rounded-xl border border-casino-line bg-black/30 p-5">
        {isLoading ? (
          <p className="text-sm text-slate-400">Fetching the live price…</p>
        ) : isError || !price ? (
          <p className="text-sm text-rose-400">Couldn’t reach the price feed — try again in a moment.</p>
        ) : (
          <>
            <p className="text-3xl font-black text-emerald-400">
              {have ? usd(balance! * price) : '—'}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              at <span className="font-semibold text-slate-200">{usd(price)}</span> per ${TOKEN_TICKER} · live
            </p>
          </>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        That’s what your stack is worth at the live ${TOKEN_TICKER} price on pump.fun. Dream big. 🤑
      </p>
    </div>
  )
}
