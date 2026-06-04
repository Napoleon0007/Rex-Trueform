interface AvatarProps {
  url?: string | null
  name?: string | null
  size?: number
  className?: string
}

// A profile picture if one is set, otherwise the first initial on a disc.
export default function Avatar({ url, name, size = 36, className = '' }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'avatar'}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-700 font-bold uppercase text-slate-200 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  )
}
