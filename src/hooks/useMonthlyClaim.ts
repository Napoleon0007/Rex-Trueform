import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PREVIEW_ENABLED } from '../lib/devPreview'

// On open, every signed-in member silently claims their current month's 1,000
// $TRUEF — if they haven't already this month. The grant is idempotent on the
// server (one monthly_allocations row per member per month, see migration 011),
// so calling it on every load is safe: it only ever pays out once a month.
export function useMonthlyClaim(userId: string | undefined) {
  const qc = useQueryClient()
  const claimedFor = useRef<string | null>(null)

  useEffect(() => {
    // No real session under ?preview — the RPC would just reject (auth.uid() null).
    if (!userId || PREVIEW_ENABLED) return
    if (claimedFor.current === userId) return
    claimedFor.current = userId

    supabase.rpc('claim_monthly_tokens').then(({ error }) => {
      if (error) {
        // Never block the app on a claim hiccup — they keep their last balance.
        // Clear the guard so the next mount can retry.
        claimedFor.current = null
        return
      }
      qc.invalidateQueries({ queryKey: ['token-balance', userId] })
      qc.invalidateQueries({ queryKey: ['profile', userId] })
    })
  }, [userId, qc])
}
