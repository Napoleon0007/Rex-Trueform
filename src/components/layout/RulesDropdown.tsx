import { useState } from 'react'

export default function RulesDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#111] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
      >
        <span>📋</span>
        <span>Rules</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-sm rounded-2xl border border-orange-500/20 bg-[#111] shadow-2xl shadow-black/80 p-5"
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
              <li><span className="text-orange-400 font-semibold">50 tokens</span> added to your account every month</li>
              <li>Tokens <span className="text-white font-semibold">roll over</span> — unused tokens carry into next month</li>
              <li><span className="text-rose-400 font-semibold">−20 penalty</span> if you still have tokens at month end</li>
              <li>Predict outcomes before markets close</li>
              <li>Payouts are <span className="text-white font-semibold">proportional</span> — closer predictions win bigger shares</li>
              <li>Winner markets: correct pickers <span className="text-white font-semibold">split the pot</span></li>
              <li>Nobody correct → all bets refunded</li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
