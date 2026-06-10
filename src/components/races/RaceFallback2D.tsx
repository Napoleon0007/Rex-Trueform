import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RaceSim } from '../../lib/raceSim'
import { samplePath } from './track'
import { newRaceLoopState, stepRace } from '../../lib/raceLoop'

export type OvalMap = {
  W: number
  H: number
  path: string
  project: (x: number, z: number) => [number, number]
}

type Props = {
  sim: RaceSim
  phase: 'bet' | 'running' | 'done'
  oval: OvalMap
  silk: (i: number) => { body: string; cap: string }
  leaderId: number
  onOrder: (ids: number[]) => void
  onFinish: (classified: number[]) => void
}

// Lightweight, no-WebGL race view. Shown when the 3D track can't initialise
// (memory-constrained mobile Safari being the usual culprit). It animates the
// horses around the oval on a plain requestAnimationFrame loop AND drives the
// simulation through to settlement, so a placed bet always resolves even when
// there is no GPU track to watch.
export default function RaceFallback2D({
  sim,
  phase,
  oval,
  silk,
  leaderId,
  onOrder,
  onFinish,
}: Props) {
  const [, tick] = useState(0)
  const v = useRef(new THREE.Vector3()).current
  const loop = useRef(newRaceLoopState())

  // Keep the latest callbacks in refs so the rAF effect only re-subscribes when
  // the race itself changes — not on every parent re-render (which fires often
  // while the running order updates).
  const onOrderRef = useRef(onOrder)
  const onFinishRef = useRef(onFinish)
  onOrderRef.current = onOrder
  onFinishRef.current = onFinish

  useEffect(() => {
    loop.current = newRaceLoopState() // fresh settle state per race
  }, [sim])

  useEffect(() => {
    if (phase !== 'running') return
    let active = true
    let last: number | null = null
    let raf = 0

    const frame = (t: number) => {
      if (!active) return
      const dt = last === null ? 0 : Math.min(0.05, (t - last) / 1000)
      last = t
      stepRace(sim, dt, loop.current, onOrderRef.current, onFinishRef.current)
      tick((n) => (n + 1) % 1_000_000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      active = false
      cancelAnimationFrame(raf)
    }
  }, [phase, sim])

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-emerald-300">
      <svg
        viewBox={`0 0 ${oval.W} ${oval.H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <path d={oval.path} fill="none" stroke="#3f6212" strokeWidth={10} strokeLinecap="round" />
        <path d={oval.path} fill="none" stroke="#84cc16" strokeWidth={5.5} strokeLinecap="round" />
        <path d={oval.path} fill="none" stroke="#ecfccb" strokeWidth={0.9} strokeDasharray="2 3" />
        {sim.runners.map((_, i) => {
          const { pos } = samplePath(sim.progress[i], sim.lane[i], v)
          const [px, py] = oval.project(pos.x, pos.z)
          const lead = i === leaderId && phase !== 'bet'
          const s = silk(i)
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={lead ? 3.6 : 2.8} fill={s.body} stroke="#000" strokeWidth={0.5} />
              <circle cx={px} cy={py} r={1.2} fill={s.cap} />
            </g>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-1 z-10 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-950/70">
        Lite track
      </div>
    </div>
  )
}
