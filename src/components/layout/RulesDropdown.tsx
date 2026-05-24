import { useState, useRef, useEffect } from 'react'

export default function RulesDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#111] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
      >
        <span>📋</span>
        <span>Rules</span>
        <span className="text-[10px] text-slate-600" style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-orange-500/20 bg-[#111] shadow-2xl shadow-black/60 z-50 p-4">
          <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-3">How it works</p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li><span className="text-orange-400 font-semibold">50 tokens</span> added to your account every month</li>
            <li>Tokens <span className="text-white font-semibold">roll over</span> — unused tokens carry into next month</li>
            <li><span className="text-rose-400 font-semibold">−20 penalty</span> if you still have tokens at month end</li>
            <li>Predict outcomes before markets close</li>
            <li>Payouts are <span className="text-white font-semibold">proportional</span> — closer predictions win bigger shares</li>
            <li>Winner markets: correct pickers <span className="text-white font-semibold">split the pot</span></li>
            <li>Nobody correct → all bets refunded</li>
          </ul>
        </div>
      )}
    </div>
  )
}
