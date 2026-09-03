// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { Command } from '../engine'
import { DEFAULT_BINDINGS, createKeyboardInput } from './keyboard'

let sent: Command[]

function key(type: 'keydown' | 'keyup', code: string, repeat = false): KeyboardEvent {
  const ev = new KeyboardEvent(type, { code, repeat, cancelable: true })
  window.dispatchEvent(ev)
  return ev
}

beforeEach(() => {
  sent = []
})

function attach() {
  const input = createKeyboardInput((c) => sent.push(c))
  input.attach()
  return input
}

describe('keyboard input', () => {
  it('reports one press and one release per key', () => {
    const input = attach()
    key('keydown', 'ArrowLeft')
    key('keyup', 'ArrowLeft')
    expect(sent).toEqual([
      { k: 'press', a: 'left' },
      { k: 'release', a: 'left' },
    ])
    input.detach()
  })

  it('never synthesises auto-repeat -- that is the engine job (ADR-0005)', () => {
    const input = attach()
    key('keydown', 'ArrowLeft')
    key('keydown', 'ArrowLeft', true)
    key('keydown', 'ArrowLeft', true)
    key('keydown', 'ArrowLeft')
    expect(sent.filter((c) => c.k === 'press')).toHaveLength(1)
    input.detach()
  })

  it('ignores a release for a key that was never pressed', () => {
    const input = attach()
    key('keyup', 'ArrowRight')
    expect(sent).toHaveLength(0)
    input.detach()
  })

  it('prevents default on game keys so the page does not scroll', () => {
    const input = attach()
    const ev = key('keydown', 'Space')
    expect(ev.defaultPrevented).toBe(true)
    input.detach()
  })

  it('leaves keys it does not bind alone', () => {
    const input = attach()
    const ev = key('keydown', 'KeyQ')
    expect(ev.defaultPrevented).toBe(false)
    expect(sent).toHaveLength(0)
    input.detach()
  })

  it('releases everything held when focus is lost', () => {
    const input = attach()
    key('keydown', 'ArrowLeft')
    key('keydown', 'ArrowDown')
    sent.length = 0
    window.dispatchEvent(new Event('blur'))
    expect(sent).toHaveLength(2)
    expect(sent.every((c) => c.k === 'release')).toBe(true)
    input.detach()
  })

  it('releases everything held on detach, so a remount cannot inherit a stuck key', () => {
    const input = attach()
    key('keydown', 'ArrowRight')
    sent.length = 0
    input.detach()
    expect(sent).toEqual([{ k: 'release', a: 'right' }])
  })

  it('stops listening after detach', () => {
    const input = attach()
    input.detach()
    sent.length = 0
    key('keydown', 'ArrowLeft')
    expect(sent).toHaveLength(0)
  })

  it('binds every action the game needs', () => {
    const actions = new Set(Object.values(DEFAULT_BINDINGS))
    for (const a of ['left', 'right', 'softDrop', 'hardDrop', 'rotCW', 'rotCCW', 'hold', 'pause']) {
      expect(actions.has(a as never), a).toBe(true)
    }
  })
})
