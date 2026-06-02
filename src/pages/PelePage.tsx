import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PelePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [])

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src="/pele-v2.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/20" />
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white text-xl"
      >
        ‹
      </button>
    </div>
  )
}
