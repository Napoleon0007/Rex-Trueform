// Standard 52-card deck + helpers shared by Blackjack and Poker.
// Ranks are 2-14 (J=11, Q=12, K=13, A=14). Aces also play low for A-5 straights.

export type Suit = '♠' | '♥' | '♦' | '♣'
export interface Card { rank: number; suit: Suit }

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const isRed = (s: Suit) => s === '♥' || s === '♦'

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit })
  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Blackjack ────────────────────────────────────────────────────────────────
// Best total ≤ 21, aces count 11 then drop to 1 as needed.
export function blackjackValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0
  for (const c of cards) {
    if (c.rank === 14) { total += 11; aces++ }
    else total += Math.min(c.rank, 10)
  }
  let soft = aces > 0
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  if (aces === 0) soft = false
  return { total, soft }
}

// ── Poker hand evaluation ──────────────────────────────────────────────────────
export const HAND_NAMES = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
]

// Score a 5-card hand → [category, ...tiebreakers] (compare lexicographically).
function score5(cards: Card[]): number[] {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a)
  const flush = cards.every((c) => c.suit === cards[0].suit)

  const counts = new Map<number, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  // groups sorted by (count desc, rank desc)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // straight detection (incl. wheel A-2-3-4-5)
  const uniq = [...new Set(ranks)]
  let straightHigh = 0
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0]
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5 // wheel
  }

  if (straightHigh && flush) return [8, straightHigh]
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]]
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]]
  if (flush) return [5, ...ranks]
  if (straightHigh) return [4, straightHigh]
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map((g) => g[0])]
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0]]
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map((g) => g[0])]
  return [0, ...ranks]
}

export function compareScore(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

function combos5(cards: Card[]): Card[][] {
  if (cards.length <= 5) return [cards]
  const out: Card[][] = []
  const n = cards.length
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++)
            out.push([cards[a], cards[b], cards[c], cards[d], cards[e]])
  return out
}

// Best 5-card hand out of 5-7 cards. Returns its score + readable name.
export function evaluate(cards: Card[]): { score: number[]; name: string } {
  let best: number[] | null = null
  for (const combo of combos5(cards)) {
    const s = score5(combo)
    if (!best || compareScore(s, best) > 0) best = s
  }
  return { score: best!, name: HAND_NAMES[best![0]] }
}
