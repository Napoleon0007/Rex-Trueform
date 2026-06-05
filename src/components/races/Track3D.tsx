import { useMemo } from 'react'
import * as THREE from 'three'
import {
  samplePath,
  railPoints,
  BEND_R,
  RAIL_IN,
  RAIL_OUT,
  TRACK_W,
  STRAIGHT,
} from './track'

// The visible circuit: turf infield with mown stripes, the running surface as a
// ribbon that hugs the oval, white running rails, the finish gantry at the post
// and furlong markers down the home straight.

function useStripeTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 16
    const ctx = c.getContext('2d')!
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#3f9128' : '#4ca832'
      ctx.fillRect((i / 32) * 512, 0, 512 / 32, 16)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [])
}

// Ribbon mesh that follows the centreline between the inner and outer rails.
function useTrackRibbon() {
  return useMemo(() => {
    const steps = 256
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const inner = new THREE.Vector3()
    const outer = new THREE.Vector3()
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      samplePath(t, -TRACK_W / 2, inner)
      samplePath(t, TRACK_W / 2, outer)
      pos.push(inner.x, 0.02, inner.z, outer.x, 0.02, outer.z)
      const u = t * 60 // stripe repeats around the lap
      uv.push(u, 0, u, 1)
    }
    for (let i = 0; i < steps; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }, [])
}

function Rail({ radius, color }: { radius: number; color: string }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(railPoints(radius - BEND_R, 200), true)
    return new THREE.TubeGeometry(curve, 240, 0.12, 6, true)
  }, [radius])
  return (
    <group>
      <mesh geometry={geo} castShadow position={[0, 0.55, 0]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh geometry={geo} castShadow position={[0, 0.2, 0]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function Track3D() {
  const stripes = useStripeTexture()
  const ribbon = useTrackRibbon()

  const post = useMemo(() => samplePath(0, 0, new THREE.Vector3()).pos.clone(), [])

  // Furlong markers down the home straight, on the outer rail.
  const markers = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (const t of [0.04, 0.08, 0.12]) {
      out.push(samplePath(t, TRACK_W / 2 + 1, new THREE.Vector3()).pos.clone())
    }
    return out
  }, [])

  return (
    <group>
      {/* base grass — large plane catching shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2f7d2a" roughness={1} />
      </mesh>

      {/* infield with mown stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[(STRAIGHT + RAIL_IN) * 2, RAIL_IN * 2]} />
        <meshStandardMaterial map={useMemo(() => {
          const t = stripes.clone()
          t.needsUpdate = true
          t.repeat.set(10, 1)
          return t
        }, [stripes])} color="#43972c" roughness={1} />
      </mesh>

      {/* running surface */}
      <mesh geometry={ribbon} receiveShadow>
        <meshStandardMaterial map={stripes} color="#4ca832" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* worn racing line just off the inner rail */}
      <mesh geometry={useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(railPoints(-(TRACK_W / 2) + 2.2, 200), true)
        return new THREE.TubeGeometry(curve, 240, 1.3, 4, true)
      }, [])} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#3c7d24" roughness={1} />
      </mesh>

      <Rail radius={RAIL_IN} color="#f4f4f5" />
      <Rail radius={RAIL_OUT} color="#e7e5e4" />

      {/* ── Finish line + gantry at the post ── */}
      <group position={[post.x, 0, post.z]}>
        {/* checkered line across the track */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <planeGeometry args={[1.2, TRACK_W]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        {/* uprights */}
        {[-TRACK_W / 2 - 1, TRACK_W / 2 + 1].map((x) => (
          <mesh key={x} position={[x, 3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 6, 8]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
        ))}
        {/* banner */}
        <mesh position={[0, 6, 0]}>
          <boxGeometry args={[TRACK_W + 3, 1.1, 0.2]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
        <mesh position={[0, 6, 0.12]}>
          <planeGeometry args={[TRACK_W + 1, 0.7]} />
          <meshStandardMaterial color="#fde047" />
        </mesh>
      </group>

      {/* furlong markers */}
      {markers.map((m, i) => (
        <mesh key={i} position={[m.x, 0.6, m.z]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 1.2, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}
