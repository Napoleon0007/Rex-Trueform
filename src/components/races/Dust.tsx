import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RaceSim } from '../../lib/raceSim'
import { samplePath } from './track'

// Turf and dust kicked up behind the galloping field. A fixed pool of points is
// recycled to the rear of whichever horses are running fastest, then drifts up
// and fades — cheap, but it sells the speed.

const COUNT = 240

type Props = { sim: RaceSim; running: boolean }

export default function Dust({ sim, running }: Props) {
  const points = useRef<THREE.Points>(null)
  const life = useRef(new Float32Array(COUNT))
  const vel = useRef(new Float32Array(COUNT * 3))
  const tmp = useMemo(() => new THREE.Vector3(), [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(COUNT * 3).fill(9999), 3))
    return g
  }, [])

  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grd.addColorStop(0, 'rgba(180,150,110,0.8)')
    grd.addColorStop(1, 'rgba(180,150,110,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((_, dt) => {
    if (!points.current) return
    const pos = geo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    let spawnBudget = running ? 6 : 0

    for (let i = 0; i < COUNT; i++) {
      if (life.current[i] > 0) {
        life.current[i] -= dt
        arr[i * 3] += vel.current[i * 3] * dt
        arr[i * 3 + 1] += vel.current[i * 3 + 1] * dt
        arr[i * 3 + 2] += vel.current[i * 3 + 2] * dt
        vel.current[i * 3 + 1] -= dt * 0.6 // settle back down
      } else if (spawnBudget > 0) {
        // pick a moving horse, weighted toward the faster ones
        const h = Math.floor(Math.random() * sim.runners.length)
        if (sim.speed[h] > 0.001 && sim.progress[h] < 1) {
          const { pos: p, heading } = samplePath(sim.progress[h], sim.lane[h], tmp)
          const back = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(-0.7)
          arr[i * 3] = p.x + back.x + (Math.random() - 0.5) * 0.4
          arr[i * 3 + 1] = 0.15
          arr[i * 3 + 2] = p.z + back.z + (Math.random() - 0.5) * 0.4
          vel.current[i * 3] = back.x * 1.5
          vel.current[i * 3 + 1] = 0.6 + Math.random() * 0.5
          vel.current[i * 3 + 2] = back.z * 1.5
          life.current[i] = 0.6 + Math.random() * 0.4
          spawnBudget--
        }
      } else {
        arr[i * 3 + 1] = -9999
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geo}>
      <pointsMaterial
        map={tex}
        size={1.6}
        sizeAttenuation
        transparent
        depthWrite={false}
        opacity={0.6}
        color="#cbb892"
      />
    </points>
  )
}
