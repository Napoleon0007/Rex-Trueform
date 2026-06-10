import { RaceSim } from './raceSim'

// One frame of race advancement, shared by the 3D driver (inside react-three-
// fiber's useFrame) and the 2D fallback driver (a plain requestAnimationFrame
// loop). Keeping the step + settle logic in one place means a bet resolves
// identically whether or not the WebGL track managed to load.

export type RaceLoopState = {
  orderAcc: number
  finishTimer: number | null
  settled: boolean
}

export const newRaceLoopState = (): RaceLoopState => ({
  orderAcc: 0,
  finishTimer: null,
  settled: false,
})

export function stepRace(
  sim: RaceSim,
  dt: number,
  st: RaceLoopState,
  onOrder: (ids: number[]) => void,
  onFinish: (classified: number[]) => void,
) {
  const leaderDone = sim.step(dt)
  if (leaderDone && st.finishTimer === null) st.finishTimer = 0

  // Throttle the live running order up to the HUD (~8×/sec).
  st.orderAcc += dt
  if (st.orderAcc > 0.12) {
    st.orderAcc = 0
    onOrder(sim.order())
  }

  // Let trailers stream past the post under the photo-finish beat, then settle.
  if (st.finishTimer !== null && !st.settled) {
    st.finishTimer += dt
    if (st.finishTimer > 1.6) {
      st.settled = true
      onFinish(sim.classify())
    }
  }
}
