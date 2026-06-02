import { create } from 'zustand'

// A local, fake token balance used ONLY in ?preview mode, so the bar and
// balance UI can be exercised without a real Supabase session. Real logins
// never touch this — see PREVIEW_ENABLED in lib/devPreview.
interface PreviewWallet {
  balance: number
  spend: (n: number) => void
  add: (n: number) => void
  set: (n: number) => void
}

export const usePreviewWallet = create<PreviewWallet>((set) => ({
  balance: 250,
  spend: (n) => set((s) => ({ balance: Math.max(0, s.balance - n) })),
  add: (n) => set((s) => ({ balance: s.balance + n })),
  set: (n) => set({ balance: n }),
}))
