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

/** Label of a 1-based pick within an event's option list. */
export function pickLabel(
  options: string[] | null | undefined,
  pick: number,
): string {
  return options?.[pick - 1] ?? String(pick)
}

/**
 * Human-readable display of a prediction (or actual result) for any event type.
 *   pick    → the chosen option's name ("Scheffler" / "Draw")
 *   score   → "3–1"
 *   numeric → "3 goals"
 */
export function formatPrediction(
  event: Pick<CasinoEvent, 'event_type' | 'unit' | 'options'>,
  primary: number,
  away?: number | null,
): string {
  if (event.event_type === 'pick') {
    return pickLabel(event.options, primary)
  }
  if (event.event_type === 'score') {
    return `${primary}–${away ?? 0}`
  }
  // Unknown types from a stale cache (e.g. a pre-migration 'winner' row)
  // still label correctly when the converted row carries options.
  if (event.options?.length) {
    return pickLabel(event.options, primary)
  }
  return `${primary} ${event.unit}`.trim()
}
