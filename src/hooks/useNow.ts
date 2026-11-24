import { useEffect, useState } from 'react'

/** Eén gedeelde tik voor de hele app, zodat we niet tien timers draaien. */
const listeners = new Set<(now: Date) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function start() {
  if (timer !== null) return
  timer = setInterval(() => {
    const now = new Date()
    for (const listener of listeners) listener(now)
  }, 1000)
}

function stop() {
  if (timer !== null && listeners.size === 0) {
    clearInterval(timer)
    timer = null
  }
}

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    listeners.add(setNow)
    start()
    return () => {
      listeners.delete(setNow)
      stop()
    }
  }, [])

  return now
}
