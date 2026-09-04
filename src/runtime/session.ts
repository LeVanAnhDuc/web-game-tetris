import {
  createGame,
  drainEvents,
  reduce,
  type Command,
  type GameEvent,
  type GameState,
} from '../engine'
import { createRecorder, type Replay } from './recorder'

/**
 * One round of play: owns the game state, the command queue and the recorder.
 *
 * It does NOT touch storage (see architecture.md §3). When a round ends it emits an
 * event; `ui/` is what decides to persist anything. Putting I/O inside the thing the
 * loop calls sixty times a second is how a frame budget disappears.
 */

export type SessionListener = (events: readonly GameEvent[], state: GameState) => void

export interface Session {
  readonly state: GameState
  /** Queue a command for the next tick. */
  send(cmd: Command): void
  /**
   * Advance exactly one tick, draining the queue into the engine, and hand back the
   * events it produced. The renderer needs them to trigger effects, and returning
   * them costs nothing next to a second subscription.
   */
  tick(): readonly GameEvent[]
  subscribe(fn: SessionListener): () => void
  getReplay(): Replay
  restart(seed?: number): void
}

export function createSession(seed: number): Session {
  let state = createGame(seed)
  let recorder = createRecorder(seed)
  let queue: Command[] = []
  const listeners = new Set<SessionListener>()

  function tick(): readonly GameEvent[] {
    const cmds = queue
    queue = cmds.length > 0 ? [] : cmds
    if (cmds.length > 0) recorder.record(state.tick, cmds)
    reduce(state, cmds)
    const events = drainEvents(state)
    if (events.length > 0) {
      for (const fn of listeners) fn(events, state)
    }
    return events
  }

  return {
    get state() {
      return state
    },
    send(cmd) {
      queue.push(cmd)
    },
    tick,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getReplay() {
      return recorder.snapshot()
    },
    restart(nextSeed = Date.now() >>> 0) {
      // `Date.now` lives HERE, outside the engine, and only to pick a seed. The
      // engine still never reads a clock (invariant #1).
      state = createGame(nextSeed)
      recorder = createRecorder(nextSeed)
      queue = []
    },
  }
}
