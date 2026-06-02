import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  emoji?: string
  variant: ToastVariant
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** Fire-and-forget helpers usable anywhere (outside React too). */
export const toast = {
  success: (message: string, emoji = '✅') => useToastStore.getState().push({ message, emoji, variant: 'success' }),
  error: (message: string, emoji = '⚠️') => useToastStore.getState().push({ message, emoji, variant: 'error' }),
  info: (message: string, emoji?: string) => useToastStore.getState().push({ message, emoji, variant: 'info' }),
}
