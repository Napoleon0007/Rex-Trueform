import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiProps {
  trigger: boolean
}

export default function Confetti({ trigger }: ConfettiProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!trigger || fired.current) return
    fired.current = true

    const end = Date.now() + 3500
    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff', '#10b981', '#34d399']

    const frame = () => {
      confetti({ particleCount: 3, angle: 60,  spread: 65, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    // Burst on entry
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors })
    setTimeout(frame, 400)
  }, [trigger])

  return null
}
