import TokenBadge from './TokenBadge'
import RulesDropdown from './RulesDropdown'
import ProfileMenu from './ProfileMenu'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-casino-elevated bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        <a
          href="https://keyside-production.up.railway.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5"
          title="Visit Keyside"
        >
          <img src="/logo.png" alt="Rex Casino" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-base font-black tracking-tight">
            <span className="text-white">REX</span>
            <span className="text-orange-500"> CASINO</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <RulesDropdown />
          <TokenBadge />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
