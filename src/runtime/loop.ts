import { MAX_TICKS_PER_FRAME, TICK_HZ } from '../engine'

/**
 * Fixed-timestep loop (ADR-0003).
 *
 * Real time goes into an accumulator; the engine is advanced in whole ticks. This is
 * not an optimisation -- if gravity followed frame delta, a player on a 144Hz screen
 * would be playing a different game from one on 60Hz, and every test would still
 * pass because tests have no screen (invariant #2).
 */

export const STEP_MS = 1000 / TICK_HZ

/**
 * Slack for the accumulator comparison. `STEP_MS` is not representable exactly, and
 * a timestamp in the tens of thousands of milliseconds loses enough precision that
 * a frame lasting EXACTLY one step can measure a hair under it. Without this the
 * loop silently drops that tick, and the game runs slower than real time by an
 * amount nobody can see.
 */
const EPS = 1e-9

export interface LoopDeps {
  now(): number
  requestFrame(cb: (t: number) => void): number
  cancelFrame(id: number): void
  /** Tab hidden? A hidden tab must not keep dropping pieces (NFR-REL-01). */
  isHidden(): boolean
}

export interface LoopHandlers {
  /** Advance the game by exactly one tick. */
  tick(): void
  /**
   * Draw once per animation frame, after the ticks.
   *
   * `alpha` is how far the clock has moved toward the NEXT tick, 0..1 -- the
   * renderer interpolates with it so motion is smooth while the engine still
   * advances only in whole ticks (invariant #2). `dtMs` is real elapsed time, for
   * effect timers that are measured in milliseconds rather than ticks.
   */
  draw(alpha: number, dtMs: number): void
  /** Called when the loop pauses itself because the tab went away. */
  onAutoPause?(): void
}

export const browserDeps: LoopDeps = {
  now: () => performance.now(),
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
  isHidden: () => typeof document !== 'undefined' && document.hidden,
}

export interface Loop {
  start(): void
  stop(): void
  /** Runs one frame at `timestamp`. Returns how many ticks were consumed. */
  frame(timestamp: number): number
  readonly running: boolean
}

export function createLoop(handlers: LoopHandlers, deps: LoopDeps = browserDeps): Loop {
  let acc = 0
  let last = 0
  let raf = 0
  let running = false
  let wasHidden = false

  function frame(timestamp: number): number {
    const hidden = deps.isHidden()
    if (hidden) {
      // Swallow the elapsed time instead of banking it: coming back to a tab must
      // not replay the minutes it was away.
      last = timestamp
      acc = 0
      if (!wasHidden) {
        wasHidden = true
        handlers.onAutoPause?.()
      }
      return 0
    }
    if (wasHidden) {
      wasHidden = false
      last = timestamp
      return 0
    }

    const dt = timestamp - last
    last = timestamp
    // A backwards clock contributes nothing. A long stall is NOT clamped here --
    // the tick cap below is the single limiter, which keeps the cap exact instead
    // of leaving it one float-rounding short.
    acc += dt > 0 ? dt : 0

    let ran = 0
    while (acc + EPS >= STEP_MS && ran < MAX_TICKS_PER_FRAME) {
      handlers.tick()
      acc -= STEP_MS
      ran++
    }
    // Anything still banked after the cap is dropped, so a stalled tab resumes
    // instead of fast-forwarding through a death the player never saw (NFR-REL-04).
    if (acc + EPS >= STEP_MS) acc = 0

    // Whatever is left in the accumulator IS the sub-tick position.
    const alpha = Math.min(1, Math.max(0, acc / STEP_MS))
    handlers.draw(alpha, dt > 0 ? dt : 0)
    return ran
  }

  function loop(timestamp: number): void {
    if (!running) return
    frame(timestamp)
    raf = deps.requestFrame(loop)
  }

  return {
    start() {
      if (running) return
      running = true
      last = deps.now()
      acc = 0
      raf = deps.requestFrame(loop)
    },
    stop() {
      if (!running) return
      running = false
      deps.cancelFrame(raf)
    },
    frame,
    get running() {
      return running
    },
  }
}
