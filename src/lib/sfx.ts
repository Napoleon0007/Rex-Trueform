// Lightweight casino sound effects, synthesised with the Web Audio API so there
// are no audio files to ship or load. All sounds fire from user-gesture handlers
// (button clicks), which satisfies iOS Safari's autoplay-unlock requirement.
//
// Honors a persisted mute flag (localStorage 'sfx-muted'); toggle with setMuted.

let ctx: AudioContext | null = null
let muted =
  typeof window !== 'undefined' && window.localStorage?.getItem('sfx-muted') === '1'

export function isMuted() {
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    window.localStorage?.setItem('sfx-muted', value ? '1' : '0')
  } catch {
    /* private mode — ignore */
  }
}

function audio(): AudioContext | null {
  if (muted) return null
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// One short tone with an exponential decay envelope.
function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// A crisp chip "clink" — two stacked high partials with a fast decay.
export function clink() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  tone(ac, 1850, t, 0.09, 'triangle', 0.18)
  tone(ac, 2750, t, 0.06, 'triangle', 0.10)
}

// Bright ascending arpeggio for a win.
export function win() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((f, i) => tone(ac, f, t + i * 0.085, 0.22, 'square', 0.16))
}

// A short descending "wah" for a loss.
export function lose() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(330, t)
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.45)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
  osc.connect(g).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.52)
}

// White-noise burst through a band-pass — the body of a card "snap".
function noise(ac: AudioContext, start: number, dur: number, freq: number, gain: number) {
  const len = Math.floor(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 0.8
  const g = ac.createGain()
  g.gain.value = gain
  src.connect(bp).connect(g).connect(ac.destination)
  src.start(start)
  src.stop(start + dur + 0.02)
}

// A card dealt — short bright snap.
export function deal() {
  const ac = audio()
  if (!ac) return
  noise(ac, ac.currentTime, 0.07, 2600, 0.45)
}

// Wheel / reel start — a rising whoosh.
export function spin() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(180, t)
  osc.frequency.exponentialRampToValueAtTime(680, t + 0.5)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
  osc.connect(g).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.57)
}

// Big win — a longer ascending fanfare with a sparkle tail.
export function jackpot() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0]
  notes.forEach((f, i) => tone(ac, f, t + i * 0.09, 0.26, 'square', 0.15))
  ;[2093, 2637, 3136].forEach((f, i) => tone(ac, f, t + 0.6 + i * 0.06, 0.18, 'triangle', 0.08))
}

export const sfx = { clink, win, lose, deal, spin, jackpot }
