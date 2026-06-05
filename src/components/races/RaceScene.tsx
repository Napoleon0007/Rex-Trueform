import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RaceSim, FIELD } from '../../lib/raceSim'
import Track3D from './Track3D'
import Venue from './Venue'
import Horse3D from './Horse3D'
import Broadcast from './Broadcast'
import Dust from './Dust'

type Props = {
  sim: RaceSim
  phase: 'bet' | 'running' | 'done'
  onOrder: (ids: number[]) => void
  onFinish: (classified: number[]) => void
}

// Steps the simulation inside the render loop while a race is running, throttles
// the live running order up to the HUD, and — after a short photo-finish beat
// once the leader crosses — reports the final classification to settle bets.
function RaceDriver({ sim, phase, onOrder, onFinish }: Props) {
  const orderAcc = useRef(0)
  const finishTimer = useRef<number | null>(null)
  const settled = useRef(false)

  useEffect(() => {
    // reset per race
    settled.current = false
    finishTimer.current = null
  }, [sim])

  useFrame((_, dt) => {
    if (phase !== 'running') return

    const leaderDone = sim.step(dt)
    if (leaderDone && finishTimer.current === null) finishTimer.current = 0

    orderAcc.current += dt
    if (orderAcc.current > 0.12) {
      orderAcc.current = 0
      onOrder(sim.order())
    }

    if (finishTimer.current !== null && !settled.current) {
      finishTimer.current += dt
      // let trailers stream past the post under the photo-finish shot
      if (finishTimer.current > 1.6) {
        settled.current = true
        onFinish(sim.classify())
      }
    }
  })

  return null
}

export default function RaceScene(props: Props) {
  const running = props.phase === 'running'
  return (
    <group>
      <Track3D />
      <Venue />
      {Array.from({ length: FIELD }).map((_, i) => (
        <Horse3D key={i} sim={props.sim} index={i} running={running} />
      ))}
      <Dust sim={props.sim} running={running} />
      <Broadcast sim={props.sim} running={running} phase={props.phase} />
      <RaceDriver {...props} />
    </group>
  )
}
