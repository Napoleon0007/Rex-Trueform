import { drawHorseNames } from './horseNames'
import { RAIL_IN, BEND_R } from '../components/races/track'

// ── Race simulation ───────────────────────────────────────────────────────────
// The pure model behind the 3D Racing Ring. It knows nothing about three.js: it
// just advances each runner's progress (0 → 1 of a lap), lateral lane, gallop
// phase and stamina every frame. The scene reads this state to place meshes and
// the cameras; the page reads the final order to settle bets.
//
// Fair odds by simulation: each horse has a fixed ability (rating) + running
// style. Per race a hidden "form on the day" plus frame-by-frame racing luck
// shuffle the result, so the favourite is FAR from a lock. Odds are then set by
// Monte-Carlo — we run the race a few hundred times when it's built and price
// each horse off how often it actually wins — so the odds always match reality
// and no horse is ever a +EV exploit, however chaotic the racing gets.

export const FIELD = 8
export const BASE_SPEED = 0.06 // lap-fraction/sec at rating 1.0 → ~15–17s a race

export type Runner = { id: number; name: string; rating: number; odds: number; style: number }

// ── Randomness tuning (favourite ≈ 27% wins, every horse genuinely live) ──
const RATING_LO = 0.95   // ability band — tight, so the field is well matched
const RATING_SPAN = 0.10
const FORM_SPAN = 0.26   // per-race "going" swing — the main upset lever
const SURGE_KICK = 0.14  // frame-by-frame racing luck (a bounded random walk)
const SURGE_DECAY = 0.9
const SURGE_MAX = 0.34
const STAM_FLOOR = 0.45
const HOUSE_KEEP = 0.88  // 12% house edge baked into the odds
const MC_ROLLS = 500     // Monte-Carlo rollouts per race used to price the odds

// ── Shared per-horse dynamics, used by BOTH the live race and the odds rollout
// so the two can never drift apart (i.e. the odds can't lie about the race). ──
const paceBiasOf = (style: number, p: number) =>
  -style * 0.10 * (1 - p) + style * 0.16 * (Math.max(0, p - 0.62) / 0.38)

const drainStamina = (stamina: number, rating: number, dt: number) =>
  Math.max(STAM_FLOOR, stamina - dt * (0.05 + (1.2 - rating) * 0.06))

const nextSurge = (surge: number) => {
  const s = surge * SURGE_DECAY + (Math.random() - 0.5) * SURGE_KICK
  return s > SURGE_MAX ? SURGE_MAX : s < -SURGE_MAX ? -SURGE_MAX : s
}

const velocity = (rating: number, style: number, form: number, p: number, stamina: number, surge: number) =>
  BASE_SPEED * (rating + form + paceBiasOf(style, p) + surge) * (0.7 + stamina * 0.3)

// One Monte-Carlo rollout with fresh form + luck; returns the winning horse id.
// Ability (ratings/styles) is fixed — what the odds price; form + surge vary, so
// the favourite by ability wins only ~27% of the time.
function rollWinner(ratings: number[], styles: number[]): number {
  const n = ratings.length
  const p = new Float64Array(n)
  const stam = new Float64Array(n).fill(1)
  const sg = new Float64Array(n)
  const form = ratings.map(() => (Math.random() - 0.5) * FORM_SPAN)
  const dt = 0.05
  for (let s = 0; s < 4000; s++) {
    let winner = -1
    let bestP = 1
    for (let i = 0; i < n; i++) {
      stam[i] = drainStamina(stam[i], ratings[i], dt)
      sg[i] = nextSurge(sg[i])
      p[i] += velocity(ratings[i], styles[i], form[i], p[i], stam[i], sg[i]) * dt
      if (p[i] >= 1 && p[i] > bestP) { bestP = p[i]; winner = i }
    }
    if (winner >= 0) return winner
  }
  let w = 0
  for (let i = 1; i < n; i++) if (p[i] > p[w]) w = i
  return w
}

// Lane offsets are in world units around the centreline. Inside rail hugged by
// leaders; the field fans out behind. Keep everyone inside the painted surface.
const LANE_RAIL = -(BEND_R - RAIL_IN) + 1.4 // just off the inner rail
const LANE_SPREAD = 7 // how far out the back of the field drifts

export class RaceSim {
  runners: Runner[]
  progress: Float32Array
  lane: Float32Array
  targetLane: Float32Array
  stamina: Float32Array
  surge: Float32Array
  form: Float32Array // per-race "form on the day" offset, constant through a race
  gallop: Float32Array // 0..1 stride cycle, per horse, for leg animation
  speed: Float32Array // current lap-fraction/sec, for camera/dust intensity
  finished: boolean[]
  finishOrder: number[] // ids in the order they crossed the line
  started = false

  constructor() {
    const names = drawHorseNames(FIELD)
    const ratings = Array.from({ length: FIELD }, () => RATING_LO + Math.random() * RATING_SPAN)
    // style < 0 = front-runner (fast early), > 0 = closer (kicks late)
    const styles = Array.from({ length: FIELD }, () => Math.random() * 2 - 1)

    // Price the odds off how often each horse ACTUALLY wins this exact field
    // (including all the new randomness), measured by running the race MC_ROLLS
    // times. This is what makes a backed favourite fair rather than a free lunch.
    const wins = new Array(FIELD).fill(0)
    for (let k = 0; k < MC_ROLLS; k++) wins[rollWinner(ratings, styles)]++
    this.runners = ratings.map((rating, id) => {
      const prob = (wins[id] + 0.5) / (MC_ROLLS + FIELD * 0.5) // Laplace-smoothed (no 0 / ∞)
      const odds = Math.max(1.5, Math.min(20, Math.round((1 / prob) * HOUSE_KEEP * 10) / 10))
      return { id, name: names[id], rating, odds, style: styles[id] }
    })

    this.progress = new Float32Array(FIELD)
    this.lane = new Float32Array(FIELD)
    this.targetLane = new Float32Array(FIELD)
    this.stamina = new Float32Array(FIELD).fill(1)
    this.surge = new Float32Array(FIELD)
    this.form = Float32Array.from({ length: FIELD }, () => (Math.random() - 0.5) * FORM_SPAN)
    this.gallop = new Float32Array(FIELD)
    this.speed = new Float32Array(FIELD)
    this.finished = new Array(FIELD).fill(false)
    this.finishOrder = []

    // Start lined up across the track at the post, fanned by lane.
    for (let i = 0; i < FIELD; i++) {
      this.lane[i] = LANE_RAIL + (i / (FIELD - 1)) * LANE_SPREAD
      this.targetLane[i] = this.lane[i]
      this.gallop[i] = Math.random()
    }
  }

  // Ranking right now (ids best → worst by progress).
  order(): number[] {
    return [...Array(FIELD).keys()].sort((a, b) => this.progress[b] - this.progress[a])
  }

  // Advance the whole field by dt seconds. Returns true once every horse that
  // matters has settled enough to call the race (leader past the post).
  step(dt: number): boolean {
    dt = Math.min(dt, 0.05)
    const ranked = this.order()
    const rankOf = new Array(FIELD)
    ranked.forEach((id, pos) => (rankOf[id] = pos))

    let leaderDone = false
    for (let i = 0; i < FIELD; i++) {
      if (this.finished[i]) { this.speed[i] = 0; continue }
      const r = this.runners[i]
      const p = this.progress[i]

      // Stamina drains with effort (faster for lesser horses); per-frame racing
      // luck; plus this horse's hidden form for the day. The shared helpers keep
      // the live race identical to the odds rollout above, so the odds can't lie.
      this.stamina[i] = drainStamina(this.stamina[i], r.rating, dt)
      this.surge[i] = nextSurge(this.surge[i])
      const v = velocity(r.rating, r.style, this.form[i], p, this.stamina[i], this.surge[i])
      this.speed[i] = Math.max(0, v)
      this.progress[i] = p + v * dt

      // Gallop cycle speed scales with ground speed (≈ stride frequency).
      this.gallop[i] = (this.gallop[i] + v * dt * 26) % 1

      // Racing line: leader hugs the rail; the rest fan out and swing wider when
      // boxed in behind a slower horse, then tuck back when clear.
      const pos = rankOf[i]
      let want = LANE_RAIL + (pos / (FIELD - 1)) * LANE_SPREAD * 0.7
      // overtake: if someone is just ahead in a similar lane, drift out to pass
      for (let j = 0; j < FIELD; j++) {
        if (j === i || this.finished[j]) continue
        const gap = this.progress[j] - p
        if (gap > 0 && gap < 0.025 && Math.abs(this.lane[j] - this.lane[i]) < 2.2) {
          want += 2.4
          break
        }
      }
      want = Math.min(LANE_RAIL + LANE_SPREAD + 2, Math.max(LANE_RAIL, want))
      this.targetLane[i] = want
      this.lane[i] += (want - this.lane[i]) * Math.min(1, dt * 2.2)

      if (this.progress[i] >= 1 && !this.finished[i]) {
        this.progress[i] = 1
        this.finished[i] = true
        this.finishOrder.push(i)
        if (this.finishOrder.length === 1) leaderDone = true
      }
    }
    return leaderDone
  }

  // Final classification once the race is called: anyone still running is ranked
  // behind the finishers by how far they got.
  classify(): number[] {
    const stillGoing = [...Array(FIELD).keys()]
      .filter((i) => !this.finished[i])
      .sort((a, b) => this.progress[b] - this.progress[a])
    return [...this.finishOrder, ...stillGoing]
  }
}
