import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { EventStatus, EventWithResult } from '../types/database'

export function useEvents(status?: EventStatus) {
  return useQuery({
    queryKey: ['events', status ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('events_with_results')
        .select('*')
        .order('closing_time', { ascending: true })

      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error
      return data as EventWithResult[]
    },
  })
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_with_results')
        .select('*')
        .eq('id', eventId)
        .single()
      if (error) throw error
      return data as EventWithResult
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      event_name: string
      description?: string
      unit: string
      category: string
      event_type: 'numeric' | 'score' | 'winner'
      team_home?: string
      team_away?: string
      closing_time: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('events')
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as EventWithResult
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string
      event_name?: string
      description?: string
      unit?: string
      category?: string
      event_type?: 'numeric' | 'score' | 'winner'
      team_home?: string | null
      team_away?: string | null
      closing_time?: string
    }) => {
      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('delete_event', { p_event_id: eventId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useVoidEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('void_event', { p_event_id: eventId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['bets'] })
      qc.invalidateQueries({ queryKey: ['token-balance'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
}

export function useSettleEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      actualResult,
      actualAway,
    }: {
      eventId: string
      actualResult: number
      actualAway?: number
    }) => {
      const { error } = await supabase.rpc('settle_event', {
        p_event_id: eventId,
        p_actual_result: actualResult,
        ...(actualAway !== undefined ? { p_actual_away: actualAway } : {}),
      })
      if (error) throw error
    },
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['bets'] })
      qc.invalidateQueries({ queryKey: ['token-balance'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
}
