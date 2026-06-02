// The roulette wheel SVG, shared by the live Roulette game and the idle
// "fixture" wheel that keeps spinning on the games table before you pick a game.
// In idle mode it rotates forever via a CSS animation; in game mode the parent
// drives `rotation` and the cubic-bezier `transition` to land on a pocket.

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
export const isRouletteRed = (n: number) => RED.has(n)
export const WHEEL_STEP = 360 / 37

export default function RouletteWheel({
  rotation = 0,
  transition = 'none',
  idle = false,
  className = '',
}: {
  rotation?: number
  transition?: string
  idle?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} ${idle ? 'animate-[wheelSpin_22s_linear_infinite]' : ''}`}
      style={idle ? undefined : { transform: `rotate(${rotation}deg)`, transition }}
    >
      <circle cx="100" cy="100" r="98" fill="#2a1206" />
      <circle cx="100" cy="100" r="92" fill="#0b3d28" />
      {Array.from({ length: 37 }, (_, n) => {
        const a = (n * WHEEL_STEP - 90) * (Math.PI / 180)
        const x = 100 + Math.cos(a) * 82
        const y = 100 + Math.sin(a) * 82
        const fill = n === 0 ? '#0f7a3d' : isRouletteRed(n) ? '#c0182b' : '#15110c'
        return (
          <g key={n}>
            <circle cx={x} cy={y} r="9.2" fill={fill} stroke="#caa14a" strokeWidth="0.6" />
            <text x={x} y={y} fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle" dominantBaseline="central" transform={`rotate(${n * WHEEL_STEP} ${x} ${y})`}>{n}</text>
          </g>
        )
      })}
      <circle cx="100" cy="100" r="30" fill="#3a2210" stroke="#caa14a" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="6" fill="#caa14a" />
    </svg>
  )
}
