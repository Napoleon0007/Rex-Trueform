import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { RaceSim } from '../../lib/raceSim'
import RaceScene from './RaceScene'

// The WebGL stage: real sky + sun, soft shadows, a touch of bloom/vignette for
// the broadcast look. Everything heavy lives below <Suspense/> so the route can
// stream in. The camera is flown entirely by <Broadcast/> inside the scene.

const SUN = new THREE.Vector3(60, 90, 40)

// Mobile GPUs — iOS Safari especially — cap WebGL memory hard and choke on the
// full desktop pipeline (2K shadow map + a multisampled bloom/vignette pass).
// On those devices we drop to a lean renderer: no postprocessing, no shadows,
// device pixel ratio 1. Still 3D, just within a phone's memory budget.
const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches === true &&
      window.innerWidth < 900))

type Props = {
  sim: RaceSim
  phase: 'bet' | 'running' | 'done'
  onOrder: (ids: number[]) => void
  onFinish: (classified: number[]) => void
}

export default function RaceCanvas(props: Props) {
  return (
    <Canvas
      shadows={!IS_MOBILE}
      dpr={IS_MOBILE ? 1 : [1, 1.75]}
      camera={{ fov: 46, near: 0.5, far: 2000, position: [0, 90, 150] }}
      gl={{ antialias: !IS_MOBILE, powerPreference: IS_MOBILE ? 'default' : 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 0.92 }}
    >
      <fog attach="fog" args={['#cfe3f5', 520, 1700]} />
      <Sky sunPosition={[SUN.x, SUN.y, SUN.z]} turbidity={3} rayleigh={1.0} mieCoefficient={0.0028} mieDirectionalG={0.85} />

      <hemisphereLight args={['#cfe8ff', '#3a5a2a', 0.5]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[SUN.x, SUN.y, SUN.z]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
      />

      <Suspense fallback={null}>
        <RaceScene {...props} />
      </Suspense>

      {/* Broadcast polish — skipped on mobile, where the extra render targets are
          what tip phone GPUs over their WebGL memory limit. */}
      {!IS_MOBILE && (
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.22} luminanceThreshold={0.9} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
