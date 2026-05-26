import { Outlet, NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useProfile } from '../../hooks/useAuth'
import Header from './Header'
import { cn } from '../../lib/utils'

const BG_VIDEOS = ['/rassie.mp4']

function BottomNav() {
  const { profile } = useAuthStore()

  const navItems = [
    { to: '/dashboard',   icon: '🎯', label: 'Markets'   },
    { to: '/leaderboard', icon: '🏆', label: 'Board'     },
    ...(profile?.is_admin ? [{ to: '/admin', icon: '⚙️', label: 'Admin' }] : []),
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[#1a1a1a] bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-around px-2 pb-safe py-2">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-xs transition-colors',
                isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300',
              )
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function AppLayout() {
  const { user, setProfile } = useAuthStore()
  const { data: profile } = useProfile(user?.id)
  const [videoIndex, setVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (profile) setProfile(profile)
  }, [profile, setProfile])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.src = BG_VIDEOS[videoIndex]
    v.load()
    v.play().catch(() => {})
  }, [videoIndex])

  return (
    <div className="min-h-screen">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoIndex((i) => (i + 1) % BG_VIDEOS.length)}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: 0, filter: 'grayscale(1) brightness(0.65)' }}
      />
      <div className="fixed inset-0 bg-black/20" style={{ zIndex: 1 }} />
      <Header />
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-28 pt-4" style={{ zIndex: 2 }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
