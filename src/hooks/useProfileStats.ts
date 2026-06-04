import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ProfileStats {
  received: number   // total tokens granted over time (welcome + monthly)
  spent: number      // total tokens wagered + spent at the bar
  gamesWon: number   // number of winning payouts (casino + predictions)
  fame: number       // months finished in the top 3
  shame: number      // months finished down (negative net)
}

// All derived from data the player can already read about themselves:
// their own transaction ledger + their monthly leaderboard rows.
export function useProfileStats(userId: string | undefined) {
  return useQuery<ProfileStats>({
    queryKey: ['profile-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [txnRes, monthRes] = await Promise.all([
        supabase.from('transactions').select('type, amount').eq('user_id', userId!),
        supabase.from('monthly_leaderboard').select('rank, tokens_won, tokens_wagered').eq('user_id', userId!),
      ])
      if (txnRes.error) throw txnRes.error

      const txns = txnRes.data ?? []
      const received = txns.filter((t) => t.type === 'allocation').reduce((s, t) => s + t.amount, 0)
      const spent = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
      const gamesWon = txns.filter((t) => t.type === 'payout').length

      const months = monthRes.data ?? []
      const fame = months.filter((m) => m.rank <= 3).length
      const shame = months.filter((m) => m.tokens_won - m.tokens_wagered < 0).length

      return { received, spent, gamesWon, fame, shame }
    },
  })
}
