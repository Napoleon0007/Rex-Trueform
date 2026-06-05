import { create } from 'zustand'
import { reactLine } from '../lib/dealerLines'

// Fires the win/lose "juice": a one-shot event the global JuiceOverlay listens to.
// celebrate() on a payout, commiserate() on a loss. seq retriggers the overlay even
// for back-to-back identical results. A win >= BIG_WIN gets the full treatment.
export const BIG_WIN = 200

interface JuiceState {
  seq: number
  kind: 'win' | 'lose' | null
  amount: number
  big: boolean
  line: string
  celebrate: (amount: number) => void
  commiserate: () => void
}

const buzz = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported — ignore */ }
}

export const useJuice = create<JuiceState>((set, get) => ({
  seq: 0,
  kind: null,
  amount: 0,
  big: false,
  line: '',
  celebrate: (amount) => {
    const big = amount >= BIG_WIN
    set({ seq: get().seq + 1, kind: 'win', amount, big, line: reactLine(true, big) })
    buzz(big ? [40, 30, 70] : 25)
  },
  commiserate: () => {
    set({ seq: get().seq + 1, kind: 'lose', amount: 0, big: false, line: reactLine(false) })
    buzz(18)
  },
}))
