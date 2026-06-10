import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RaceSim, FIELD } from '../../lib/raceSim'
import { newRaceLoopState, stepRace } from '../../lib/raceLoop'
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
  const loop = useRef(newRaceLoopState())

  useEffect(() => {
    loop.current = newRaceLoopState() // reset per race
  }, [sim])

  useFrame((_, dt) => {
    if (phase !== 'running') return
    stepRace(sim, dt, loop.current, onOrder, onFinish)
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
