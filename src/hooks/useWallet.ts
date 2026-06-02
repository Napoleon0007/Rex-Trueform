import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { useTokenBalance } from './useTokenBalance'
import { usePreviewWallet } from '../store/previewWallet'
import { useSessionPnl } from '../store/sessionPnl'
import { PREVIEW_ENABLED } from '../lib/devPreview'
import { supabase } from '../lib/supabase'

// The casino betting wallet. There is ONE token system: every game spends and
// pays out the same current-month gold-token balance as predictions and the bar.
//
// • Real users  → bet/payout hit the casino_bet / casino_payout Supabase RPCs
//   (real ledger entries). The cached balance is updated optimistically so
//   canBet() and the on-screen total react instantly, then reconciled by a
//   refetch. A failed debit is rolled back.
// • ?preview     → spends against the local preview wallet so it's playable with
//   no Supabase session.
//
// Every bet/payout also feeds the session P&L tracker, so the games table can
// show how the night is going across all four games.
export function useWallet() {
  const { user } = useAuthStore()
  const { data: balance = 0 } = useTokenBalance(user?.id)
  const spend = usePreviewWallet((s) => s.spend)
  const add = usePreviewWallet((s) => s.add)
  const recordStake = useSessionPnl((s) => s.stake)
  const recordWin = useSessionPnl((s) => s.win)
  const qc = useQueryClient()

  const key = ['token-balance', user?.id]
  const bump = (delta: number) =>
    qc.setQueryData<number>(key, (b) => Math.max(0, (b ?? 0) + delta))
  const refresh = () => qc.invalidateQueries({ queryKey: ['token-balance'] })

  return {
    balance,
    canBet: (n: number) => balance >= n && n > 0,

    bet: (n: number, game = 'casino') => {
      if (n <= 0) return
      recordStake(n)
      if (PREVIEW_ENABLED) { spend(n); return }
      bump(-n) // optimistic debit
      supabase.rpc('casino_bet', { p_stake: n, p_game: game }).then(({ error }) => {
        if (error) bump(n) // roll back a rejected debit
        refresh()
      })
    },

    payout: (n: number, game = 'casino') => {
      if (n <= 0) return
      recordWin(n)
      if (PREVIEW_ENABLED) { add(n); return }
      bump(n) // optimistic credit
      supabase.rpc('casino_payout', { p_amount: n, p_game: game }).then(() => refresh())
    },
  }
}
