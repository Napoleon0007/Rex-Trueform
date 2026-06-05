import { useCasinoPresence } from '../../hooks/useCasinoPresence'
import Avatar from '../ui/Avatar'

// A live row of who's at the tables right now (Supabase presence). Hidden in
// ?preview (no real session) and when nobody's around.
export default function CasinoPresence() {
  const members = useCasinoPresence()
  if (members.length === 0) return null

  return (
    <div className="mb-5 flex items-center justify-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <div className="flex -space-x-2">
        {members.slice(0, 6).map((m) => (
          <Avatar key={m.id} url={m.avatar} name={m.name} size={26} className="ring-2 ring-emerald-400/60" />
        ))}
        {members.length > 6 && (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-emerald-200 ring-2 ring-emerald-400/60">
            +{members.length - 6}
          </span>
        )}
      </div>
      <span className="text-xs text-emerald-200/80">
        {members.length === 1 ? 'just you in the casino' : `${members.length} in the casino`}
      </span>
    </div>
  )
}
