import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RaceSim } from '../../lib/raceSim'
import { SILKS } from '../../lib/horseNames'
import { samplePath } from './track'

// A stylised-but-real 3D racehorse + jockey, animated with a four-beat gallop.
// One <Horse3D/> per runner; it reads its lane position and stride phase from the
// shared RaceSim each frame and drives its own legs, body bob and lean — so the
// heavy work stays out of React.

// Coat colours so the field looks like real horseflesh (bay, chestnut, grey…).
const COATS = ['#6b4423', '#3b2417', '#8a5a3b', '#9b9b9b', '#caa472', '#2a2a2a', '#7a4a2a', '#b08458']

// Leg phase offsets for a transverse gallop: lead hind, off hind, then fores.
const LEG_PHASE = [0.0, 0.12, 0.5, 0.62] // [hindL, hindR, foreL, foreR]
const LEG_X = [-0.22, 0.22, -0.22, 0.22]
const LEG_Z = [0.5, 0.5, -0.55, -0.55] // hinds toward +Z (rear), fores -Z (front)

type Props = { sim: RaceSim; index: number; running: boolean }

export default function Horse3D({ sim, index, running }: Props) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const legTop = useRef<(THREE.Group | null)[]>([])
  const legBot = useRef<(THREE.Group | null)[]>([])
  const tail = useRef<THREE.Group>(null)

  const coat = COATS[index % COATS.length]
  const silk = SILKS[index % SILKS.length]
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!root.current) return
    const { pos, heading } = samplePath(sim.progress[index], sim.lane[index], v)
    root.current.position.set(pos.x, 0, pos.z)
    root.current.rotation.y = heading

    const g = sim.gallop[index] // 0..1 stride phase
    const moving = running && sim.progress[index] < 1
    const stride = moving ? 1 : 0

    // Body bound (twice per stride) + a stronger reach-and-gather pitch so it
    // reads as galloping rather than sliding.
    if (body.current) {
      const bob = Math.sin(g * Math.PI * 2 * 2) * 0.085 * stride
      body.current.position.y = 0.92 + bob
      body.current.rotation.x = Math.sin(g * Math.PI * 2) * 0.13 * stride
    }

    // Four-beat gallop: swing each leg from the hip, bend the knee on recovery.
    for (let l = 0; l < 4; l++) {
      const top = legTop.current[l]
      const bot = legBot.current[l]
      const ph = (g + LEG_PHASE[l]) % 1
      const swing = Math.sin(ph * Math.PI * 2) * 0.9 * stride
      const knee = Math.max(0, Math.sin(ph * Math.PI * 2 + 1.1)) * 1.3 * stride
      if (top) top.rotation.x = swing - (moving ? 0 : 0)
      if (bot) bot.rotation.x = -knee
    }

    // Tail streams back at speed.
    if (tail.current) {
      tail.current.rotation.x = 0.5 + Math.sin(g * Math.PI * 4) * 0.12 * stride + sim.speed[index] * 4
    }
  })

  return (
    <group ref={root}>
      <group ref={body} position={[0, 0.92, 0]}>
        {/* barrel */}
        <mesh castShadow position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.4, 1.05, 8, 18]} />
          <meshStandardMaterial color={coat} roughness={0.75} />
        </mesh>
        {/* chest */}
        <mesh castShadow position={[0, 0.05, -0.66]}>
          <sphereGeometry args={[0.42, 18, 14]} />
          <meshStandardMaterial color={coat} roughness={0.75} />
        </mesh>
        {/* neck */}
        <mesh castShadow position={[0, 0.42, -0.92]} rotation={[0.7, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.32, 0.75, 14]} />
          <meshStandardMaterial color={coat} roughness={0.75} />
        </mesh>
        {/* head — rounded (a sphere stretched into a muzzle), not a box */}
        <mesh castShadow position={[0, 0.78, -1.16]} rotation={[0.35, 0, 0]} scale={[0.85, 0.95, 1.95]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color={coat} roughness={0.7} />
        </mesh>
        {/* ears */}
        {[-0.07, 0.07].map((ex) => (
          <mesh key={ex} castShadow position={[ex, 0.98, -1.02]} rotation={[-0.25, 0, ex < 0 ? 0.25 : -0.25]}>
            <coneGeometry args={[0.045, 0.16, 6]} />
            <meshStandardMaterial color={coat} roughness={0.8} />
          </mesh>
        ))}
        {/* muzzle */}
        <mesh castShadow position={[0, 0.66, -1.42]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.18, 0.18, 0.26]} />
          <meshStandardMaterial color={'#2a1d14'} roughness={0.7} />
        </mesh>
        {/* mane */}
        <mesh position={[0, 0.62, -0.92]} rotation={[0.7, 0, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.46]} />
          <meshStandardMaterial color={'#1c130c'} roughness={0.9} />
        </mesh>
        {/* tail */}
        <group ref={tail} position={[0, 0.18, 0.62]}>
          <mesh castShadow position={[0, -0.25, 0.18]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.12, 0.7, 8]} />
            <meshStandardMaterial color={'#1c130c'} roughness={0.95} />
          </mesh>
        </group>

        {/* saddle pad in the silk colour */}
        <mesh position={[0, 0.34, 0.05]}>
          <boxGeometry args={[0.72, 0.12, 0.6]} />
          <meshStandardMaterial color={silk.body} roughness={0.6} />
        </mesh>

        {/* ── Jockey, crouched forward over the withers ── */}
        <group position={[0, 0.5, -0.18]}>
          {/* torso in silks */}
          <mesh castShadow position={[0, 0.16, 0]} rotation={[0.7, 0, 0]}>
            <capsuleGeometry args={[0.16, 0.26, 4, 8]} />
            <meshStandardMaterial color={silk.body} roughness={0.55} />
          </mesh>
          {/* helmet */}
          <mesh castShadow position={[0, 0.42, -0.2]}>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color={silk.cap} roughness={0.4} metalness={0.1} />
          </mesh>
          {/* saddlecloth number on the rump */}
          <mesh position={[0, 0.04, 0.36]} rotation={[-0.2, 0, 0]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshStandardMaterial color={'#ffffff'} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── Four legs ── */}
      {LEG_X.map((lx, l) => (
        <group key={l} ref={(el) => (legTop.current[l] = el)} position={[lx, 0.88, LEG_Z[l]]}>
          <mesh castShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.56, 6]} />
            <meshStandardMaterial color={coat} roughness={0.8} />
          </mesh>
          <group ref={(el) => (legBot.current[l] = el)} position={[0, -0.56, 0]}>
            <mesh castShadow position={[0, -0.26, 0]}>
              <cylinderGeometry args={[0.055, 0.045, 0.52, 6]} />
              <meshStandardMaterial color={coat} roughness={0.8} />
            </mesh>
            {/* hoof */}
            <mesh castShadow position={[0, -0.52, 0.02]}>
              <boxGeometry args={[0.1, 0.1, 0.14]} />
              <meshStandardMaterial color={'#15100b'} roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
