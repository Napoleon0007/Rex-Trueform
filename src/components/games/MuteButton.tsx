import { useState } from 'react'
import { isMuted, setMuted, sfx } from '../../lib/sfx'

// Tiny speaker toggle for the casino sound. Persists via the sfx module's
// localStorage flag; clicking to unmute also plays a chip so you hear it work.
export default function MuteButton() {
  const [muted, setLocal] = useState(isMuted())
  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted
        setMuted(next)
        setLocal(next)
        if (!next) sfx.clink()
      }}
      title={muted ? 'Sound off — tap to unmute' : 'Sound on — tap to mute'}
      aria-label={muted ? 'Unmute casino sound' : 'Mute casino sound'}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-black/30 text-sm text-amber-300 transition hover:border-amber-400/70 active:scale-90"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
