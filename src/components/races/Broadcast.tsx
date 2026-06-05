import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RaceSim } from '../../lib/raceSim'
import { samplePath, BEND_R } from './track'

// The broadcast camera: a single camera flown through TV-style shots so you both
// see the whole oval and ride in the pack. Shots are chosen from the race phase
// and the leader's position; the camera cuts hard between shot types (like a real
// vision mixer) then micro-follows within a shot.

type Shot = 'wide' | 'chase' | 'rail' | 'photo' | 'orbit'
type Props = { sim: RaceSim; running: boolean; phase: 'bet' | 'running' | 'done' }

const POST = samplePath(0, 0, new THREE.Vector3()).pos.clone()

export default function Broadcast({ sim, running, phase }: Props) {
  const shot = useRef<Shot>('wide')
  const shotT = useRef(0)
  const raceT = useRef(0)
  const look = useRef(new THREE.Vector3(0, 0, 0))
  const tmp = useRef(new THREE.Vector3())
  const lead = useRef(new THREE.Vector3())
  const prevPhase = useRef(phase)

  useFrame((state, dt) => {
    const cam = state.camera
    if (phase !== prevPhase.current) {
      if (phase === 'running') raceT.current = 0
      prevPhase.current = phase
    }
    if (running) raceT.current += dt
    shotT.current += dt

    const leaderId = sim.order()[0]
    const lp = sim.progress[leaderId] ?? 0
    const { pos: lpos, heading } = samplePath(lp, sim.lane[leaderId] ?? 0, lead.current)
    const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading))

    // ── Decide the shot ──
    let next: Shot = shot.current
    if (phase === 'bet') next = 'wide'
    else if (phase === 'done') next = 'photo'
    else if (running) {
      if (raceT.current < 2.4) next = 'wide'
      else if (lp > 0.86) next = 'photo'
      else {
        // alternate chase / rail every few seconds
        const slot = Math.floor(raceT.current / 4) % 2
        next = slot === 0 ? 'chase' : 'rail'
      }
    }

    const changed = next !== shot.current
    if (changed) { shot.current = next; shotT.current = 0 }

    // ── Target position + look for the active shot ──
    const targetPos = tmp.current
    const targetLook = new THREE.Vector3()

    switch (shot.current) {
      case 'wide': {
        // A 3/4 crane that slowly orbits the whole circuit so you see all of it.
        const a = phase === 'bet' ? state.clock.elapsedTime * 0.05 : 0.5
        targetPos.set(Math.sin(a) * 95, 70, BEND_R + 120 + Math.cos(a) * 20)
        targetLook.set(0, 3, -6)
        break
      }
      case 'chase': {
        targetPos.copy(lpos).addScaledVector(dir, -17).add(new THREE.Vector3(0, 9, 0))
        targetLook.copy(lpos).addScaledVector(dir, 8).setY(1.5)
        break
      }
      case 'rail': {
        // Trackside, low and outside the rail, panning with the leader.
        const outward = new THREE.Vector3(-dir.z, 0, dir.x) // right-hand normal
        targetPos.copy(lpos).addScaledVector(outward, -26).add(new THREE.Vector3(0, 5, 0))
        targetLook.copy(lpos).setY(1.4)
        break
      }
      case 'photo':
      default: {
        // Low at the post, looking back up the home straight at the charge.
        targetPos.set(POST.x + 16, 2.4, POST.z + 7)
        targetLook.set(POST.x - 8, 1.3, POST.z)
        break
      }
    }

    // Hard cut on a shot change, smooth follow within a shot.
    if (changed) {
      cam.position.copy(targetPos)
      look.current.copy(targetLook)
    } else {
      const k = 1 - Math.exp(-dt * (shot.current === 'wide' ? 1.2 : 5))
      cam.position.lerp(targetPos, k)
      look.current.lerp(targetLook, k)
    }
    cam.lookAt(look.current)
  })

  return null
}
