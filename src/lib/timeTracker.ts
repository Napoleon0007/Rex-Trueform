// Tracks how long the player has actually been on the site, accumulated on
// this device (localStorage). Only counts seconds while the tab is visible,
// so background tabs don't inflate it. Persists across reloads & sessions.

const KEY = 'rex_active_seconds'
const TICK = 15 // seconds per increment

function readSeconds(): number {
  return parseInt(window.localStorage?.getItem(KEY) ?? '0', 10) || 0
}

let started = false
export function startTimeTracker() {
  if (started || typeof window === 'undefined') return
  started = true
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      window.localStorage?.setItem(KEY, String(readSeconds() + TICK))
    }
  }, TICK * 1000)
}

export function getActiveMinutes(): number {
  return Math.floor(readSeconds() / 60)
}
