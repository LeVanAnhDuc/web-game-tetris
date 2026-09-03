import type { Action, Command } from '../engine'

/**
 * Touch input (FR-16).
 *
 * The same `Command` stream as the keyboard, so DAS/ARR work on a held button
 * without a second implementation (ADR-0005). Pointer events are used rather than
 * touch events so a mouse press on the same button behaves identically.
 *
 * These are handler props rather than a listener attached to the document, because
 * the buttons are React elements laid out by the play screen -- `input/` describes
 * what a button does, `ui/` decides where it sits.
 */

export interface TouchHandlers {
  onPointerDown(ev: { preventDefault(): void; pointerId?: number }): void
  onPointerUp(ev: { preventDefault(): void }): void
  onPointerCancel(ev: { preventDefault(): void }): void
  onPointerLeave(ev: { preventDefault(): void }): void
}

/**
 * Builds handlers for one action button. `pointercancel` and `pointerleave` both
 * release: a finger that slides off the button must not leave the action stuck down,
 * which is the touch equivalent of a missing keyup.
 */
export function touchHandlers(send: (cmd: Command) => void, action: Action): TouchHandlers {
  let held = false

  function press(ev: { preventDefault(): void }): void {
    ev.preventDefault()
    if (held) return
    held = true
    send({ k: 'press', a: action })
  }

  function release(ev: { preventDefault(): void }): void {
    ev.preventDefault()
    if (!held) return
    held = false
    send({ k: 'release', a: action })
  }

  return {
    onPointerDown: press,
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
  }
}
