import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeaderboardEntry, YearlyLeaderboardEntry } from '../types/database'

export function useMonthlyLeaderboard(year: number, month: number) {
  return useQuery({
    queryKey: ['leaderboard', 'monthly', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('rank', { ascending: true })
      if (error) throw error
      return data as LeaderboardEntry[]
    },
  })
}

export function useYearlyLeaderboard(year: number) {
  return useQuery({
    queryKey: ['leaderboard', 'yearly', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearly_leaderboard')
        .select('*')
        .eq('year', year)
        .order('rank', { ascending: true })
      if (error) throw error
      return data as YearlyLeaderboardEntry[]
    },
  })
}
