import * as THREE from 'three'

// ── The Rex Racing Ring — track geometry ──────────────────────────────────────
// A real stadium-shaped oval laid out on the XZ ground plane (Y is up). Two
// straights joined by two semicircular bends. Everything in the 3D scene — the
// horses, the rails, the broadcast cameras and the HUD minimap — positions
// itself by sampling THIS one centreline, so the whole circuit is internally
// consistent and you can frame all of it at once.
//
// The winning post sits at the centre of the home straight (nearest the main
// grandstand). A race is exactly one lap: a horse's progress p ∈ [0,1] maps to a
// fraction of the lap measured from the post, so p = 0 and p = 1 are the same
// spot — the line. Lane offset is purely lateral (which part of the track width a
// runner is on); it never changes p, so the betting maths stays decided by the
// sim's speed model, not by who drew the inside draw.

export const STRAIGHT = 60 // half-length of each straight (along X)
export const BEND_R = 34 // radius of the centreline through each bend
export const TRACK_W = 12 // full width of the running surface
export const RAIL_IN = BEND_R - TRACK_W / 2 // inner rail radius
export const RAIL_OUT = BEND_R + TRACK_W / 2 // outer rail radius

const SEG_BEND = Math.PI * BEND_R
// The lap is: half the home straight (post → +X end) → right bend → back
// straight → left bend → the other half of the home straight (−X end → post).
// Length comes straight off the segment table so it can never drift.
type Seg = { len: number }
const SEGS: Seg[] = [
  { len: STRAIGHT }, // 0: post → end of home straight (+X half)
  { len: SEG_BEND }, // 1: right bend
  { len: 2 * STRAIGHT }, // 2: back straight
  { len: SEG_BEND }, // 3: left bend
  { len: STRAIGHT }, // 4: start of home straight → post (+X half)
]
export const LAP_LENGTH = SEGS.reduce((a, s) => a + s.len, 0)

const reuse = new THREE.Vector3()

export type PathSample = {
  pos: THREE.Vector3 // world position on the centreline (Y = 0)
  heading: number // yaw (radians) of travel direction, for orienting a runner
}

// Sample the centreline at lap fraction p (0..1) with a lateral lane offset.
// laneOffset: 0 = centreline, negative = toward the inside rail, positive = out.
export function samplePath(p: number, laneOffset = 0, out?: THREE.Vector3): PathSample {
  const target = out ?? reuse
  let s = ((p % 1) + 1) % 1 // wrap into [0,1)
  s *= LAP_LENGTH

  let x = 0
  let z = 0
  let dirX = 1
  let dirZ = 0
  let normX = 0 // outward normal (points away from the infield centre)
  let normZ = 1

  if (s < SEGS[0].len) {
    // Home straight, post (x=0) → +X, on the near edge (z = +BEND_R)
    x = s
    z = BEND_R
    dirX = 1; dirZ = 0
    normX = 0; normZ = 1
  } else if (s < SEGS[0].len + SEGS[1].len) {
    // Right bend: centre at (+STRAIGHT, 0), sweep from +90° down to −90°
    const a = (s - SEGS[0].len) / BEND_R // 0..π
    const ang = Math.PI / 2 - a
    x = STRAIGHT + BEND_R * Math.cos(ang)
    z = BEND_R * Math.sin(ang)
    dirX = Math.sin(ang); dirZ = -Math.cos(ang) // tangent (clockwise)
    normX = Math.cos(ang); normZ = Math.sin(ang)
  } else if (s < SEGS[0].len + SEGS[1].len + SEGS[2].len) {
    // Back straight: +X end → −X, on the far edge (z = −BEND_R)
    const d = s - (SEGS[0].len + SEGS[1].len)
    x = STRAIGHT - d
    z = -BEND_R
    dirX = -1; dirZ = 0
    normX = 0; normZ = -1
  } else if (s < SEGS[0].len + SEGS[1].len + SEGS[2].len + SEGS[3].len) {
    // Left bend: centre at (−STRAIGHT, 0), sweep from −90° round to −270°
    const a = (s - (SEGS[0].len + SEGS[1].len + SEGS[2].len)) / BEND_R // 0..π
    const ang = -Math.PI / 2 - a
    x = -STRAIGHT + BEND_R * Math.cos(ang)
    z = BEND_R * Math.sin(ang)
    dirX = Math.sin(ang); dirZ = -Math.cos(ang)
    normX = Math.cos(ang); normZ = Math.sin(ang)
  } else {
    // Final half of the home straight: −X end → post (x=0)
    const d = s - (SEGS[0].len + SEGS[1].len + SEGS[2].len + SEGS[3].len)
    x = -STRAIGHT + d
    z = BEND_R
    dirX = 1; dirZ = 0
    normX = 0; normZ = 1
  }

  target.set(x + normX * laneOffset, 0, z + normZ * laneOffset)
  return { pos: target, heading: Math.atan2(dirX, dirZ) }
}

// A flat list of centreline points — handy for building ribbon/rail geometry and
// the 2D minimap. Returns [x, z] pairs.
export function centrelinePoints(steps = 240): [number, number][] {
  const pts: [number, number][] = []
  const v = new THREE.Vector3()
  for (let i = 0; i < steps; i++) {
    samplePath(i / steps, 0, v)
    pts.push([v.x, v.z])
  }
  return pts
}

// Offset-rail points (inner rail = negative, outer = positive lane offset).
export function railPoints(laneOffset: number, steps = 240): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const v = new THREE.Vector3()
    samplePath(i / steps, laneOffset, v)
    pts.push(v.clone())
  }
  return pts
}
