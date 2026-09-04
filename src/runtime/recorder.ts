import type { Command, Config } from '../engine'

/**
 * Replay recording (FR-18).
 *
 * The engine is already deterministic, so a whole game is described by its seed
 * plus the commands and the ticks they arrived on -- a couple of kilobytes. There
 * is no viewer yet and nothing is written to storage; this exists because it costs
 * almost nothing today and turns "a piece got stuck at level 12" into a file you can
 * replay instead of a story (ADR-0002).
 */

export interface ReplayEntry {
  readonly tick: number
  readonly k: Command['k']
  readonly a: Command['a']
}

export interface Replay {
  readonly seed: number
  /**
   * The config the game was played under. Once the fall speed became a setting,
   * `{seed, commands}` stopped describing a game on its own -- the same inputs under
   * a different speed produce a different board (ADR-0013).
   */
  readonly cfg: Config
  readonly entries: readonly ReplayEntry[]
}

export interface Recorder {
  record(tick: number, cmds: readonly Command[]): void
  snapshot(): Replay
  reset(seed: number, cfg: Config): void
}

export function createRecorder(seed: number, cfg: Config): Recorder {
  let currentSeed = seed
  let currentCfg = cfg
  let entries: ReplayEntry[] = []
  return {
    record(tick, cmds) {
      for (let i = 0; i < cmds.length; i++) {
        const c = cmds[i] as Command
        entries.push({ tick, k: c.k, a: c.a })
      }
    },
    snapshot() {
      return { seed: currentSeed, cfg: { ...currentCfg }, entries: entries.slice() }
    },
    reset(nextSeed, nextCfg) {
      currentSeed = nextSeed
      currentCfg = nextCfg
      entries = []
    },
  }
}

/** Replays a recording into a fresh game. Used by tests and, later, by validation. */
export function replayCommandsAt(replay: Replay, tick: number): Command[] {
  const out: Command[] = []
  for (const e of replay.entries) {
    if (e.tick === tick) out.push({ k: e.k, a: e.a })
  }
  return out
}
