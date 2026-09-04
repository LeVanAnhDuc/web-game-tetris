import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts toward its new value instead of jumping to it.
 *
 * This is HUD, not playfield: it lives in React and runs its own short
 * `requestAnimationFrame`, well away from the game loop's frame budget
 * (NFR-PERF-01). A score that snaps from 1,200 to 2,000 tells you nothing about
 * what just happened; one that runs up tells you it was big.
 *
 * Under `prefers-reduced-motion` it snaps, like everything else (NFR-A11Y-05).
 */

const DURATION_MS = 260

function prefersReduced(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    if (prefersReduced()) {
      fromRef.current = value
      setShown(value)
      return
    }
    const from = fromRef.current
    if (from === value) return
    const start = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      // easeOutCubic: fast at first, so a big jump reads as big immediately.
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (value - from) * eased)
      setShown(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = value
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return shown
}

/** Fires once whenever `value` changes, for a one-shot CSS highlight. */
export function useBumpKey(value: number): number {
  const [key, setKey] = useState(0)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setKey((k) => k + 1)
    }
  }, [value])
  return key
}
