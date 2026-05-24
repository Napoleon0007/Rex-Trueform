export const SPORT_CATEGORIES = [
  { label: 'Rugby',      emoji: '🏉' },
  { label: 'Soccer',     emoji: '⚽' },
  { label: 'Cricket',    emoji: '🏏' },
  { label: 'F1',         emoji: '🏎️' },
  { label: 'Boxing',     emoji: '🥊' },
  { label: 'Tennis',     emoji: '🎾' },
  { label: 'Golf',       emoji: '⛳' },
  { label: 'Basketball', emoji: '🏀' },
  { label: 'General',    emoji: '🎲' },
] as const

export type SportCategory = typeof SPORT_CATEGORIES[number]['label']

export function categoryEmoji(category: string): string {
  return SPORT_CATEGORIES.find((c) => c.label === category)?.emoji ?? '🎲'
}
