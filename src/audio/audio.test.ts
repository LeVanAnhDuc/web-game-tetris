import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameEvent } from '../engine'
import { createSfx } from './index'

/** A recording stand-in for the Web Audio API. */
function stubAudio() {
  const started: { freq: number; type: string }[] = []
  let closed = false
  let suspended = false
  const gain = () => ({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  })
  class FakeCtx {
    currentTime = 0
    state = 'running'
    destination = {}
    createGain = gain
    createOscillator() {
      const node = {
        type: 'sine' as string,
        frequency: { setValueAtTime: (v: number) => (node._f = v) },
        connect: vi.fn(),
        start: () => started.push({ freq: node._f, type: node.type }),
        stop: vi.fn(),
        _f: 0,
      }
      return node
    }
    suspend() {
      suspended = true
      return Promise.resolve()
    }
    resume() {
      suspended = false
      return Promise.resolve()
    }
    close() {
      closed = true
      return Promise.resolve()
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx)
  return { started, isClosed: () => closed, isSuspended: () => suspended }
}

const clear = (rows: number, spin: 'none' | 'mini' | 'tspin' = 'none'): GameEvent => ({
  t: 'clear',
  rows,
  spin,
  b2b: false,
  combo: 0,
  perfect: false,
  points: 100,
})

afterEach(() => vi.unstubAllGlobals())

describe('sfx', () => {
  it('makes no sound at all while muted', () => {
    const a = stubAudio()
    const sfx = createSfx(false, 1)
    sfx.play([clear(4), { t: 'lock' }, { t: 'levelUp', level: 2 }])
    expect(a.started).toHaveLength(0)
  })

  it('plays a longer run for more rows', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([clear(1)])
    const single = a.started.length
    a.started.length = 0
    sfx.play([clear(4)])
    expect(a.started.length).toBeGreaterThan(single)
  })

  it('gives a T-spin its own sound rather than the row-count one', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([clear(1, 'tspin')])
    const spin = a.started.map((s) => s.freq)
    a.started.length = 0
    sfx.play([clear(1)])
    const plain = a.started.map((s) => s.freq)
    expect(spin).not.toEqual(plain)
  })

  it('says nothing for a hard drop that travelled no distance', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([{ t: 'hardDrop', cells: 0 }])
    expect(a.started).toHaveLength(0)
  })

  it('creates no audio context until the first sound is asked for', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    expect(a.started).toHaveLength(0)
    sfx.play([{ t: 'lock' }])
    expect(a.started.length).toBeGreaterThan(0)
  })

  it('goes quiet when muted mid-game and comes back when unmuted', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([{ t: 'lock' }])
    a.started.length = 0
    sfx.setEnabled(false)
    sfx.play([{ t: 'lock' }])
    expect(a.started).toHaveLength(0)
    sfx.setEnabled(true)
    sfx.play([{ t: 'lock' }])
    expect(a.started.length).toBeGreaterThan(0)
  })

  it('keeps the game running when the browser has no audio at all', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const sfx = createSfx(true, 1)
    expect(() => sfx.play([clear(4), { t: 'lock' }])).not.toThrow()
    expect(() => sfx.setVolume(0.5)).not.toThrow()
    expect(() => sfx.dispose()).not.toThrow()
  })

  it('keeps the game running when constructing the context throws', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('no device')
        }
      },
    )
    const sfx = createSfx(true, 1)
    expect(() => sfx.play([{ t: 'lock' }])).not.toThrow()
  })

  it('clamps the volume to 0..1', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([{ t: 'lock' }])
    expect(() => sfx.setVolume(-3)).not.toThrow()
    expect(() => sfx.setVolume(50)).not.toThrow()
    void a
  })

  it('closes its context on dispose', () => {
    const a = stubAudio()
    const sfx = createSfx(true, 1)
    sfx.play([{ t: 'lock' }])
    sfx.dispose()
    expect(a.isClosed()).toBe(true)
  })
})
