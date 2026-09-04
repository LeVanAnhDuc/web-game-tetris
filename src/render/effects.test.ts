// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CONFIG,
  ROWS,
  TICK_HZ,
  cellAt,
  createGame,
  dropDistance,
  drainEvents,
  reduce,
  type GameEvent,
} from '../engine'
import { clearPhase, createEffects, lerp, type ClearPhase } from './effects'
import type { Command, GameState } from '../engine'

const out = (): ClearPhase => ({ active: false, flash: 0, collapse: 0 })

/**
 * One tick, in the SAME order the app runs it: snapshot, step, fold events in.
 *
 * Tests that skipped `beforeTick` are how the lock flash and the hard-drop trail
 * both shipped pointing at the wrong piece while staying green -- `reduce` spawns
 * the next piece inside the same call, so anything read afterwards is the new one.
 */
function step(fx: ReturnType<typeof createEffects>, s: GameState, cmds: Command[] = []): void {
  fx.beforeTick(s)
  reduce(s, cmds)
  fx.onTick(s, drainEvents(s))
}


const TICK_MS = 1000 / TICK_HZ

/** Installs a matchMedia whose `matches` this test controls. */
function stubMotion(reduced: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = []
  const mq = {
    matches: reduced,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', () => mq)
  return {
    change(next: boolean) {
      mq.matches = next
      for (const fn of listeners) fn({ matches: next } as MediaQueryListEvent)
    },
    removeSpy: mq.removeEventListener,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lerp', () => {
  it('returns the ends exactly and the middle in between', () => {
    expect(lerp(4, 8, 0)).toBe(4)
    expect(lerp(4, 8, 1)).toBe(8)
    expect(lerp(4, 8, 0.5)).toBe(6)
  })

  it('works downward too', () => {
    expect(lerp(8, 4, 0.25)).toBe(7)
  })
})

describe('effects: interpolating the piece', () => {
  beforeEach(() => stubMotion(false))

  it('snaps on the very first tick, with nothing to interpolate from', () => {
    const s = createGame(1)
    const fx = createEffects()
    step(fx, s)
    expect(fx.pieceRow(s, 0.5)).toBeGreaterThanOrEqual(s.active!.row)
  })

  it('moves the piece BETWEEN row changes, not only when the row changes', () => {
    // The bug this exists to catch: interpolating whole rows tick-to-tick does
    // almost nothing, because at level 1 the row changes once every 60 ticks. 59
    // frames out of 60 would sit perfectly still and the 60th would jump a whole
    // cell -- exactly the jerk the feature is meant to remove. The sub-cell part
    // comes from the engine's own gravity accumulator.
    const s = createGame(1)
    const fx = createEffects()
    step(fx, s)
    const startRow = s.active!.row
    const seen: number[] = []
    for (let i = 0; i < 30; i++) {
      step(fx, s)
      seen.push(fx.pieceRow(s, 1))
    }
    // The row itself has not changed yet...
    expect(s.active!.row).toBe(startRow)
    // ...but the drawn position has, on almost every one of those frames.
    expect(new Set(seen).size).toBeGreaterThan(20)
    expect(seen[seen.length - 1]).toBeGreaterThan(seen[0] as number)
  })

  it('never lets the piece drift backwards when the row ticks over', () => {
    const s = createGame(1)
    const fx = createEffects()
    step(fx, s)
    let last = fx.pieceRow(s, 1)
    for (let i = 0; i < TICK_HZ * 3; i++) {
      step(fx, s)
      if (s.phase !== 'playing' || !s.active) break
      const now = fx.pieceRow(s, 0.5)
      expect(now).toBeGreaterThanOrEqual(last - 1e-9)
      last = now
    }
  })

  it('pins the piece to its row once it is resting on something', () => {
    const s = createGame(1)
    const fx = createEffects()
    step(fx, s, [{ k: 'press', a: 'softDrop' }])
    for (let i = 0; i < 400; i++) {
      step(fx, s)
      if (s.onGround) break
    }
    if (s.onGround && s.active) {
      expect(fx.visualRow(s)).toBe(s.active.row)
    }
  })

  it('does not fly a new piece in from where the old one died', () => {
    const s = createGame(2)
    const fx = createEffects()
    step(fx, s)
    // Hard drop: the piece locks at the floor and the next one spawns at the top.
    step(fx, s, [{ k: 'press', a: 'hardDrop' }])
    const spawned = s.active!.row
    // The new piece is drawn AT its spawn -- within the sub-cell that gravity has
    // already accumulated this same tick -- and nowhere near the floor the previous
    // piece just locked into. Interpolating across the identity change would draw it
    // somewhere in between, which is the bug.
    for (const alpha of [0, 0.5, 1]) {
      const drawn = fx.pieceRow(s, alpha)
      expect(drawn).toBeGreaterThanOrEqual(spawned)
      expect(drawn).toBeLessThan(spawned + 1)
    }
  })

  it('travels sideways over a short tween rather than in one tick', () => {
    const s = createGame(3)
    const fx = createEffects()
    step(fx, s)
    const from = s.active!.col
    step(fx, s, [{ k: 'press', a: 'left' }])
    expect(s.active!.col).toBe(from - 1)

    // Right after the step it is still near where it came from...
    expect(fx.pieceCol(s, 1)).toBeCloseTo(from, 6)
    // ...part way through it is in between...
    fx.advance(20)
    const mid = fx.pieceCol(s, 1)
    expect(mid).toBeLessThan(from)
    expect(mid).toBeGreaterThan(from - 1)
    // ...and it arrives.
    fx.advance(200)
    expect(fx.pieceCol(s, 1)).toBe(from - 1)
  })

  it('returns 0 rather than throwing when there is no piece', () => {
    const s = createGame(4)
    s.active = null
    const fx = createEffects()
    expect(fx.pieceRow(s, 0.5)).toBe(0)
    expect(fx.pieceCol(s, 0.5)).toBe(0)
  })
})

describe('effects: timers', () => {
  beforeEach(() => stubMotion(false))

  it('flashes the cells that actually locked, not the piece that replaced them', () => {
    const s = createGame(5)
    const fx = createEffects()
    step(fx, s)
    // Remember where the piece will come to rest before the drop happens.
    const before = s.active!
    const landRow = before.row + dropDistance(s.board, before)
    step(fx, s, [{ k: 'press', a: 'hardDrop' }])

    expect(fx.flash()).toBeGreaterThan(0)
    expect(fx.flashCount()).toBe(4)
    // Every flashed cell is on the board, at the landing rows -- not up at the
    // spawn rows where the NEXT piece now sits.
    const rows = fx.flashCells.slice(0, fx.flashCount()).map((c) => c.row)
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(landRow)
    expect(Math.max(...rows)).toBeLessThan(ROWS)
    for (const c of fx.flashCells.slice(0, fx.flashCount())) {
      expect(cellAt(s, c.row, c.col)).toBeGreaterThan(0)
    }
  })

  it('leaves the trail where the drop STARTED, inside the visible field', () => {
    const s = createGame(6)
    const fx = createEffects()
    step(fx, s)
    const startRow = s.active!.row
    step(fx, s, [{ k: 'press', a: 'hardDrop' }])

    expect(fx.trail()).toBeGreaterThan(0)
    expect(fx.trailCount()).toBe(4)
    const rows = fx.trailCells.slice(0, fx.trailCount()).map((c) => c.row)
    // The trail begins at the row the piece left, which is where it was before the
    // drop -- reading `state.active` afterwards put this above the field, where the
    // renderer clipped it and nothing was ever drawn.
    expect(Math.min(...rows)).toBe(startRow)
  })

  it('leaves no trail behind a drop of zero cells', () => {
    const s = createGame(6)
    const fx = createEffects()
    step(fx, s)
    fx.onTick(s, [{ t: 'hardDrop', cells: 0 } as GameEvent])
    expect(fx.trail()).toBe(0)
  })

  it('shakes only for a tetris, not for a single', () => {
    const s = createGame(7)
    const one = createEffects()
    one.onTick(s, [{ t: 'clear', rows: 1, spin: 'none', b2b: false, combo: 0, perfect: false, points: 100 } as GameEvent])
    expect(one.shakeX()).toBe(0)

    const four = createEffects()
    four.onTick(s, [{ t: 'clear', rows: 4, spin: 'none', b2b: false, combo: 0, perfect: false, points: 800 } as GameEvent])
    expect(Math.abs(four.shakeX()) + Math.abs(four.shakeY())).toBeGreaterThan(0)
  })

  it('decays every timer to exactly zero and no further', () => {
    const s = createGame(8)
    const fx = createEffects()
    step(fx, s, [{ k: 'press', a: 'hardDrop' }])
    fx.advance(10_000)
    expect(fx.flash()).toBe(0)
    expect(fx.trail()).toBe(0)
    expect(fx.shakeX()).toBe(0)
    // Decaying again must not go negative and revive anything.
    fx.advance(10_000)
    expect(fx.flash()).toBe(0)
  })

  it('hands out the same buffer every frame, so drawing allocates nothing', () => {
    const fx = createEffects()
    expect(fx.flashCells).toBe(fx.flashCells)
    expect(fx.trailCells).toBe(fx.trailCells)
  })
})

describe('effects: prefers-reduced-motion (NFR-A11Y-05)', () => {
  it('snaps to whole cells and silences every effect when reduced', () => {
    stubMotion(true)
    const s = createGame(9)
    const fx = createEffects()
    step(fx, s)
    const from = s.active!.row
    for (let i = 0; i < TICK_HZ; i++) step(fx, s)
    expect(fx.pieceRow(s, 0.5)).toBe(s.active!.row)
    expect(fx.pieceRow(s, 0.5)).not.toBe(from + 0.5)

    step(fx, s, [{ k: 'press', a: 'hardDrop' }])
    expect(fx.flash()).toBe(0)
    expect(fx.trail()).toBe(0)
    expect(fx.shakeX()).toBe(0)
    expect(fx.reduced()).toBe(true)
  })

  it('notices the setting changing mid-game instead of reading it once', () => {
    const motion = stubMotion(false)
    const fx = createEffects()
    expect(fx.reduced()).toBe(false)
    motion.change(true)
    expect(fx.reduced()).toBe(true)
    motion.change(false)
    expect(fx.reduced()).toBe(false)
  })

  it('removes its listener on dispose', () => {
    const motion = stubMotion(false)
    const fx = createEffects()
    fx.dispose()
    expect(motion.removeSpy).toHaveBeenCalled()
  })
})

describe('clearPhase', () => {
  it('is inactive when no rows are going', () => {
    const s = createGame(11)
    expect(clearPhase(s, DEFAULT_CONFIG.clearDelay, TICK_MS, out()).active).toBe(false)
  })

  it('flashes first, then collapses, and ends fully collapsed', () => {
    const s = createGame(12)
    s.phase = 'lineClearDelay'
    s.pendingRows = [39]

    s.clearTimer = DEFAULT_CONFIG.clearDelay
    const start = clearPhase(s, DEFAULT_CONFIG.clearDelay, TICK_MS, out())
    expect(start.flash).toBeCloseTo(1, 5)
    expect(start.collapse).toBe(0)

    // Past the flash window, the collapse takes over.
    s.clearTimer = 4
    const mid = clearPhase(s, DEFAULT_CONFIG.clearDelay, TICK_MS, out())
    expect(mid.flash).toBe(0)
    expect(mid.collapse).toBeGreaterThan(0)
    expect(mid.collapse).toBeLessThanOrEqual(1)

    s.clearTimer = 0
    expect(clearPhase(s, DEFAULT_CONFIG.clearDelay, TICK_MS, out()).collapse).toBeCloseTo(1, 5)
  })

  it('never reports progress outside 0..1', () => {
    const s = createGame(13)
    s.phase = 'lineClearDelay'
    s.pendingRows = [39]
    for (let t = -5; t <= DEFAULT_CONFIG.clearDelay + 5; t++) {
      s.clearTimer = t
      const p = clearPhase(s, DEFAULT_CONFIG.clearDelay, TICK_MS, out())
      expect(p.flash).toBeGreaterThanOrEqual(0)
      expect(p.flash).toBeLessThanOrEqual(1)
      expect(p.collapse).toBeGreaterThanOrEqual(0)
      expect(p.collapse).toBeLessThanOrEqual(1)
    }
  })
})

describe('effects: hold', () => {
  beforeEach(() => stubMotion(false))

  it('does not tween the swapped-in piece across the board', () => {
    const s = createGame(21)
    const fx = createEffects()
    step(fx, s)
    // Walk the piece away from spawn so a stale tween would be visible.
    for (let i = 0; i < 3; i++) step(fx, s, [{ k: 'press', a: 'left' }, { k: 'release', a: 'left' }])
    step(fx, s, [{ k: 'press', a: 'hold' }])
    // The identity changed, so the column snaps rather than travelling.
    expect(fx.pieceCol(s, 1)).toBe(s.active!.col)
  })
})
