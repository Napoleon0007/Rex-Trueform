import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import TokenBadge from './TokenBadge'

export default function Header() {
  const { profile, clear } = useAuthStore()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    clear()
    navigate('/auth')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Rex Casino" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-base font-black tracking-tight">
            <span className="text-white">REX</span>
            <span className="text-orange-500"> CASINO</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <TokenBadge />
          <button
            onClick={handleSignOut}
            title={`Signed in as ${profile?.display_name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#333] text-xs font-bold text-slate-300 hover:border-orange-500/50 hover:text-white transition-colors uppercase"
          >
            {profile?.display_name?.[0] ?? '?'}
          </button>
        </div>
      </div>
    </header>
  )
}
