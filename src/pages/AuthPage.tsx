import { useEffect, useRef } from 'react'
import MagicLinkForm from '../components/auth/MagicLinkForm'

function VideoSection({ src, children }: { src: string; children?: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true

    const tryPlay = () => { if (v.paused) v.play().catch(() => {}) }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) tryPlay(); else v.pause() },
      { threshold: 0.4 }
    )
    observer.observe(v)

    document.addEventListener('visibilitychange', tryPlay)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', tryPlay)
    }
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden snap-start">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ pointerEvents: 'none' }}
        src={src}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-orange-900/20 to-transparent" />
      {children && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
          {children}
        </div>
      )}
    </div>
  )
}

export default function AuthPage() {
  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">

      {/* Section 1: Login */}
      <VideoSection src="/hero-v2.mp4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl ring-2 ring-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.35)]">
              <img src="/logo.png" alt="Rex Casino" className="h-full w-full object-cover" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight">
                <span className="text-white">REX </span>
                <span className="text-orange-500">CASINO</span>
              </h1>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/70">
                Rex True Form
              </p>
            </div>
            <p className="text-slate-400 text-sm">Private prediction game · by invite only</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <MagicLinkForm />
          </div>
          <p className="text-center text-xs text-slate-500">
            No password. No account creation. Just your email.
          </p>
        </div>
      </VideoSection>

      {/* Section 2: Maradona */}
      <VideoSection src="/maradona-v2.mp4" />

      {/* Section 3: Pelé */}
      <VideoSection src="/pele-v2.mp4" />

    </div>
  )
}
