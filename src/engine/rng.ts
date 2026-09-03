/**
 * mulberry32 -- a seeded PRNG.
 *
 * The engine must never call `Math.random()` (invariant #1): a game has to be
 * reproducible from `{seed, commands}` alone, which is what makes replays work
 * (FR-18) and what keeps server-side score validation possible later (ADR-0002).
 *
 * State is a plain uint32 carried in `GameState`, so the whole PRNG is part of the
 * serialisable game state rather than a closure the state cannot describe.
 */

/** Advances the state and returns the next state plus a float in [0, 1). */
export function next(state: number): { state: number; value: number } {
  let s = (state + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { state: s, value }
}

/** Integer in [0, bound). `bound` must be >= 1. */
export function nextInt(state: number, bound: number): { state: number; value: number } {
  const r = next(state)
  return { state: r.state, value: Math.floor(r.value * bound) }
}

/**
 * Fisher-Yates, driven by the seeded PRNG. Shuffles in place and returns the new
 * PRNG state -- no allocation, because this runs once per bag on the hot path.
 */
export function shuffle<T>(items: T[], state: number): number {
  let s = state
  for (let i = items.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1)
    s = r.state
    const j = r.value
    const a = items[i] as T
    const b = items[j] as T
    items[i] = b
    items[j] = a
  }
  return s
}
