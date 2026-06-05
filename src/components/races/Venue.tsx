import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { BEND_R, STRAIGHT, RAIL_OUT } from './track'

// The setting: a raked grandstand packed with a colourful instanced crowd down
// the home straight, floodlight pylons, Rex Trueform branding on the infield and
// a Table Mountain silhouette on the horizon — Cape Town's own racecourse.

const CROWD_COLOURS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#e5e7eb', '#a855f7', '#ec4899', '#fbbf24']

function Crowd() {
  const mesh = useMemo(() => {
    const rows = 8
    const perRow = 90
    const count = rows * perRow
    const geo = new THREE.BoxGeometry(0.5, 0.7, 0.5)
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 })
    const inst = new THREE.InstancedMesh(geo, mat, count)
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let s = 0; s < perRow; s++) {
        const x = -STRAIGHT - 4 + (s / (perRow - 1)) * (STRAIGHT * 2 + 8)
        const z = RAIL_OUT + 10 + r * 1.7
        const y = 2.2 + r * 1.1 + Math.random() * 0.2
        m.setPosition(x + (Math.random() - 0.5) * 0.6, y, z)
        inst.setMatrixAt(i, m)
        col.set(CROWD_COLOURS[Math.floor(Math.random() * CROWD_COLOURS.length)])
        inst.setColorAt(i, col)
        i++
      }
    }
    inst.instanceMatrix.needsUpdate = true
    return inst
  }, [])
  return <primitive object={mesh} />
}

function Grandstand() {
  const rows = 8
  return (
    <group>
      {/* raked seating deck */}
      {Array.from({ length: rows }).map((_, r) => (
        <mesh key={r} position={[0, 1.6 + r * 1.1, RAIL_OUT + 10 + r * 1.7]} receiveShadow castShadow>
          <boxGeometry args={[STRAIGHT * 2 + 14, 0.6, 1.7]} />
          <meshStandardMaterial color={r % 2 ? '#4b5563' : '#374151'} roughness={0.9} />
        </mesh>
      ))}
      {/* roof */}
      <mesh position={[0, 1.6 + rows * 1.1 + 4, RAIL_OUT + 10 + rows * 1.0]} castShadow>
        <boxGeometry args={[STRAIGHT * 2 + 18, 0.4, rows * 2.2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      {/* roof fascia with the brand */}
      <Text
        position={[0, 1.6 + rows * 1.1 + 6.4, RAIL_OUT + 8]}
        fontSize={4}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#000"
      >
        REX TRUEFORM RACING
      </Text>
    </group>
  )
}

function Floodlights() {
  const xs = [-STRAIGHT - 10, -10, STRAIGHT + 10]
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, RAIL_OUT + 6]}>
          <mesh position={[0, 9, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.45, 18, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[0, 18.5, 0.4]}>
            <boxGeometry args={[5, 2, 0.6]} />
            <meshStandardMaterial color="#9ca3af" emissive="#fff7d6" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function InfieldBoard() {
  return (
    <group position={[0, 0, -BEND_R + 14]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[40, 4.5, 0.6]} />
        <meshStandardMaterial color="#0c1322" />
      </mesh>
      <Text position={[0, 2.6, 0.4]} fontSize={2.4} color="#f59e0b" anchorX="center" anchorY="middle">
        REX RACING RING
      </Text>
      <Text position={[0, 0.6, 0.4]} fontSize={1.1} color="#94a3b8" anchorX="center" anchorY="middle">
        CAPE TOWN · EST. 2026
      </Text>
    </group>
  )
}

function TableMountain() {
  // A flat-topped silhouette far behind the back straight: the Mountain, with
  // Devil's Peak and Lion's Head shoulders. Unlit so it reads as a backdrop.
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-180, 0)
    s.lineTo(-150, 38)
    s.lineTo(-120, 46) // Devil's Peak
    s.lineTo(-70, 70)
    s.lineTo(70, 72) // flat table top
    s.lineTo(95, 60)
    s.lineTo(120, 78) // Lion's Head
    s.lineTo(150, 30)
    s.lineTo(190, 0)
    s.closePath()
    return s
  }, [])
  return (
    <mesh position={[0, 0, -BEND_R - 230]} geometry={useMemo(() => new THREE.ShapeGeometry(shape), [shape])}>
      <meshBasicMaterial color="#5b6b86" />
    </mesh>
  )
}

export default function Venue() {
  return (
    <group>
      <Grandstand />
      <Crowd />
      <Floodlights />
      <InfieldBoard />
      <TableMountain />
    </group>
  )
}
