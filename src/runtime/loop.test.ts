import { describe, expect, it } from 'vitest'
import { MAX_TICKS_PER_FRAME } from '../engine'
import { STEP_MS, createLoop, type LoopDeps } from './loop'

function harness(hidden = false) {
  let ticks = 0
  let draws = 0
  let lastAlpha = -1
  let autoPauses = 0
  let isHidden = hidden
  const deps: LoopDeps = {
    now: () => 0,
    requestFrame: () => 1,
    cancelFrame: () => {},
    isHidden: () => isHidden,
  }
  const loop = createLoop(
    {
      tick: () => {
        ticks++
      },
      draw: (a: number) => {
        draws++
        lastAlpha = a
      },
      onAutoPause: () => {
        autoPauses++
      },
    },
    deps,
  )
  return {
    loop,
    counts: () => ({ ticks, draws, autoPauses, lastAlpha }),
    hide: (v: boolean) => {
      isHidden = v
    },
  }
}

describe('fixed-timestep loop', () => {
  it('runs one tick per step of elapsed time', () => {
    const h = harness()
    h.loop.frame(0)
    expect(h.loop.frame(STEP_MS)).toBe(1)
    expect(h.loop.frame(STEP_MS * 2)).toBe(1)
    expect(h.counts().ticks).toBe(2)
  })

  it('runs nothing when less than a step has passed, but still draws', () => {
    const h = harness()
    h.loop.frame(0)
    expect(h.loop.frame(STEP_MS / 2)).toBe(0)
    expect(h.counts().ticks).toBe(0)
    expect(h.counts().draws).toBe(2)
  })

  it('carries the remainder instead of losing it', () => {
    const h = harness()
    h.loop.frame(0)
    // Two frames of 0.6 steps add up to more than one step.
    h.loop.frame(STEP_MS * 0.6)
    const ran = h.loop.frame(STEP_MS * 1.2)
    expect(ran).toBe(1)
  })

  it('never runs more than the cap in one frame (NFR-REL-04)', () => {
    const h = harness()
    h.loop.frame(0)
    // Pretend the tab stalled for ten seconds.
    const ran = h.loop.frame(10_000)
    expect(ran).toBe(MAX_TICKS_PER_FRAME)
  })

  it('does not bank a long stall for the following frames', () => {
    const h = harness()
    h.loop.frame(0)
    h.loop.frame(10_000)
    // The very next frame is a normal one, not a burst.
    const ran = h.loop.frame(10_000 + STEP_MS)
    expect(ran).toBe(1)
  })

  it('ignores a backwards clock', () => {
    const h = harness()
    h.loop.frame(1000)
    expect(h.loop.frame(500)).toBe(0)
  })

  it('stops ticking while the tab is hidden and reports it once (NFR-REL-01)', () => {
    const h = harness()
    h.loop.frame(0)
    h.hide(true)
    expect(h.loop.frame(STEP_MS * 3)).toBe(0)
    expect(h.loop.frame(STEP_MS * 6)).toBe(0)
    expect(h.counts().autoPauses).toBe(1)
    expect(h.counts().ticks).toBe(0)
  })

  it('does not replay the hidden period when the tab comes back', () => {
    const h = harness()
    h.loop.frame(0)
    h.hide(true)
    h.loop.frame(60_000)
    h.hide(false)
    // First frame back only re-bases the clock.
    expect(h.loop.frame(60_016)).toBe(0)
    expect(h.loop.frame(60_016 + STEP_MS)).toBe(1)
  })

  it('reports running state around start and stop', () => {
    const h = harness()
    expect(h.loop.running).toBe(false)
    h.loop.start()
    expect(h.loop.running).toBe(true)
    h.loop.start()
    expect(h.loop.running).toBe(true)
    h.loop.stop()
    expect(h.loop.running).toBe(false)
  })

  it('reports how far the clock has moved toward the next tick', () => {
    const h = harness()
    h.loop.frame(0)
    // Exactly one step consumed leaves nothing over.
    h.loop.frame(STEP_MS)
    expect(h.counts().lastAlpha).toBeCloseTo(0, 5)
    // Half a step past a tick is half way to the next one.
    h.loop.frame(STEP_MS * 1.5)
    expect(h.counts().lastAlpha).toBeCloseTo(0.5, 5)
  })

  it('keeps alpha inside [0, 1] even after a stall', () => {
    const h = harness()
    h.loop.frame(0)
    h.loop.frame(10_000)
    const a = h.counts().lastAlpha
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
  })
})
