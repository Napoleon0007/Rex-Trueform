// The house dealer has a name and a mouth. Her lines react to how the night is
// going (the session P&L) and to each result. Kept text-only so any surface — the
// table bubble, the win/lose juice — can pull a line.

export const DEALER_NAME = 'Roxy'

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// Idle / welcome — shown on the table when you haven't played yet this session.
const WELCOME = [
  'Welcome, boys. Place your bets.',
  "Roxy deals 'em straight. Mostly.",
  'Sit down, big spender.',
  'The jungle never sleeps. Neither do I.',
]
// You're up for the session — she needles you.
const UP = [
  "Don't get cocky, hotshot.",
  'Beginner luck runs out, you know.',
  'The house has a long memory.',
  'Quit while you’re ahead? Nah.',
]
// You're down for the session — she twists the knife (gently).
const DOWN = [
  'Rough night, love. One more?',
  'The jungle giveth, the jungle taketh.',
  'Chin up. Or double up.',
  "I'll pretend I didn't see that.",
]

// Reaction to a single result.
const WIN = ['Look at you go.', 'Lucky.', "Roxy approves.", 'Not bad, boys.']
const BIGWIN = ['Okay, HOTSHOT.', 'Save some for the rest of us.', 'Tip your dealer. 💋', 'The jungle bows to you.']
const LOSS = ['The house thanks you.', 'Ouch.', 'Try again, champ.', 'Into the jungle it goes.']

// Line for the table bubble, based on session net.
export function bubbleLine(net: number): string {
  if (net > 0) return pick(UP)
  if (net < 0) return pick(DOWN)
  return pick(WELCOME)
}

// Line reacting to a result (win/lose, and whether it was a big win).
export function reactLine(won: boolean, big = false): string {
  if (!won) return pick(LOSS)
  return big ? pick(BIGWIN) : pick(WIN)
}
