// Self-contained 2D pool physics — logical coordinates, framework-agnostic.
// The table felt is TABLE.W x TABLE.H; balls live inside by BALL_R. Six pockets
// (4 corners + 2 side) cut gaps in the cushions. Equal-mass elastic ball
// collisions, cushion restitution, exponential rolling friction.

export interface Ball {
  id: number          // 0 = cue ball
  number: number      // 0 = cue, 1-15 object balls (8 = black)
  x: number
  y: number
  vx: number
  vy: number
  color: string
  striped: boolean
  potted: boolean
}

export const TABLE = { W: 900, H: 450 }
export const BALL_R = 16          // bigger balls so they read on a phone (rack auto-rebalances)
export const POCKET_R = 24
const MOUTH = POCKET_R + 2          // cushion gap half-width around each pocket
const CUSHION_REST = 0.92           // energy kept on a cushion bounce
const STOP_SPEED = 4                // px/s below which a ball is parked
const FRICTION_K = 1.35             // higher = more drag

export const POCKETS = [
  { x: 0,          y: 0 },
  { x: TABLE.W / 2, y: -3 },
  { x: TABLE.W,    y: 0 },
  { x: 0,          y: TABLE.H },
  { x: TABLE.W / 2, y: TABLE.H + 3 },
  { x: TABLE.W,    y: TABLE.H },
]

const BALL_COLORS: Record<number, string> = {
  1: '#f4c20d', 2: '#1d4ed8', 3: '#dc2626', 4: '#7c3aed',
  5: '#ea580c', 6: '#0f7d3d', 7: '#7c2d12', 8: '#0b0b0b',
  9: '#f4c20d', 10: '#1d4ed8', 11: '#dc2626', 12: '#7c3aed',
  13: '#ea580c', 14: '#0f7d3d', 15: '#7c2d12',
}

export const CUE_START = { x: TABLE.W * 0.26, y: TABLE.H / 2 }

/** Standard triangle rack with the cue ball on the break line. */
export function createRack(): Ball[] {
  const balls: Ball[] = [{
    id: 0, number: 0,
    x: CUE_START.x, y: CUE_START.y,
    vx: 0, vy: 0, color: '#f8fafc', striped: false, potted: false,
  }]

  // 8-ball goes in the centre of the rack; the rest fill the triangle.
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]
  const apexX = TABLE.W * 0.7
  const gap = BALL_R * 2 + 1
  let idx = 0
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      const n = order[idx++]
      balls.push({
        id: n,
        number: n,
        x: apexX + row * gap * 0.87,
        y: TABLE.H / 2 + (i - row / 2) * gap,
        vx: 0, vy: 0,
        color: BALL_COLORS[n],
        striped: n >= 9,
        potted: false,
      })
    }
  }
  return balls
}

export function anyMoving(balls: Ball[]): boolean {
  return balls.some((b) => !b.potted && (b.vx * b.vx + b.vy * b.vy) > 1)
}

function inPocketGapV(y: number): boolean {
  // gaps on a vertical wall (left/right): only the two corner pockets
  return y < MOUTH || y > TABLE.H - MOUTH
}
function inPocketGapH(x: number): boolean {
  // gaps on a horizontal wall (top/bottom): corners + the middle pocket
  return x < MOUTH || x > TABLE.W - MOUTH || Math.abs(x - TABLE.W / 2) < MOUTH
}

export interface StepResult {
  potted: Ball[]
  scratch: boolean   // cue ball was potted
}

/** Advance the simulation by dt seconds. Mutates balls. */
export function advance(balls: Ball[], dt: number): StepResult {
  const SUBS = 8
  const h = dt / SUBS
  const result: StepResult = { potted: [], scratch: false }

  for (let s = 0; s < SUBS; s++) {
    // integrate + friction
    for (const b of balls) {
      if (b.potted) continue
      b.x += b.vx * h
      b.y += b.vy * h
      const f = Math.exp(-FRICTION_K * h)
      b.vx *= f
      b.vy *= f
      if (b.vx * b.vx + b.vy * b.vy < STOP_SPEED * STOP_SPEED) { b.vx = 0; b.vy = 0 }
    }

    // pockets
    for (const b of balls) {
      if (b.potted) continue
      for (const p of POCKETS) {
        const dx = b.x - p.x, dy = b.y - p.y
        if (dx * dx + dy * dy < POCKET_R * POCKET_R) {
          b.potted = true
          b.vx = 0; b.vy = 0
          result.potted.push(b)
          if (b.id === 0) result.scratch = true
          break
        }
      }
    }

    // cushions
    for (const b of balls) {
      if (b.potted) continue
      if (b.x < BALL_R && !inPocketGapV(b.y))            { b.x = BALL_R; b.vx = Math.abs(b.vx) * CUSHION_REST }
      if (b.x > TABLE.W - BALL_R && !inPocketGapV(b.y))  { b.x = TABLE.W - BALL_R; b.vx = -Math.abs(b.vx) * CUSHION_REST }
      if (b.y < BALL_R && !inPocketGapH(b.x))            { b.y = BALL_R; b.vy = Math.abs(b.vy) * CUSHION_REST }
      if (b.y > TABLE.H - BALL_R && !inPocketGapH(b.x))  { b.y = TABLE.H - BALL_R; b.vy = -Math.abs(b.vy) * CUSHION_REST }
    }

    // ball-ball elastic collisions (equal mass)
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i]
      if (a.potted) continue
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j]
        if (b.potted) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const distSq = dx * dx + dy * dy
        const min = BALL_R * 2
        if (distSq > 0 && distSq < min * min) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist, ny = dy / dist
          // separate the overlap
          const overlap = (min - dist) / 2
          a.x -= nx * overlap; a.y -= ny * overlap
          b.x += nx * overlap; b.y += ny * overlap
          // exchange velocity along the normal
          const va = a.vx * nx + a.vy * ny
          const vb = b.vx * nx + b.vy * ny
          const diff = vb - va
          a.vx += diff * nx; a.vy += diff * ny
          b.vx -= diff * nx; b.vy -= diff * ny
        }
      }
    }
  }
  return result
}

/** Strike the cue ball at an angle (radians) with power 0..1. */
export function shoot(cue: Ball, angle: number, power: number) {
  const MAX_SPEED = 2400
  const speed = Math.max(0.05, Math.min(1, power)) * MAX_SPEED
  cue.vx = Math.cos(angle) * speed
  cue.vy = Math.sin(angle) * speed
}

export const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by)
