import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SPRINGBOK_FIXTURES, SPRINGBOK_SEASON } from '../../lib/springbokFixtures'
import {
  WC_INFO, WC_GROUPS, WC_KNOCKOUT, WC_SA_FIXTURES, WC_SA_GROUP,
} from '../../lib/worldCupFixtures'

type Tab = 'boks' | 'world-cup'

const HA_LABEL: Record<string, { txt: string; cls: string }> = {
  H: { txt: 'HOME',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  A: { txt: 'AWAY',    cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  N: { txt: 'NEUTRAL', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
}

function SpringbokTab() {
  return (
    <div className="space-y-5">
      {SPRINGBOK_FIXTURES.map((block) => (
        <div key={block.series}>
          <div className="mb-2 flex items-baseline gap-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">{block.series}</h4>
            {block.note && <span className="text-[11px] text-amber-200/60">— {block.note}</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-amber-500/20">
            {block.fixtures.map((f, i) => (
              <div
                key={`${f.iso}-${f.opponent}`}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${i % 2 ? 'bg-black/30' : 'bg-black/10'}`}
              >
                <span className="w-24 shrink-0 font-mono text-xs text-amber-200/80">{f.dateLabel}</span>
                <span className="text-lg leading-none">{f.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-amber-50">{f.opponent}</p>
                  <p className="truncate text-[11px] text-amber-200/50">{f.comp} · {f.venue}, {f.city}</p>
                </div>
                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black tracking-wider ${HA_LABEL[f.ha].cls}`}>
                  {HA_LABEL[f.ha].txt}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function WorldCupTab() {
  return (
    <div className="space-y-5">
      {/* Quick facts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: WC_INFO.teams, l: 'Teams' },
          { n: WC_INFO.groups, l: 'Groups' },
          { n: WC_INFO.matches, l: 'Matches' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-amber-500/20 bg-black/30 py-2">
            <p className="text-xl font-black text-amber-300">{s.n}</p>
            <p className="text-[10px] uppercase tracking-widest text-amber-200/50">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-amber-200/60">{WC_INFO.hosts} · {WC_INFO.dateLabel}</p>

      {/* Bafana spotlight */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
          🇿🇦 Bafana Bafana — Group {WC_SA_GROUP}
        </p>
        {WC_SA_FIXTURES.map((m, i) => (
          <div key={i} className="flex items-baseline gap-2 py-0.5 text-sm">
            <span className="w-24 shrink-0 font-mono text-xs text-emerald-200/80">{m.dateLabel}</span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-50">{m.text}</p>
              <p className="text-[11px] text-emerald-200/50">{m.venue}{m.note ? ` · ${m.note}` : ''}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Groups */}
      <div>
        <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">The 12 Groups</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WC_GROUPS.map((g) => {
            const isSa = g.group === WC_SA_GROUP
            return (
              <div
                key={g.group}
                className={`rounded-lg border p-2 ${isSa ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/15 bg-black/30'}`}
              >
                <p className={`mb-1 text-[10px] font-black uppercase tracking-widest ${isSa ? 'text-emerald-300' : 'text-amber-300/70'}`}>
                  Group {g.group}
                </p>
                {g.teams.map((t) => (
                  <p key={t.name} className={`flex items-center gap-1.5 truncate text-xs ${t.name === 'South Africa' ? 'font-bold text-emerald-200' : 'text-amber-50/90'}`}>
                    <span className="leading-none">{t.flag}</span>{t.name}{t.host && <span className="text-[8px] text-amber-300/60">HOST</span>}
                  </p>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Road to the final */}
      <div>
        <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Road to the Final</h4>
        <div className="overflow-hidden rounded-xl border border-amber-500/20">
          {WC_KNOCKOUT.map((r, i) => {
            const isFinal = r.round === 'FINAL'
            return (
              <div key={r.round} className={`flex items-center gap-3 px-3 py-2 text-sm ${isFinal ? 'bg-amber-500/15' : i % 2 ? 'bg-black/30' : 'bg-black/10'}`}>
                <span className="w-28 shrink-0 font-mono text-xs text-amber-200/80">{r.dateLabel}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-bold ${isFinal ? 'text-amber-200' : 'text-amber-50'}`}>{r.round}</p>
                  <p className="truncate text-[11px] text-amber-200/50">{r.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-center text-[10px] text-amber-200/40">
        Knockout opponents decided once the groups are played. Fixtures confirmed via FIFA / press, June 2026.
      </p>
    </div>
  )
}

export default function FixturesModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('boks')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Action button — push to open the fixtures (no auto-popup) */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-b from-emerald-800/80 to-emerald-950/80 px-4 py-3 text-sm font-black uppercase tracking-wider text-amber-200 shadow-[0_0_20px_rgba(245,200,80,0.2)] transition-all hover:border-amber-300 hover:text-amber-100"
      >
        <span className="text-lg leading-none">🏉</span>
        <span>Bok Fixtures 2025/2026</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm animate-fade-in no-print" />

          <div className="schedule-print-root relative z-10 my-auto w-full max-w-2xl animate-slide-up rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#0e1410] to-[#080a08] shadow-2xl shadow-black/80"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}
          >
            {/* Letterhead */}
            <div className="relative overflow-hidden rounded-t-2xl border-b border-amber-500/30 bg-gradient-to-r from-emerald-950 via-[#0e1a12] to-emerald-950 px-5 py-4">
              <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,200,80,0.35), transparent 70%)' }} />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src="/springbok-logo.jpeg" alt="" className="h-11 w-auto rounded-lg shadow-lg" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/80">Rex Trueform · Sports Desk</p>
                    <h3 className="text-lg font-black uppercase tracking-tight text-amber-50">{SPRINGBOK_SEASON} Fixtures</h3>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="no-print flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-amber-200/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="no-print flex gap-2 px-5 pt-4">
              {([['boks', '🏉 Springboks'], ['world-cup', '⚽ World Cup']] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                    tab === key
                      ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                      : 'border-amber-500/20 bg-black/30 text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sheet body */}
            <div className="max-h-[62vh] overflow-y-auto px-5 py-4 sm:max-h-[70vh]">
              {/* Printed title (shows the active section heading on the PDF) */}
              <p className="mb-3 hidden text-center text-sm font-black uppercase tracking-[0.2em] text-amber-300 print:block">
                {tab === 'boks' ? 'Springboks 2026 Season' : 'FIFA World Cup 2026'}
              </p>
              {tab === 'boks' ? <SpringbokTab /> : <WorldCupTab />}
            </div>

            {/* Footer / actions */}
            <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-amber-500/20 bg-black/40 px-5 py-3">
              <p className="text-[10px] text-amber-200/40">Rex Trueform · The Boys' Quarters</p>
              <button
                onClick={() => window.print()}
                className="no-print rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/25"
              >
                🖨 Save as PDF
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
