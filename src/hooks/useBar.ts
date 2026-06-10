import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PREVIEW_ENABLED } from '../lib/devPreview'
import { usePreviewWallet } from '../store/previewWallet'

export type Drink = 'beer' | 'tequila'

const PREVIEW_COST: Record<Drink, number> = { beer: 2, tequila: 3 }

export function useOrderDrink() {
  const qc = useQueryClient()
  const wallet = usePreviewWallet()

  return useMutation({
    mutationFn: async (drink: Drink) => {
      // Preview mode: spend from the local wallet, no Supabase round-trip.
      if (PREVIEW_ENABLED) {
        const cost = PREVIEW_COST[drink]
        if (wallet.balance < cost) throw new Error(`Not enough $TRUEF: have ${wallet.balance}, need ${cost}`)
        wallet.spend(cost)
        return wallet.balance - cost
      }
      const { data, error } = await supabase.rpc('order_drink', { p_drink: drink })
      if (error) throw error
      return data as number // new balance
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['token-balance'] }),
  })
}
