// Tyson the barman's canned mouth. Gruff, funny, no-crybabies energy.
// Lines are grouped by mood; pickLine avoids repeating the last one used.

export const GREET = [
  "What'll it be, punk? Step up to my bar.",
  'Park yourself. First rule: no crying at my bar.',
  'You look thirsty. Or just broke.',
  'Welcome to the Quarters. Behave.',
  "Don't just stand there — order something.",
  'This is my bar. You drink, you behave, you tip.',
]

export const WIN = [
  'Look at you, big shot. Buy a round.',
  "Winner winner. Don't let it go to your head.",
  'Hot streak, champ — the house wants it back.',
  'Nice hit. Now tip your barman.',
  'Up money? Quit while you can, hero.',
]

export const LOSS = [
  'Ouch. Want a tissue with that?',
  'Tough beat, punk. Drink it off.',
  'The house thanks you for your donation.',
  'Down bad. Maybe stick to lemonade.',
  "That's gonna leave a mark. Next.",
  'You bet like my grandmother. Worse.',
]

export const BEER = [
  'One cold one, coming up. 🍺',
  'Beer for the gentleman. Sip slow.',
  'Here. Built different, just like you ain’t.',
]

export const TEQUILA = [
  'Tequila? Brave. Don’t cry. 🥃',
  'Salt, shoot, regret. Enjoy.',
  'One agave bullet, loaded.',
]

export const BROKE = [
  'No Bitcoin, no drink. Go win some.',
  'Your tab’s drier than your wallet, punk.',
  'Come back when you can pay.',
  'Broke boys don’t drink at my bar.',
]

export const POURING = [
  'Coming right up! 🍾',
  'Hold your horses…',
  'Pouring. Don’t rush greatness.',
]

let last = ''
export function pickLine(lines: string[]): string {
  if (lines.length <= 1) return lines[0] ?? ''
  let next = last
  while (next === last) next = lines[Math.floor(Math.random() * lines.length)]
  last = next
  return next
}
