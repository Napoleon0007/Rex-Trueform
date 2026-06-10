import { useState } from 'react'
import { createPortal } from 'react-dom'

const INK = '#14110a'    // thick black ink (warm near-black)
const ORANGE = '#e2640c' // orange pen for emphasis
const HAND = '"Caveat", cursive'

// Orange-pen emphasis — heavier stroke so it reads like it's pressed in.
function Hi({ children }: { children: React.ReactNode }) {
  return <span style={{ color: ORANGE, WebkitTextStroke: `0.7px ${ORANGE}` }}>{children}</span>
}

export default function RulesDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-casino-edge bg-casino-card px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-orange-500/40 hover:text-orange-400"
      >
        <span>📋</span>
        <span>Rules</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 pb-10 pt-20"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          {/* the crumpled note, tossed on the table */}
          <div
            className="paper-note relative w-full max-w-sm overflow-hidden rounded-[3px]"
            style={{ maxHeight: '84vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'url(/rules-paper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(255,250,235,0.10), rgba(150,125,80,0.16) 78%, rgba(80,62,38,0.42))', mixBlendMode: 'multiply' }}
            />

            <div
              className="paper-rules relative overflow-y-auto py-6 pr-6"
              style={{ maxHeight: '84vh', paddingLeft: '58px' }}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-1 text-3xl font-bold leading-none"
                style={{ fontFamily: HAND, color: INK }}
              >
                ✕
              </button>

              {/* $TRUEF logo, stuck on like a sticker (kept crisp, not blended) */}
              <img
                src="/logo.png"
                alt="$TRUEF"
                className="absolute right-4 top-14 h-16 w-16 rounded-lg"
                style={{ transform: 'rotate(7deg)', boxShadow: '0 3px 9px rgba(0,0,0,0.45)', border: '2px solid rgba(255,255,255,0.8)' }}
              />

              {/* The ink — multiply-blended into the paper so it looks written on,
                  bold Caveat with a stroke so every letter is thick and legible. */}
              <div
                style={{
                  fontFamily: HAND,
                  fontWeight: 700,
                  color: INK,
                  WebkitTextStroke: `0.55px ${INK}`,
                  mixBlendMode: 'multiply',
                }}
              >
                <h3
                  style={{
                    fontSize: '2.6rem',
                    lineHeight: 1,
                    textDecoration: 'underline',
                    textDecorationColor: ORANGE,
                    textDecorationThickness: '3px',
                    textUnderlineOffset: '6px',
                    WebkitTextStroke: `1px ${INK}`,
                  }}
                >
                  House Rules
                </h3>
                <p style={{ fontSize: '1.3rem', marginTop: '4px' }}>
                  <Hi>$TRUEF</Hi> · just between mates
                </p>

                <ul style={{ fontSize: '1.55rem', lineHeight: '32px', marginTop: '18px' }}>
                  <li><span style={{ color: ORANGE }}>★</span> <Hi>+1,000 $TRUEF</Hi> every month — yours to keep, it carries over</li>
                  <li><span style={{ color: ORANGE }}>★</span> Closest prediction <Hi>wins</Hi>. Spot on beats everyone — there's always a winner!</li>
                  <li><span style={{ color: ORANGE }}>★</span> <u>Matched stakes</u>: winners take the losers' money by stake — never more than they put up. The rest comes back to you.</li>
                  <li><span style={{ color: ORANGE }}>★</span> Tied? Split by stake — bigger risk, bigger share.</li>
                  <li><span style={{ color: ORANGE }}>★</span> Gamble your <Hi>$TRUEF</Hi> on the games for bigger payouts… you could <Hi>lose the lot</Hi>!</li>
                </ul>

                <p
                  style={{
                    fontSize: '2.4rem',
                    color: ORANGE,
                    transform: 'rotate(-3deg)',
                    marginTop: '22px',
                    textAlign: 'center',
                    WebkitTextStroke: `1px ${ORANGE}`,
                  }}
                >
                  NO CRYBABIES!!
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
