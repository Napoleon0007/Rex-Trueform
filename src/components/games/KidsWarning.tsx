import { useCallback, useRef, useState } from 'react'

// The "responsible gambling" gag. You can bet up to the 100-token table max, but
// the moment your stake climbs past 50 a popup reminds you: "You got kids at
// home." It re-arms once you drop back to 50 or below, so it nags on each fresh
// climb over the line rather than on every single chip.
export const TABLE_MAX = 100
const THRESHOLD = 50

export function useKidsWarning() {
  const [open, setOpen] = useState(false)
  const armed = useRef(true)

  const check = useCallback((stake: number) => {
    if (stake > THRESHOLD && armed.current) {
      armed.current = false
      setOpen(true)
    } else if (stake <= THRESHOLD) {
      armed.current = true
    }
  }, [])

  return { open, close: () => setOpen(false), check }
}

export function KidsAtHomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-3xl border-2 border-amber-400 bg-[#160a04] p-6 text-center shadow-2xl shadow-black/70 animate-[barServe_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">👨‍👧‍👦</div>
        <p className="mt-3 text-2xl font-black uppercase leading-tight tracking-wide text-amber-300"
          style={{ textShadow: '0 0 18px rgba(245,200,80,0.5)' }}>
          You got kids at home
        </p>
        <button
          onClick={onClose}
          className="mt-5 rounded-full bg-amber-500 px-7 py-2.5 text-sm font-black uppercase tracking-widest text-emerald-950 transition hover:bg-amber-400 active:scale-95"
        >
          I hear you
        </button>
      </div>
    </div>
  )
}
