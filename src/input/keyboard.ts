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

/**
 * `bindings` is read through a function, not captured by value: rebinding a key must
 * not force this listener to be rebuilt, because rebuilding it meant rebuilding the
 * whole session and throwing away the round the player had paused to rebind in.
 *
 * `enabled` lets a dialog take the keyboard back. Without it this listener calls
 * `preventDefault` on arrows and Space no matter what has focus, which makes every
 * slider unusable and every button un-pressable with Space (NFR-A11Y-02).
 */
export function createKeyboardInput(
  send: (cmd: Command) => void,
  getBindings: () => Readonly<Record<string, Action>> = () => DEFAULT_BINDINGS,
  enabled: () => boolean = () => true,
  target: Window = window,
): KeyboardInput {
  /** Which actions are currently down, so a repeat keydown is not a second press. */
  const down = new Set<Action>()

  function releaseAll(): void {
    for (const a of down) send({ k: 'release', a })
    down.clear()
  }

  /** Typing in a control is not playing the game. */
  function isFormControl(node: EventTarget | null): boolean {
    const el = node as HTMLElement | null
    if (!el || typeof el.closest !== 'function') return false
    return el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') !== null
  }

  function onKeyDown(ev: KeyboardEvent): void {
    if (!enabled() || isFormControl(ev.target)) return
    const action = getBindings()[ev.code]
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
    // A release is honoured even while disabled: a key held when a dialog opened
    // must still come up, or the piece slides into the wall forever.
    if (isFormControl(ev.target)) return
    const action = getBindings()[ev.code]
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
