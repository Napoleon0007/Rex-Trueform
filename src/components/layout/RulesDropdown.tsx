import { useState } from 'react'
import { createPortal } from 'react-dom'

const INK = '#1f2d52'   // ballpoint navy
const RED = '#b3261e'   // red-pen emphasis
const HAND = '"Caveat", cursive'

// Red-pen / ink emphasis span.
function Hi({ c = RED, children }: { c?: string; children: React.ReactNode }) {
  return <span style={{ color: c, fontWeight: 700 }}>{children}</span>
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
            {/* crumpled paper texture */}
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'url(/rules-paper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            {/* warm aged wash */}
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(255,250,235,0.10), rgba(150,125,80,0.16) 78%, rgba(80,62,38,0.42))', mixBlendMode: 'multiply' }}
            />

            {/* content — ruled lines + red margin live on this layer */}
            <div
              className="paper-rules relative overflow-y-auto py-6 pr-6"
              style={{ maxHeight: '84vh', paddingLeft: '58px', fontFamily: HAND, color: INK }}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-1 text-3xl leading-none"
                style={{ fontFamily: HAND, color: INK }}
              >
                ✕
              </button>

              {/* $TRUEF logo, stuck on like a sticker */}
              <img
                src="/logo.png"
                alt="$TRUEF"
                className="absolute right-4 top-14 h-16 w-16 rounded-lg"
                style={{ transform: 'rotate(7deg)', boxShadow: '0 3px 9px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.75)' }}
              />

              <h3
                style={{ fontFamily: HAND, fontWeight: 700, fontSize: '2.35rem', lineHeight: 1, color: INK, textDecoration: 'underline', textDecorationColor: RED, textUnderlineOffset: '6px' }}
              >
                House Rules
              </h3>
              <p style={{ fontSize: '1.2rem', marginTop: '2px', color: '#6a5d45' }}>
                <Hi c="#9a6a1f">$TRUEF</Hi> · just between mates
              </p>

              <ul style={{ fontSize: '1.4rem', lineHeight: '32px', marginTop: '18px' }}>
                <li>★ <Hi c={INK}>+1,000 $TRUEF</Hi> every month — yours to keep, it carries over</li>
                <li>★ Closest prediction <Hi>wins</Hi>. Spot on beats everyone — there's always a winner!</li>
                <li>★ <u>Matched stakes</u>: winners take the losers' money by stake — never more than they put up. The rest comes back to you.</li>
                <li>★ Tied? Split by stake — bigger risk, bigger share.</li>
                <li>★ Gamble your $TRUEF on the games for bigger payouts… you could <Hi>lose the lot</Hi>!</li>
              </ul>

              <p
                style={{ fontSize: '2.1rem', fontWeight: 700, color: RED, transform: 'rotate(-3deg)', marginTop: '22px', textAlign: 'center' }}
              >
                NO CRYBABIES!!
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
