import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PREVIEW_ENABLED } from '../lib/devPreview'
import { usePreviewWallet } from '../store/previewWallet'

export function useTokenBalance(userId: string | undefined) {
  const previewBalance = usePreviewWallet((s) => s.balance)
  const query = useQuery({
    queryKey: ['token-balance', userId],
    enabled: !!userId && !PREVIEW_ENABLED,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_token_balance', {
        p_user_id: userId!,
      })
      if (error) throw error
      return data as number
    },
  })
  // In ?preview mode there's no real session — serve the local wallet instead.
  if (PREVIEW_ENABLED) return { ...query, data: previewBalance } as typeof query
  return query
}
