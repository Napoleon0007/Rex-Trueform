// Editable list of named options for a pick market (two boxers, a golf
// field, ...). Shared by CreateEventModal and EditEventModal. Keeps a
// minimum of two rows; a quick-add chip appends "Draw" for fight/match
// markets where a draw is a real outcome.

interface OptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
  /** Freeze the list (bets already placed — indexes must not move). */
  disabled?: boolean
}

export default function OptionsEditor({ options, onChange, disabled }: OptionsEditorProps) {
  const hasDraw = options.some((o) => o.trim().toLowerCase() === 'draw')

  function setOption(index: number, value: string) {
    onChange(options.map((o, i) => (i === index ? value : o)))
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-300">
        Options <span className="text-slate-600">(players pick one)</span>
      </label>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={option}
              disabled={disabled}
              onChange={(e) => setOption(i, e.target.value)}
              className="w-full flex-1 rounded-xl border border-casino-line bg-casino-elevated px-4 py-2.5 text-base text-white placeholder:text-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={disabled || options.length <= 2}
              aria-label={`Remove option ${i + 1}`}
              className="rounded-xl border border-casino-line px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-30 disabled:hover:border-casino-line disabled:hover:text-slate-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {disabled ? (
        <p className="text-xs text-slate-500">Options locked — bets already placed.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange([...options, ''])}
            className="rounded-full border border-casino-line bg-casino-elevated px-2.5 py-0.5 text-xs text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors"
          >
            + Add option
          </button>
          {!hasDraw && (
            <button
              type="button"
              onClick={() => onChange([...options, 'Draw'])}
              className="rounded-full border border-casino-line bg-casino-elevated px-2.5 py-0.5 text-xs text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors"
            >
              + Draw
            </button>
          )}
        </div>
      )}
    </div>
  )
}
