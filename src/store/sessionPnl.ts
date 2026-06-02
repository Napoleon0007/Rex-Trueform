import { create } from 'zustand'

// Tracks this sitting's casino performance — total staked vs total won, and the
// running net (your P&L chip on the games table). Resets on full page reload;
// call reset() to clear it manually. Updated by useWallet on every bet/payout so
// it stays correct across roulette, blackjack, poker and slots in one session.
interface SessionPnl {
  staked: number
  won: number
  net: number
  stake: (n: number) => void
  win: (n: number) => void
  reset: () => void
}

export const useSessionPnl = create<SessionPnl>((set) => ({
  staked: 0,
  won: 0,
  net: 0,
  stake: (n) => set((s) => ({ staked: s.staked + n, net: s.net - n })),
  win: (n) => set((s) => ({ won: s.won + n, net: s.net + n })),
  reset: () => set({ staked: 0, won: 0, net: 0 }),
}))
