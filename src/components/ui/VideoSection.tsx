import { useEffect, useRef } from 'react'

interface VideoSectionProps {
  src: string
  objectPosition?: string
  objectFit?: React.CSSProperties['objectFit']
  /** Tailwind classes for the dark overlay above the video. */
  overlayClassName?: string
  /** Show the orange fade at the bottom of the section. */
  showGradient?: boolean
  sectionStyle?: React.CSSProperties
  videoStyle?: React.CSSProperties
  children?: React.ReactNode
}

/**
 * Full-height background-video section with robust autoplay handling.
 * iOS Safari is fussy about muted autoplay, so we set the DOM attributes
 * directly and retry play on canplay / touch / visibility changes, and
 * pause when scrolled out of view to save battery.
 *
 * Shared by AuthPage (login + teaser sections) and AppLayout (scroll sections).
 */
export default function VideoSection({
  src,
  objectPosition = 'center',
  objectFit = 'cover',
  overlayClassName = 'bg-black/20',
  showGradient = true,
  sectionStyle,
  videoStyle,
  children,
}: VideoSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    const section = sectionRef.current
    if (!v || !section) return

    // iOS Safari checks the DOM attribute, not just the JS property
    v.muted = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', '')

    const tryPlay = () => { v.muted = true; if (v.paused) v.play().catch(() => {}) }

    tryPlay()
    v.addEventListener('canplay', tryPlay)
    document.addEventListener('touchstart', tryPlay, { passive: true })
    document.addEventListener('visibilitychange', tryPlay)

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) tryPlay(); else v.pause() },
      { rootMargin: '400px 0px', threshold: 0 },
    )
    observer.observe(section)

    return () => {
      observer.disconnect()
      v.removeEventListener('canplay', tryPlay)
      document.removeEventListener('touchstart', tryPlay)
      document.removeEventListener('visibilitychange', tryPlay)
    }
  }, [])

  return (
    <div ref={sectionRef} className="min-h-screen" style={{ position: 'relative', overflow: 'hidden', ...sectionStyle }}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: 'none', objectPosition, objectFit, ...videoStyle }}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
      {showGradient && (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-orange-900/20 to-transparent" />
      )}
      {children && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
          {children}
        </div>
      )}
    </div>
  )
}
