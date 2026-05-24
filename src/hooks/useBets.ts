import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Bet, BetWithProfile } from '../types/database'

export function useEventBets(eventId: string) {
  return useQuery({
    queryKey: ['bets', 'event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bets')
        .select('*, profiles(username, display_name, avatar_url)')
        .eq('event_id', eventId)
        .order('payout', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data as BetWithProfile[]
    },
  })
}

export function useUserBet(eventId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['bets', 'user', eventId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as Bet | null
    },
  })
}

export function usePlaceBet() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      prediction,
      amount,
    }: {
      eventId: string
      prediction: number
      amount: number
    }) => {
      const { data, error } = await supabase.rpc('place_bet', {
        p_event_id: eventId,
        p_prediction: prediction,
        p_amount: amount,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['bets', 'event', eventId] })
      qc.invalidateQueries({ queryKey: ['bets', 'user', eventId] })
      qc.invalidateQueries({ queryKey: ['token-balance'] })
    },
  })
}
