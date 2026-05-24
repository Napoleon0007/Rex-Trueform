import { useAuthStore } from '../../store/authStore'
import { useTokenBalance } from '../../hooks/useTokenBalance'

export default function TokenBadge() {
  const { user } = useAuthStore()
  const { data: balance } = useTokenBalance(user?.id)

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5">
      <span className="text-base leading-none">🪙</span>
      <span className="text-sm font-bold text-orange-400">
        {balance ?? '—'}
      </span>
    </div>
  )
}
