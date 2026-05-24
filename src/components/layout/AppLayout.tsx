import { Outlet, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useProfile } from '../../hooks/useAuth'
import Header from './Header'
import { cn } from '../../lib/utils'

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

  useEffect(() => {
    if (profile) setProfile(profile)
  }, [profile, setProfile])

  return (
    <div className="min-h-screen">
      <video
        src="/maradona.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />
      <div className="fixed inset-0 bg-black/50" style={{ zIndex: 1 }} />
      <Header />
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-28 pt-6" style={{ zIndex: 2 }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
