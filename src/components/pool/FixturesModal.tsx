import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SPRINGBOK_FIXTURES, SPRINGBOK_SEASON } from '../../lib/springbokFixtures'
import {
  WC_INFO, WC_GROUPS, WC_KO_ROUNDS, WC_SA_GROUP, WC_SA_MATCHES,
  flagOf, groupMatches, roundMatches, wcDateLabel,
  type WcMatch,
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

// One fixture row — shared by the group and knockout views.
function WcMatchRow({ m, i }: { m: WcMatch; i: number }) {
  const saMatch = m.home === 'South Africa' || m.away === 'South Africa'
  const name = (t: string) => [flagOf(t), t].filter(Boolean).join(' ')
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 text-sm ${saMatch ? 'bg-emerald-500/10' : i % 2 ? 'bg-black/30' : 'bg-black/10'}`}>
      <div className="w-20 shrink-0 font-mono text-[11px] leading-tight text-amber-200/80">
        <p>{wcDateLabel(m.date)}</p>
        <p className="text-amber-300">
          {m.kickoffSA}
          {m.nextDaySA && <span className="text-amber-300/60" title="Early hours of the NEXT morning, SA time">⁺¹</span>}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${saMatch ? 'text-emerald-100' : 'text-amber-50'}`}>
          {name(m.home)} <span className="font-normal text-amber-200/40">vs</span> {name(m.away)}
        </p>
        <p className="truncate text-[11px] text-amber-200/50">
          {m.venue}, {m.city}{m.match === 1 ? ' · Tournament opening match' : ''}
        </p>
      </div>
    </div>
  )
}

// Header for the drill-down views: back button + title.
function WcSubHeader({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="no-print shrink-0 rounded-lg border border-amber-500/40 bg-black/30 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300 hover:text-amber-100"
      >
        ← Back
      </button>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-black uppercase tracking-[0.2em] text-amber-300">{title}</h4>
        {sub && <p className="truncate text-[11px] text-amber-200/50">{sub}</p>}
      </div>
    </div>
  )
}

const SA_TIME_NOTE = 'All kick-off times in SA time. ⁺¹ = early hours of the NEXT morning.'

type WcView =
  | { kind: 'home' }
  | { kind: 'group'; group: string }
  | { kind: 'round'; round: string }

function WorldCupTab() {
  const [view, setView] = useState<WcView>({ kind: 'home' })
  const rootRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  // Jump back to the top of the sheet whenever the view changes (the lists are long).
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    rootRef.current?.scrollIntoView({ block: 'start' })
  }, [view])

  /* ---------- Group detail: all 6 of one group's games ---------- */
  if (view.kind === 'group') {
    const g = WC_GROUPS.find((x) => x.group === view.group)!
    const gi = WC_GROUPS.indexOf(g)
    const prev = WC_GROUPS[(gi + WC_GROUPS.length - 1) % WC_GROUPS.length].group
    const next = WC_GROUPS[(gi + 1) % WC_GROUPS.length].group
    const isSa = g.group === WC_SA_GROUP
    return (
      <div ref={rootRef} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <WcSubHeader
            title={`Group ${g.group}${isSa ? ' · 🇿🇦' : ''}`}
            sub={SA_TIME_NOTE}
            onBack={() => setView({ kind: 'home' })}
          />
          <div className="no-print mb-3 flex shrink-0 gap-1.5">
            <button
              onClick={() => setView({ kind: 'group', group: prev })}
              className="rounded-lg border border-amber-500/30 bg-black/30 px-2 py-1.5 text-xs font-bold text-amber-200/80 transition-colors hover:border-amber-300 hover:text-amber-100"
            >
              ‹ {prev}
            </button>
            <button
              onClick={() => setView({ kind: 'group', group: next })}
              className="rounded-lg border border-amber-500/30 bg-black/30 px-2 py-1.5 text-xs font-bold text-amber-200/80 transition-colors hover:border-amber-300 hover:text-amber-100"
            >
              {next} ›
            </button>
          </div>
        </div>

        {/* The four teams */}
        <div className="flex flex-wrap gap-1.5">
          {g.teams.map((t) => (
            <span
              key={t.name}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                t.name === 'South Africa'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-amber-500/20 bg-black/30 text-amber-50/90'
              }`}
            >
              {t.flag} {t.name}{t.host && <span className="ml-1 text-[8px] text-amber-300/60">HOST</span>}
            </span>
          ))}
        </div>

        {/* All 6 group games, date order */}
        <div className="overflow-hidden rounded-xl border border-amber-500/20">
          {groupMatches(g.group).map((m, i) => <WcMatchRow key={m.match} m={m} i={i} />)}
        </div>
      </div>
    )
  }

  /* ---------- Knockout-round detail ---------- */
  if (view.kind === 'round') {
    const r = WC_KO_ROUNDS.find((x) => x.round === view.round)!
    const matches = roundMatches(r.round)
    return (
      <div ref={rootRef} className="space-y-4">
        <WcSubHeader
          title={r.round}
          sub={`${r.dateLabel} · ${SA_TIME_NOTE}`}
          onBack={() => setView({ kind: 'home' })}
        />
        <div className="overflow-hidden rounded-xl border border-amber-500/20">
          {matches.map((m, i) => <WcMatchRow key={m.match} m={m} i={i} />)}
        </div>
        <p className="text-center text-[10px] text-amber-200/40">
          Opponents fill in as the groups are decided — dates, venues and kick-offs are locked.
        </p>
      </div>
    )
  }

  /* ---------- Home: facts, Bafana, group grid, knockout rounds ---------- */
  return (
    <div ref={rootRef} className="space-y-5">
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

      {/* Bafana spotlight — real dates, venues and SA kick-off times */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
          🇿🇦 Bafana Bafana — Group {WC_SA_GROUP}
        </p>
        {WC_SA_MATCHES.map((m) => (
          <div key={m.match} className="flex items-baseline gap-2 py-0.5 text-sm">
            <span className="w-24 shrink-0 font-mono text-xs text-emerald-200/80">
              {wcDateLabel(m.date)} <span className="text-emerald-300">{m.kickoffSA}{m.nextDaySA ? '⁺¹' : ''}</span>
            </span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-50">{flagOf(m.home)} {m.home} vs {flagOf(m.away)} {m.away}</p>
              <p className="text-[11px] text-emerald-200/50">
                {m.venue}, {m.city}{m.match === 1 ? ' · Tournament opening match' : ''}
              </p>
            </div>
          </div>
        ))}
        <p className="mt-1.5 text-[10px] text-emerald-200/40">{SA_TIME_NOTE}</p>
      </div>

      {/* Groups — tap one for all its fixtures */}
      <div>
        <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
          The 12 Groups <span className="font-normal normal-case tracking-normal text-amber-200/40">— tap a group for its fixtures</span>
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WC_GROUPS.map((g) => {
            const isSa = g.group === WC_SA_GROUP
            return (
              <button
                key={g.group}
                onClick={() => setView({ kind: 'group', group: g.group })}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  isSa
                    ? 'border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-300'
                    : 'border-amber-500/15 bg-black/30 hover:border-amber-400/60'
                }`}
              >
                <p className={`mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${isSa ? 'text-emerald-300' : 'text-amber-300/70'}`}>
                  Group {g.group}
                  <span className={isSa ? 'text-emerald-300/60' : 'text-amber-300/40'}>›</span>
                </p>
                {g.teams.map((t) => (
                  <p key={t.name} className={`flex items-center gap-1.5 truncate text-xs ${t.name === 'South Africa' ? 'font-bold text-emerald-200' : 'text-amber-50/90'}`}>
                    <span className="leading-none">{t.flag}</span>{t.name}{t.host && <span className="text-[8px] text-amber-300/60">HOST</span>}
                  </p>
                ))}
              </button>
            )
          })}
        </div>
      </div>

      {/* Road to the final — tap a round for its matches */}
      <div>
        <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
          Road to the Final <span className="font-normal normal-case tracking-normal text-amber-200/40">— tap a round</span>
        </h4>
        <div className="overflow-hidden rounded-xl border border-amber-500/20">
          {WC_KO_ROUNDS.map((r, i) => {
            const isFinal = r.round === 'FINAL'
            const count = roundMatches(r.round).length
            return (
              <button
                key={r.round}
                onClick={() => setView({ kind: 'round', round: r.round })}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-500/10 ${isFinal ? 'bg-amber-500/15' : i % 2 ? 'bg-black/30' : 'bg-black/10'}`}
              >
                <span className="w-28 shrink-0 font-mono text-xs text-amber-200/80">{r.dateLabel}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-bold ${isFinal ? 'text-amber-200' : 'text-amber-50'}`}>
                    {r.round} <span className="font-normal text-amber-200/40">· {count} {count === 1 ? 'match' : 'matches'}</span>
                  </p>
                  <p className="truncate text-[11px] text-amber-200/50">{r.blurb}</p>
                </div>
                <span className="shrink-0 text-amber-300/40">›</span>
              </button>
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
      {/* Two action buttons — each opens the hub on its own tab (no auto-popup) */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => { setTab('boks'); setOpen(true) }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-b from-emerald-800/80 to-emerald-950/80 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-amber-200 shadow-[0_0_20px_rgba(245,200,80,0.2)] transition-all hover:border-amber-300 hover:text-amber-100"
        >
          <span className="text-base leading-none">🏉</span>
          <span>Bok Fixtures 2025/2026</span>
        </button>
        <button
          onClick={() => { setTab('world-cup'); setOpen(true) }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-b from-emerald-800/80 to-emerald-950/80 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-amber-200 shadow-[0_0_20px_rgba(245,200,80,0.2)] transition-all hover:border-amber-300 hover:text-amber-100"
        >
          <span className="text-base leading-none">⚽</span>
          <span>World Cup Soccer Fixtures</span>
        </button>
      </div>

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
