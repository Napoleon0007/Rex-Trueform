import { drawHorseNames } from './horseNames'
import { RAIL_IN, BEND_R } from '../components/races/track'

// ── Race simulation ───────────────────────────────────────────────────────────
// The pure model behind the 3D Racing Ring. It knows nothing about three.js: it
// just advances each runner's progress (0 → 1 of a lap), lateral lane, gallop
// phase and stamina every frame. The scene reads this state to place meshes and
// the cameras; the page reads the final order to settle bets.
//
// Fair-ish odds: a hidden speed rating per horse → win probability ∝ rating³ →
// odds = fair × 0.88 (a small house edge), same convention as Roulette. Stamina,
// pace style and racing luck add drama and upsets without throwing the long-run
// edge away.

export const FIELD = 8
export const BASE_SPEED = 0.058 // lap-fraction/sec at rating 1.0 → ~15–17s a race

export type Runner = { id: number; name: string; rating: number; odds: number; style: number }

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
  gallop: Float32Array // 0..1 stride cycle, per horse, for leg animation
  speed: Float32Array // current lap-fraction/sec, for camera/dust intensity
  finished: boolean[]
  finishOrder: number[] // ids in the order they crossed the line
  started = false

  constructor() {
    const names = drawHorseNames(FIELD)
    const ratings = Array.from({ length: FIELD }, () => 0.84 + Math.random() * 0.32)
    const weights = ratings.map((r) => Math.pow(r, 3))
    const sum = weights.reduce((a, b) => a + b, 0)
    this.runners = ratings.map((rating, id) => {
      const prob = weights[id] / sum
      const fair = 1 / prob
      const odds = Math.max(1.5, Math.min(20, Math.round(fair * 0.88 * 10) / 10))
      // style < 0 = front-runner (fast early), > 0 = closer (kicks late)
      const style = Math.random() * 2 - 1
      return { id, name: names[id], rating, odds, style }
    })

    this.progress = new Float32Array(FIELD)
    this.lane = new Float32Array(FIELD)
    this.targetLane = new Float32Array(FIELD)
    this.stamina = new Float32Array(FIELD).fill(1)
    this.surge = new Float32Array(FIELD)
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

      // Pace profile: front-runners (style<0) push early, closers (style>0)
      // conserve then kick in the final third. Net average ≈ rating so odds hold.
      const early = 1 - p
      const late = Math.max(0, p - 0.62) / 0.38
      const paceBias = -r.style * 0.10 * early + r.style * 0.16 * late

      // Stamina: drains with effort, faster for lower-rated horses; gates top-end.
      this.stamina[i] = Math.max(0.45, this.stamina[i] - dt * (0.05 + (1.2 - r.rating) * 0.06))
      const stam = 0.7 + this.stamina[i] * 0.3

      // Random racing luck (smoothed), bounded.
      this.surge[i] = this.surge[i] * 0.9 + (Math.random() - 0.5) * 0.06
      this.surge[i] = Math.max(-0.16, Math.min(0.16, this.surge[i]))

      const v = BASE_SPEED * (r.rating + paceBias + this.surge[i]) * stam
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
