import { useEffect, useRef } from 'react'

export function useGameLoop(update, running) {
  const cb = useRef(update)
  cb.current = update
  useEffect(() => {
    if (!running) return
    let id
    let last = performance.now()
    const tick = (t) => {
      cb.current(Math.min((t - last) / 1000, 0.05))
      last = t
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running])
}
