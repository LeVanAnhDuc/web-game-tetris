import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts toward its new value instead of jumping to it.
 *
 * It writes into its own text node from `requestAnimationFrame` and NEVER calls
 * `setState` while animating. Invariant #3 says React must not be what runs at frame
 * rate; the first version of this re-rendered the whole play screen sixty times a
 * second for 260ms after every score change, and soft drop scores on every cell, so
 * that was very nearly continuous -- competing for the same 8ms the game loop needs
 * (NFR-PERF-01).
 *
 * Under `prefers-reduced-motion` it simply shows the value (NFR-A11Y-05).
 */

const DURATION_MS = 260

function prefersReduced(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number
  format: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const shownRef = useRef(value)
  const rafRef = useRef(0)
  const formatRef = useRef(format)
  formatRef.current = format

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReduced()) {
      shownRef.current = value
      el.textContent = formatRef.current(value)
      return
    }

    // Start from what is on screen right now, not from where the last animation
    // began: the HUD publishes every ~100ms while this runs for 260ms, so an
    // interrupted count-up used to visibly drop back to its old origin.
    const from = shownRef.current
    if (from === value) {
      el.textContent = formatRef.current(value)
      return
    }
    const start = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      // easeOutCubic: fast at first, so a big jump reads as big immediately.
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (value - from) * eased)
      shownRef.current = next
      el.textContent = formatRef.current(next)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  // Rendered once with the initial value; every later change goes through the text
  // node above, so React does no work per frame.
  return (
    <span ref={ref} className={className}>
      {format(shownRef.current)}
    </span>
  )
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
