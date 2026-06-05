import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { PREVIEW_ENABLED } from '../lib/devPreview'

export interface PresentMember {
  id: string
  name: string
  avatar: string | null
}

// Live "who's in the casino" via Supabase Realtime Presence — no table needed.
// Each member tracks their name + avatar on a shared channel while this hook is
// mounted (i.e. while they're looking at the games table); everyone sees the set.
export function useCasinoPresence(): PresentMember[] {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [members, setMembers] = useState<PresentMember[]>([])

  const name = profile?.display_name ?? 'Player'
  const avatar = profile?.avatar_url ?? null

  useEffect(() => {
    if (PREVIEW_ENABLED || !user?.id) return

    const channel = supabase.channel('casino-room', { config: { presence: { key: user.id } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ name?: string; avatar?: string | null }>>
        setMembers(
          Object.entries(state).map(([id, metas]) => ({
            id,
            name: metas[0]?.name ?? 'Player',
            avatar: metas[0]?.avatar ?? null,
          })),
        )
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ name, avatar })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, name, avatar])

  return members
}
