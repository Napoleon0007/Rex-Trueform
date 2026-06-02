// A vintage Vegas "martini-glass pin-up" silhouette — a curvy showgirl reclining
// across the rim of a cocktail glass. Stylised line/silhouette art (hand-built as
// SVG, no nudity), used as the watermark on the face cards and the motif on the
// card back. Color and opacity are configurable so it works on light card faces
// and the dark card back.
export default function PinUpArt({
  color = '#c9971f',
  className = '',
  style,
}: {
  color?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg viewBox="0 0 48 64" className={className} style={style} aria-hidden>
      {/* cocktail glass */}
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 30 L36 30 L24 45 Z" />
        <line x1="24" y1="45" x2="24" y2="55" />
        <line x1="16" y1="57" x2="32" y2="57" />
      </g>
      {/* showgirl reclining on the rim, legs kicked over the bowl */}
      <g fill={color}>
        {/* head + tossed-back hair */}
        <circle cx="31" cy="15" r="3" />
        <path d="M33 13 Q39 12 41 16 Q39 15 34 16 Z" />
        {/* arched back + bust, arm raised behind head */}
        <path d="M30 17 Q26 20 25 25 Q28 27 31 25 Q32 21 32 18 Z" />
        <path d="M30 17 Q33 12 31 8 L29 9 Q31 13 28 17 Z" />
        {/* hips / waist curve */}
        <path d="M25 25 Q20 27 16 30 Q18 32 22 30 Q24 28 26 27 Z" />
        {/* long crossed legs draping into the bowl */}
        <path d="M22 29 Q18 34 14 40 L16 41 Q20 35 24 31 Z" />
        <path d="M24 30 Q22 37 19 43 L21 44 Q24 38 26 32 Z" />
        {/* pointed heel */}
        <path d="M13 40 L16 41 L14 43 Z" />
      </g>
    </svg>
  )
}
