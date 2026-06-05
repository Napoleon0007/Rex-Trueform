import { useState } from 'react'

export default function RulesDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-casino-edge bg-casino-card px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
      >
        <span>📋</span>
        <span>Rules</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-28"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-sm rounded-2xl border border-orange-500/20 bg-casino-card shadow-2xl shadow-black/80 p-5 overflow-y-auto max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">How it works</p>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-white transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <ul className="space-y-2.5 text-sm text-slate-300">
              <li><span className="text-orange-400 font-semibold">1,000 Bitcoin</span> every month — a fresh stack on the 1st</li>
              <li><span className="text-rose-400 font-semibold">No carry-over</span> — unused Bitcoin are wiped at month end. Use them or lose them.</li>
              <li>Predict outcomes before markets close</li>
              <li><span className="text-white font-semibold">Closest predictions</span> win the big prizes</li>
              <li>You're allowed to <span className="text-orange-400 font-semibold">gamble your Bitcoin</span> for bigger payouts or bigger bets on games. The risk is you could <span className="text-rose-400 font-semibold">lose everything</span> — play at your own risk.</li>
              <li><span className="text-orange-400 font-semibold">No crybabies</span></li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
