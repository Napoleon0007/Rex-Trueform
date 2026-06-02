import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'

export default function TokenBadge() {
  const { user } = useAuthStore()
  const { data: balance } = useTokenBalance(user?.id)

  const isEmpty = balance === 0
  const isLow = typeof balance === 'number' && balance > 0 && balance <= 5

  const tone = isEmpty
    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
    : isLow
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
    : 'border-orange-500/40 bg-orange-500/10 text-orange-400'

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone}`}
      title={isEmpty ? 'Out of tokens for this month' : isLow ? 'Running low on tokens' : 'Your token balance'}
    >
      <span className="text-base leading-none">🪙</span>
      <span className="text-sm font-bold">{balance ?? '—'}</span>
      {(isLow || isEmpty) && (
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {isEmpty ? 'empty' : 'low'}
        </span>
      )}
    </div>
  )
}
