import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface CasinoStats {
  played: number          // casino bets placed
  won: number             // total tokens paid out
  wagered: number         // total tokens staked
  net: number             // won - wagered
  biggestWin: number      // largest single payout
  winRate: number         // payouts / bets, 0..1
  favourite: string | null // most-played game
}

// Derived purely from the player's own ledger: casino rows are tagged
// reference_type='casino', and the game name lives in the description
// ("Staked 5 on roulette" / "Won 10 at blackjack").
export function useCasinoStats(userId: string | undefined) {
  return useQuery<CasinoStats>({
    queryKey: ['casino-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount, description')
        .eq('user_id', userId!)
        .eq('reference_type', 'casino')
      if (error) throw error

      const rows = data ?? []
      const bets = rows.filter((r) => r.type === 'bet')
      const payouts = rows.filter((r) => r.type === 'payout')

      const wagered = bets.reduce((s, r) => s + Math.abs(r.amount), 0)
      const won = payouts.reduce((s, r) => s + r.amount, 0)
      const biggestWin = payouts.reduce((m, r) => Math.max(m, r.amount), 0)
      const played = bets.length
      const winRate = played ? payouts.length / played : 0

      const counts: Record<string, number> = {}
      for (const b of bets) {
        const g = b.description?.split(' on ').pop()?.trim()
        if (g) counts[g] = (counts[g] ?? 0) + 1
      }
      const favourite = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] ?? null

      return { played, won, wagered, net: won - wagered, biggestWin, winRate, favourite }
    },
  })
}
