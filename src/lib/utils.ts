import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { CasinoEvent } from '../types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeUntil(dateString: string): string {
  const target = new Date(dateString)
  if (target <= new Date()) return 'Closed'
  return formatDistanceToNow(target, { addSuffix: false })
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'd MMM yyyy, HH:mm')
}

export function formatMonth(year: number, month: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy')
}

export function pluralise(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function winnerLabel(
  pick: number,
  teamHome: string | null | undefined,
  teamAway: string | null | undefined,
): string {
  if (pick === 1) return teamHome ?? 'Home'
  if (pick === 2) return 'Draw'
  if (pick === 3) return teamAway ?? 'Away'
  return String(pick)
}

/**
 * Human-readable display of a prediction (or actual result) for any event type.
 *   winner  → "Draw" / team name
 *   score   → "3–1"
 *   numeric → "3 goals"
 */
export function formatPrediction(
  event: Pick<CasinoEvent, 'event_type' | 'unit' | 'team_home' | 'team_away'>,
  primary: number,
  away?: number | null,
): string {
  if (event.event_type === 'winner') {
    return winnerLabel(primary, event.team_home, event.team_away)
  }
  if (event.event_type === 'score') {
    return `${primary}–${away ?? 0}`
  }
  return `${primary} ${event.unit}`.trim()
}
