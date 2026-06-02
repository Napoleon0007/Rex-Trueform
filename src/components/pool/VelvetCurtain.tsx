import { useEffect, useRef, useState } from 'react'

// A pair of 3D velvet curtains hung at the entrance to the lounge. They start
// closed and part — swinging open with a touch of perspective — as the visitor
// scrolls down into the pool room. Purely an overlay: pointer-events are off so
// it never blocks the room behind it once open.
export default function VelvetCurtain() {
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(0) // 0 = shut, 1 = fully parted

  useEffect(() => {
    const el = anchor.current
    if (!el) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // Begin parting once the curtain top reaches the lower viewport, finish
      // by the time it has travelled ~70% of a screen height upward.
      const p = (vh - rect.top) / (vh * 0.7)
      setOpen(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Each panel is 52% wide so they overlap when shut; they slide fully off-screen
  // and rotate slightly away for depth as `open` climbs to 1.
  const shift = open * 104       // % of own width pushed outward
  const swing = open * 22        // degrees of perspective swing

  return (
    <>
      {/* scroll anchor sitting at the very top of the lounge section */}
      <div ref={anchor} className="absolute inset-x-0 top-0 h-px" />

      <div
        className="stage-3d pointer-events-none absolute inset-x-0 top-0 z-30 h-screen overflow-hidden"
        style={{ opacity: open >= 1 ? 0 : 1, transition: 'opacity 0.4s', visibility: open >= 1 ? 'hidden' : 'visible' }}
        aria-hidden
      >
        {/* valance / pelmet across the top */}
        <div className="velvet-valance absolute inset-x-0 top-0 z-10 h-16" style={{ boxShadow: '0 8px 18px rgba(0,0,0,0.6)' }} />

        {/* left panel */}
        <div
          className="velvet-panel absolute left-0 top-0 h-full"
          style={{
            width: '52%',
            transformOrigin: 'left center',
            transform: `translateX(-${shift}%) rotateY(${swing}deg)`,
            transition: 'transform 0.15s linear',
          }}
        >
          <div className="velvet-trim absolute right-0 top-0 h-full w-1.5" />
        </div>

        {/* right panel */}
        <div
          className="velvet-panel absolute right-0 top-0 h-full"
          style={{
            width: '52%',
            transformOrigin: 'right center',
            transform: `translateX(${shift}%) rotateY(-${swing}deg)`,
            transition: 'transform 0.15s linear',
          }}
        >
          <div className="velvet-trim absolute left-0 top-0 h-full w-1.5" />
        </div>

        {/* gold "scroll to enter" cue, fades as the curtains part */}
        <div
          className="absolute inset-x-0 bottom-10 z-20 text-center"
          style={{ opacity: 1 - open * 2 }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-300" style={{ textShadow: '0 0 16px rgba(245,200,80,0.7)' }}>
            ↓ Scroll to enter ↓
          </p>
        </div>
      </div>
    </>
  )
}
