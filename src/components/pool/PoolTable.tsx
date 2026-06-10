import { useEffect, useRef, useState } from 'react'
import {
  TABLE, BALL_R, POCKET_R, POCKETS, CUE_START,
  createRack, advance, anyMoving, shoot, dist,
  type Ball,
} from './physics'

const RAIL = 30
const POWER_MAX = 360 // px of drag for full power

type Mode = 'ai' | 'practice'
type Phase = 'idle' | 'rolling' | 'over'
type Group = 'solids' | 'stripes' | null

interface Aim { active: boolean; angle: number; power: number; px: number; py: number }

export default function PoolTable() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>(createRack())
  const aimRef = useRef<Aim>({ active: false, angle: 0, power: 0, px: 0, py: 0 })
  const pottedRef = useRef<Ball[]>([])
  const scratchRef = useRef(false)
  const phaseRef = useRef<Phase>('idle')
  const turnRef = useRef<'you' | 'ai'>('you')
  const groupsRef = useRef<{ you: Group; ai: Group }>({ you: null, ai: null })
  const modeRef = useRef<Mode>('ai')
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastT = useRef(0)

  const [mode, setMode] = useState<Mode>('ai')
  const [phase, setPhase] = useState<Phase>('idle')
  const [turn, setTurn] = useState<'you' | 'ai'>('you')
  const [scores, setScores] = useState({ you: 0, ai: 0 })
  const [groups, setGroups] = useState<{ you: Group; ai: Group }>({ you: null, ai: null })
  const [message, setMessage] = useState('Drag from the cue ball to aim — release to break.')

  useEffect(() => { modeRef.current = mode }, [mode])

  // A cheeky baboon perches on the felt at the START of a rack. The instant the
  // first shot is fired he bolts off — and he STAYS gone for the rest of the game,
  // only ambling back when the rack is reset (newGame). A beginning-only guest.
  const [monkey, setMonkey] = useState<'sit' | 'flee' | 'hidden'>('sit')
  const [gameStarted, setGameStarted] = useState(false)
  useEffect(() => {
    if (phase === 'rolling') {
      setMonkey('flee')
      const t = setTimeout(() => setMonkey('hidden'), 650)
      return () => clearTimeout(t)
    }
    // Game underway (a shot has been taken) → he stays hidden until the reset.
    if (gameStarted) { setMonkey('hidden'); return }
    // Fresh, untouched rack → he sits on the felt.
    const t = setTimeout(() => setMonkey('sit'), 300)
    return () => clearTimeout(t)
  }, [phase, gameStarted])

  function newGame(nextMode: Mode = mode) {
    if (aiTimer.current) clearTimeout(aiTimer.current)
    ballsRef.current = createRack()
    pottedRef.current = []
    scratchRef.current = false
    setGameStarted(false)   // fresh rack — the baboon ambles back
    phaseRef.current = 'idle'; setPhase('idle')
    turnRef.current = 'you'; setTurn('you')
    groupsRef.current = { you: null, ai: null }; setGroups({ you: null, ai: null })
    setScores({ you: 0, ai: 0 })
    setMessage(nextMode === 'practice' ? 'Practice — pot as many as you can.' : 'Your break. Drag from the cue ball and release.')
  }

  function respawnCue() {
    const cue = ballsRef.current.find((b) => b.id === 0)!
    let x = CUE_START.x
    // nudge left until clear of other balls
    while (ballsRef.current.some((b) => b.id !== 0 && !b.potted && dist(x, CUE_START.y, b.x, b.y) < BALL_R * 2.2) && x > BALL_R * 2) {
      x -= BALL_R
    }
    cue.x = x; cue.y = CUE_START.y; cue.vx = 0; cue.vy = 0; cue.potted = false
  }

  function resolveShot() {
    const potted = pottedRef.current
    const scratch = scratchRef.current
    const objectPotted = potted.filter((b) => b.id !== 0).length
    pottedRef.current = []
    scratchRef.current = false

    if (scratch) respawnCue()

    const scorer = turnRef.current
    if (!scratch && objectPotted > 0) {
      setScores((s) => ({ ...s, [scorer]: s[scorer] + objectPotted }))
    }

    // Assign solids/stripes on the first object ball legally potted (open table).
    let announce = ''
    if (modeRef.current === 'ai' && !scratch && groupsRef.current.you === null) {
      const firstObj = potted.find((b) => b.id !== 0 && b.number !== 8)
      if (firstObj) {
        const sg: Group = firstObj.striped ? 'stripes' : 'solids'
        const og: Group = firstObj.striped ? 'solids' : 'stripes'
        const ng = scorer === 'you' ? { you: sg, ai: og } : { you: og, ai: sg }
        groupsRef.current = ng; setGroups(ng)
        announce = `You're ${ng.you}.`
      }
    }

    const remaining = ballsRef.current.filter((b) => b.id !== 0 && !b.potted).length
    if (remaining === 0) {
      phaseRef.current = 'over'; setPhase('over')
      setScores((s) => {
        const finalYou = s.you + (!scratch && scorer === 'you' ? objectPotted : 0)
        const finalAi = s.ai + (!scratch && scorer === 'ai' ? objectPotted : 0)
        setMessage(
          modeRef.current === 'practice'
            ? `Table cleared — ${finalYou} potted. 🎉`
            : finalYou === finalAi ? "Dead heat!"
            : finalYou > finalAi ? 'You win the rack! 🏆' : 'The house takes it. 🤖',
        )
        return s
      })
      return
    }

    if (modeRef.current === 'practice') {
      phaseRef.current = 'idle'; setPhase('idle')
      if (scratch) setMessage('Scratch — cue ball respotted.')
      else if (objectPotted > 0) setMessage(`Potted ${objectPotted}. Keep going.`)
      else setMessage('Line up your next shot.')
      return
    }

    // vs AI — keep turn if you potted without scratching, else swap
    const keepTurn = !scratch && objectPotted > 0
    const next = keepTurn ? scorer : (scorer === 'you' ? 'ai' : 'you')
    turnRef.current = next; setTurn(next)
    phaseRef.current = 'idle'; setPhase('idle')
    let msg: string
    if (scratch) msg = next === 'you' ? 'Scratch! Your shot.' : 'Scratch — house to shoot.'
    else if (keepTurn) msg = scorer === 'you' ? `Nice — ${objectPotted} down. Again!` : 'House pots and continues…'
    else msg = next === 'you' ? 'Your shot.' : 'House lining up…'
    setMessage(announce ? `${announce} ${msg}` : msg)

    if (next === 'ai') aiTimer.current = setTimeout(aiShoot, 900)
  }

  function aiShoot() {
    if (phaseRef.current !== 'idle' || turnRef.current !== 'ai') return
    const balls = ballsRef.current
    const cue = balls.find((b) => b.id === 0)!
    const targets = balls.filter((b) => b.id !== 0 && !b.potted)

    let best: { angle: number; power: number; rank: number } | null = null
    for (const t of targets) {
      for (const p of POCKETS) {
        const pdx = p.x - t.x, pdy = p.y - t.y
        const pd = Math.hypot(pdx, pdy) || 1
        const ux = pdx / pd, uy = pdy / pd
        const ghostX = t.x - ux * BALL_R * 2
        const ghostY = t.y - uy * BALL_R * 2
        const cgx = ghostX - cue.x, cgy = ghostY - cue.y
        const cg = Math.hypot(cgx, cgy) || 1
        const cut = (cgx / cg) * ux + (cgy / cg) * uy  // 1 = dead straight
        if (cut <= 0.2) continue
        const rank = cut * 2 - (cg + pd) / 1100
        if (!best || rank > best.rank) {
          const err = (1 - cut) * 0.06 + (Math.random() - 0.5) * 0.05
          best = {
            angle: Math.atan2(cgy, cgx) + err,
            power: Math.min(0.95, 0.34 + (cg + pd) / 1700),
            rank,
          }
        }
      }
    }
    if (!best) best = { angle: Math.random() * Math.PI * 2, power: 0.5, rank: 0 }

    shoot(cue, best.angle, best.power)
    phaseRef.current = 'rolling'; setPhase('rolling')
    setGameStarted(true)
  }

  // pointer → logical table coords
  function toLogical(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * sx - RAIL,
      y: (e.clientY - rect.top) * sy - RAIL,
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'idle' || turnRef.current !== 'you') return
    const { x, y } = toLogical(e)
    const cue = ballsRef.current.find((b) => b.id === 0)!
    // must grab near the cue ball
    if (dist(x, y, cue.x, cue.y) > BALL_R * 6) return
    aimRef.current = { active: true, angle: 0, power: 0, px: x, py: y }
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!aimRef.current.active) return
    const { x, y } = toLogical(e)
    const cue = ballsRef.current.find((b) => b.id === 0)!
    const dx = x - cue.x, dy = y - cue.y
    // Slingshot feel: drag BACKWARDS to fire FORWARDS — the shot launches
    // opposite to the pull, away from where you drag.
    aimRef.current.angle = Math.atan2(-dy, -dx)
    aimRef.current.power = Math.min(1, Math.hypot(dx, dy) / POWER_MAX)
    aimRef.current.px = x; aimRef.current.py = y
  }

  function onPointerUp() {
    const aim = aimRef.current
    if (!aim.active) return
    aim.active = false
    if (aim.power < 0.04 || phaseRef.current !== 'idle' || turnRef.current !== 'you') return
    const cue = ballsRef.current.find((b) => b.id === 0)!
    shoot(cue, aim.angle, aim.power)
    phaseRef.current = 'rolling'; setPhase('rolling')
    setGameStarted(true)   // rack is in play — baboon stays gone until reset
  }

  // render + simulation loop
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const loop = (t: number) => {
      const dt = lastT.current ? Math.min(0.04, (t - lastT.current) / 1000) : 0
      lastT.current = t

      if (phaseRef.current === 'rolling') {
        const r = advance(ballsRef.current, dt)
        if (r.potted.length) pottedRef.current.push(...r.potted)
        if (r.scratch) scratchRef.current = true
        if (!anyMoving(ballsRef.current)) resolveShot()
      }

      draw(ctx, ballsRef.current, aimRef.current, turnRef.current, phaseRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); if (aiTimer.current) clearTimeout(aiTimer.current) }
  }, [])

  const yourTurn = turn === 'you' && phase === 'idle'

  return (
    <div className="w-full">
      {/* Scoreboard */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMode('ai'); newGame('ai') }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${mode === 'ai' ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-white/15 text-slate-400 hover:text-slate-200'}`}
          >🤖 Play the house</button>
          <button
            onClick={() => { setMode('practice'); newGame('practice') }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${mode === 'practice' ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-white/15 text-slate-400 hover:text-slate-200'}`}
          >🎯 Practice</button>
        </div>
        <button onClick={() => newGame()} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 transition-colors">
          ↻ Rack
        </button>
      </div>

      {mode === 'ai' && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className={`rounded-xl border px-3 py-2 ${turn === 'you' ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10'}`}>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">You</p>
            <GroupBadge g={groups.you} />
            <p className="text-xl font-black text-amber-300">{scores.you}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 ${turn === 'ai' ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10'}`}>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">House 🤖</p>
            <GroupBadge g={groups.ai} />
            <p className="text-xl font-black text-amber-300">{scores.ai}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={TABLE.W + RAIL * 2}
          height={TABLE.H + RAIL * 2}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="w-full rounded-2xl shadow-2xl shadow-black/60"
          style={{ touchAction: 'none', cursor: yourTurn ? 'crosshair' : 'default' }}
        />
        {/* the resident baboon — perched on the top-left corner, bolts the instant a shot is taken */}
        <img src="/baboon-pool.png" alt="" aria-hidden className={`baboon ${monkey}`} style={{ left: '1.5%', top: '-3%' }} />
      </div>

      <p className="mt-3 text-center text-sm text-amber-100/80">
        {phase === 'rolling' ? '…' : message}
      </p>
    </div>
  )
}

// Small badge under each player showing their assigned suit (solids/stripes/open).
function GroupBadge({ g }: { g: Group }) {
  if (!g) return <p className="text-[10px] font-bold tracking-wide text-slate-500">Open</p>
  const solid = g === 'solids'
  return (
    <p className="flex items-center justify-center gap-1 text-[10px] font-bold tracking-wide">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={solid
          ? { background: '#fcd34d' }
          : { background: 'repeating-linear-gradient(90deg,#fcd34d 0 2px,#0b1220 2px 4px)', boxShadow: 'inset 0 0 0 1px #fcd34d' }}
      />
      <span className={solid ? 'text-amber-300' : 'text-sky-300'}>{solid ? 'Solids' : 'Stripes'}</span>
    </p>
  )
}

// ---------- rendering ----------
function draw(ctx: CanvasRenderingContext2D, balls: Ball[], aim: Aim, turn: 'you' | 'ai', phase: Phase) {
  const W = ctx.canvas.width, H = ctx.canvas.height
  ctx.clearRect(0, 0, W, H)

  // ── Polished hardwood rail ──────────────────────────────────────────────
  ctx.fillStyle = '#241309'
  roundRect(ctx, 0, 0, W, H, 22); ctx.fill()
  const woodGrad = ctx.createLinearGradient(0, 0, 0, H)
  woodGrad.addColorStop(0,   '#7a4d24')
  woodGrad.addColorStop(0.5, '#5a3318')
  woodGrad.addColorStop(1,   '#3c220f')
  ctx.fillStyle = woodGrad
  roundRect(ctx, 6, 6, W - 12, H - 12, 18); ctx.fill()
  // wood grain — gentle wavering darker lines following the rail
  ctx.save()
  roundRect(ctx, 6, 6, W - 12, H - 12, 18); ctx.clip()
  ctx.lineWidth = 1
  for (let i = 0; i < 22; i++) {
    const gy = 10 + i * (H / 22)
    ctx.strokeStyle = `rgba(0,0,0,${0.06 + (i % 3) * 0.03})`
    ctx.beginPath()
    for (let gx = 0; gx <= W; gx += 24) ctx.lineTo(gx, gy + Math.sin((gx + i * 40) * 0.012) * 3)
    ctx.stroke()
  }
  ctx.restore()
  // inner bevel highlight + shadow framing the felt
  ctx.strokeStyle = 'rgba(255,210,150,0.18)'; ctx.lineWidth = 2
  roundRect(ctx, RAIL - 4, RAIL - 4, TABLE.W + 8, TABLE.H + 8, 10); ctx.stroke()

  ctx.save()
  ctx.translate(RAIL, RAIL)

  // ── Real felt: napped cloth with a soft overhead spotlight + edge falloff ──
  ctx.fillStyle = '#0a5e38'
  ctx.fillRect(0, 0, TABLE.W, TABLE.H)
  const spot = ctx.createRadialGradient(TABLE.W / 2, TABLE.H * 0.42, 30, TABLE.W / 2, TABLE.H / 2, TABLE.W * 0.62)
  spot.addColorStop(0, '#13834f')
  spot.addColorStop(1, '#063a25')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, TABLE.W, TABLE.H)
  // faint nap streaks for cloth texture
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1
  for (let y = 4; y < TABLE.H; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TABLE.W, y); ctx.stroke() }
  // inner shadow at the cushions
  const vig = ctx.createLinearGradient(0, 0, 0, 40)
  vig.addColorStop(0, 'rgba(0,0,0,0.35)'); vig.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = vig; ctx.fillRect(0, 0, TABLE.W, 40)

  // pockets
  ctx.fillStyle = '#050505'
  for (const p of POCKETS) {
    ctx.beginPath()
    ctx.arc(p.x, Math.max(0, Math.min(TABLE.H, p.y)), POCKET_R, 0, Math.PI * 2)
    ctx.fill()
  }

  // aim guide — pulled-back cue stick (the slingshot) + forward trajectory
  // prediction showing the cue's path, the ghost ball at contact, and where
  // the struck ball will head.
  const cue = balls.find((b) => b.id === 0)!
  if (aim.active && !cue.potted) {
    const ux = Math.cos(aim.angle), uy = Math.sin(aim.angle)
    const pred = predictShot(balls, cue.x, cue.y, ux, uy)
    const endX = pred.hit ? pred.hit.gx : cue.x + ux * pred.dist
    const endY = pred.hit ? pred.hit.gy : cue.y + uy * pred.dist

    // cue-ball path
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([7, 6])
    ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(endX, endY); ctx.stroke()
    ctx.setLineDash([])

    if (pred.hit) {
      // ghost ball at the contact point
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(pred.hit.gx, pred.hit.gy, BALL_R, 0, Math.PI * 2); ctx.stroke()
      // the struck ball's resulting direction (the line through both centres)
      const exLen = 130
      ctx.strokeStyle = 'rgba(255,209,102,0.9)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(pred.hit.ball.x, pred.hit.ball.y)
      ctx.lineTo(pred.hit.ball.x + pred.hit.ex * exLen, pred.hit.ball.y + pred.hit.ey * exLen)
      ctx.stroke()
    }

    // the pulled-back cue stick, behind the ball — length grows with power
    const pull = 26 + aim.power * 150
    const sx = cue.x - ux * (BALL_R + 6), sy = cue.y - uy * (BALL_R + 6)
    const tx = cue.x - ux * (BALL_R + 6 + pull), ty = cue.y - uy * (BALL_R + 6 + pull)
    const stick = ctx.createLinearGradient(sx, sy, tx, ty)
    stick.addColorStop(0, '#d8b15a'); stick.addColorStop(1, '#5e4419')
    ctx.strokeStyle = stick
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()
    ctx.lineCap = 'butt'
    // power pip on the stick tip (green = soft, red = full power)
    ctx.fillStyle = `hsl(${(1 - aim.power) * 90}, 90%, 55%)`
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill()
  }

  // balls — rendered as glossy ivory spheres: contact shadow, spherical
  // shading, a number band, and a sharp specular highlight.
  for (const b of balls) {
    if (b.potted) continue
    const isCue = b.number === 0
    const lx = b.x - BALL_R * 0.34, ly = b.y - BALL_R * 0.4   // light from top-left

    // contact shadow cast on the felt
    ctx.fillStyle = 'rgba(0,0,0,0.32)'
    ctx.beginPath(); ctx.ellipse(b.x + 2.5, b.y + BALL_R * 0.6, BALL_R * 0.96, BALL_R * 0.4, 0, 0, Math.PI * 2); ctx.fill()

    // base colour, clipped to the sphere (ivory whites, not pure white)
    ctx.save()
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = isCue ? '#fbf6ea' : (b.striped ? '#f4eedd' : b.color)
    ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2)
    if (b.striped) {
      ctx.fillStyle = b.color
      ctx.fillRect(b.x - BALL_R, b.y - BALL_R * 0.52, BALL_R * 2, BALL_R * 1.04)
    }
    // spherical shading — darkens toward the lower-right rim
    const shade = ctx.createRadialGradient(lx, ly, BALL_R * 0.1, b.x, b.y, BALL_R * 1.25)
    shade.addColorStop(0, 'rgba(255,255,255,0.10)')
    shade.addColorStop(0.5, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = shade
    ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2)
    ctx.restore()

    // numbered ivory disc
    if (b.number > 0) {
      ctx.fillStyle = '#f7f3e6'
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R * 0.52, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#15110b'
      ctx.font = `bold ${BALL_R * 0.64}px Georgia, "Times New Roman", serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(b.number), b.x, b.y + 0.5)
    }

    // glossy specular highlight (soft halo + hot dot), clipped to the sphere
    ctx.save()
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.clip()
    const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, BALL_R * 0.75)
    spec.addColorStop(0, 'rgba(255,255,255,0.85)')
    spec.addColorStop(0.3, 'rgba(255,255,255,0.28)')
    spec.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = spec
    ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath(); ctx.arc(lx, ly, BALL_R * 0.12, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // rim
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.restore()

  // dim overlay on the house's turn
  if (turn === 'ai' && phase !== 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    roundRect(ctx, 8, 8, W - 16, H - 16, 16); ctx.fill()
  }
}

// Predict the cue ball's path: the nearest object ball it would strike along
// the aim ray. Returns the ghost-ball contact point + the struck ball's exit
// direction (the line through both centres at contact), or just the distance to
// the cushion if it hits nothing.
function predictShot(
  balls: Ball[], cx: number, cy: number, ux: number, uy: number,
): { dist: number; hit: { ball: Ball; gx: number; gy: number; ex: number; ey: number } | null } {
  const R2 = BALL_R * 2
  let best: { ball: Ball; gx: number; gy: number; ex: number; ey: number } | null = null
  let bestT = Infinity
  for (const b of balls) {
    if (b.potted || b.id === 0) continue
    const fx = b.x - cx, fy = b.y - cy
    const tc = fx * ux + fy * uy                 // distance to closest approach
    if (tc <= 0) continue                         // ball sits behind the aim
    const perp = Math.hypot(b.x - (cx + ux * tc), b.y - (cy + uy * tc))
    if (perp > R2) continue                       // ray misses this ball
    const t = tc - Math.sqrt(R2 * R2 - perp * perp)  // distance to contact
    if (t > 0 && t < bestT) {
      bestT = t
      const gx = cx + ux * t, gy = cy + uy * t    // cue centre at contact (ghost)
      const od = Math.hypot(b.x - gx, b.y - gy) || 1
      best = { ball: b, gx, gy, ex: (b.x - gx) / od, ey: (b.y - gy) / od }
    }
  }
  // hit nothing → run the line to the cushion
  let railT = Infinity
  if (ux > 0) railT = Math.min(railT, (TABLE.W - BALL_R - cx) / ux)
  else if (ux < 0) railT = Math.min(railT, (BALL_R - cx) / ux)
  if (uy > 0) railT = Math.min(railT, (TABLE.H - BALL_R - cy) / uy)
  else if (uy < 0) railT = Math.min(railT, (BALL_R - cy) / uy)
  return { dist: best ? bestT : Math.max(0, railT), hit: best }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
