import { useAuthStore } from '../store/authStore'
import { useTokenBalance } from './useTokenBalance'
import { usePreviewWallet } from '../store/previewWallet'
import { PREVIEW_ENABLED } from '../lib/devPreview'

// A small betting wallet used by the casino games. In ?preview mode it spends
// and pays out against the local preview wallet so everything is playable now.
// (Real-money play vs the house would route bet/payout through Supabase RPCs.)
export function useWallet() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const spend = usePreviewWallet((s) => s.spend)
  const add = usePreviewWallet((s) => s.add)

  return {
    balance,
    canBet: (n: number) => balance >= n && n > 0,
    bet: (n: number) => { if (PREVIEW_ENABLED) spend(n) },
    payout: (n: number) => { if (PREVIEW_ENABLED && n > 0) add(n) },
  }
}
