// Can this browser actually hand us a WebGL context right now? Returns false when
// WebGL is unsupported OR switched off (e.g. iOS Safari's Advanced > Experimental
// settings, or a hardened browser) — the exact case where the 3D race page would
// otherwise mount a renderer that throws asynchronously and blank the screen.
// React error boundaries can't catch that async throw, so we probe a throwaway
// canvas and choose the 2D fallback up front instead.
export function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    const gl =
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}
