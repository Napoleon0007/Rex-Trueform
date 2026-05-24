import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTokenBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ['token-balance', userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_token_balance', {
        p_user_id: userId!,
      })
      if (error) throw error
      return data as number
    },
  })
}
