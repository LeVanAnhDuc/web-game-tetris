import type { Action, Command } from '../engine'

/**
 * Keyboard input (FR-15).
 *
 * This layer only ever reports PRESS and RELEASE. It never synthesises auto-repeat:
 * DAS and ARR are counted inside the engine in ticks, because a `setInterval`-driven
 * repeat is at the mercy of the browser's timer throttling and would make replays
 * drift (ADR-0005).
 */

export const DEFAULT_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  KeyZ: 'rotCCW',
  KeyX: 'rotCW',
  ArrowUp: 'rotCW',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
  KeyC: 'hold',
  Escape: 'pause',
  KeyP: 'pause',
}

export interface KeyboardInput {
  attach(): void
  detach(): void
}

export function createKeyboardInput(
  send: (cmd: Command) => void,
  bindings: Readonly<Record<string, Action>> = DEFAULT_BINDINGS,
  target: Window = window,
): KeyboardInput {
  /** Which actions are currently down, so a repeat keydown is not a second press. */
  const down = new Set<Action>()

  function releaseAll(): void {
    for (const a of down) send({ k: 'release', a })
    down.clear()
  }

  function onKeyDown(ev: KeyboardEvent): void {
    const action = bindings[ev.code]
    if (!action) return
    // Space and the arrows scroll the page otherwise, and Space is hard drop.
    ev.preventDefault()
    // The OS sends a stream of keydowns while a key is held. The engine counts its
    // own repeat, so only the first one is a press.
    if (ev.repeat || down.has(action)) return
    down.add(action)
    send({ k: 'press', a: action })
  }

  function onKeyUp(ev: KeyboardEvent): void {
    const action = bindings[ev.code]
    if (!action) return
    ev.preventDefault()
    if (!down.delete(action)) return
    send({ k: 'release', a: action })
  }

  /**
   * Losing focus mid-hold is the classic bug: the keyup never arrives, the engine
   * still thinks the key is down, and the piece slides into the wall forever
   * (ADR-0005 §4).
   */
  function onBlur(): void {
    releaseAll()
  }

  function onVisibility(): void {
    if (typeof document !== 'undefined' && document.hidden) releaseAll()
  }

  return {
    attach() {
      target.addEventListener('keydown', onKeyDown)
      target.addEventListener('keyup', onKeyUp)
      target.addEventListener('blur', onBlur)
      target.document?.addEventListener('visibilitychange', onVisibility)
    },
    detach() {
      target.removeEventListener('keydown', onKeyDown)
      target.removeEventListener('keyup', onKeyUp)
      target.removeEventListener('blur', onBlur)
      target.document?.removeEventListener('visibilitychange', onVisibility)
      releaseAll()
    },
  }
}
