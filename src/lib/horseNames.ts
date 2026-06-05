// Fun horse-name pool for the Racing Ring. Each race draws 8 unique names at
// random, so the field is never the same twice. Flavoured with the Rex / Cape
// Town world plus classic racehorse silliness.
export const HORSE_NAMES: string[] = [
  'Rex Thunder', 'Trueform Flyer', 'Cape Comet', 'Table Mountain', 'Bokke Bolt',
  'Midnight Tyson', 'Golden Mason', 'Chocolate Stix', 'The Paradox', 'Springbok Sprint',
  'Mayhem', 'Blue Moon', "Rassie's Revenge", 'Lightning Lukas', 'Desert Storm',
  'Karoo King', 'Atlantic Dash', "Devil's Peak", 'Sea Point Streak', 'Bo-Kaap Blur',
  'Mzansi Magic', 'Highveld Hero', 'Klipdrift Kid', 'Rooibos Rocket', 'Witblitz',
  'Stellenbosch Star', 'Big Five', 'Kalahari Wind', 'Drakensberg', 'Long Tom',
  'Eskom Express', 'Nkalakatha', "Madiba's Stride", 'Cape Doctor', 'Gqeberha Gale',
  'Joburg Jet', 'Soweto Soul', 'Knysna Mist', 'Garden Route', 'Wild Coast',
  'Kruger Cat', 'Braai Master', 'Boerseun', "Tannie's Pride", 'Vaalpens',
]

// Silk colours per lane (jersey body + cap). One per starter, by lane number.
export const SILKS: { name: string; body: string; cap: string }[] = [
  { name: 'Crimson', body: '#e11d48', cap: '#ffffff' },
  { name: 'Royal',   body: '#2563eb', cap: '#fde047' },
  { name: 'Emerald', body: '#059669', cap: '#ffffff' },
  { name: 'Gold',    body: '#f59e0b', cap: '#7c2d12' },
  { name: 'Violet',  body: '#7c3aed', cap: '#ffffff' },
  { name: 'Teal',    body: '#0d9488', cap: '#022c22' },
  { name: 'Orange',  body: '#ea580c', cap: '#000000' },
  { name: 'Indigo',  body: '#4f46e5', cap: '#fde047' },
]

// Draw `n` unique random names from the pool (Fisher–Yates partial shuffle).
export function drawHorseNames(n: number): string[] {
  const pool = [...HORSE_NAMES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}
