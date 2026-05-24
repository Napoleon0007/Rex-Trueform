import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Profile } from '../types/database'

export function useAuthListener() {
  const { setAuth, setLoading, setProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session)
      if (!session) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [setAuth, setLoading, setProfile])
}

export function useProfile(userId: string | undefined) {
  const { setProfile } = useAuthStore()

  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single()
      if (error) throw error
      const profile = data as Profile
      setProfile(profile)
      return profile
    },
  })
}
