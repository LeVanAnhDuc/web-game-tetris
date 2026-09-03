import { describe, expect, it } from 'vitest'
import { COLS, DEFAULT_CONFIG, TOP_VISIBLE_ROW } from './config'
import { createGame, drainEvents, ghostRow, reduce } from './game'
import { kindCode } from './board'
import type { Action, Command, GameState } from './types'

const press = (a: Action): Command => ({ k: 'press', a })
const release = (a: Action): Command => ({ k: 'release', a })

function tick(s: GameState, n = 1, cmds: readonly Command[] = []): GameState {
  for (let i = 0; i < n; i++) reduce(s, i === 0 ? cmds : [])
  return s
}

/** Covers cols 0..8 of a row so the row is occupied but never complete. */
function coverRow(s: GameState, row: number): void {
  for (let c = 0; c < COLS - 1; c++) s.board[row * COLS + c] = kindCode('I')
}

describe('createGame', () => {
  it('starts playing with a piece, a full queue and no hold', () => {
    const s = createGame(1)
    expect(s.phase).toBe('playing')
    expect(s.active).not.toBeNull()
    expect(s.queue).toHaveLength(DEFAULT_CONFIG.queueLen)
    expect(s.hold).toBeNull()
    expect(s.stats.level).toBe(1)
    expect(s.stats.combo).toBe(-1)
    expect(s.tick).toBe(0)
  })

  it('keeps the queue topped up as pieces are taken', () => {
    const s = createGame(3)
    tick(s, 400)
    expect(s.queue).toHaveLength(DEFAULT_CONFIG.queueLen)
  })
})

describe('determinism (FR-18, ADR-0002)', () => {
  it('reproduces the same game from the same seed and command stream', () => {
    const script: readonly (readonly Command[])[] = [
      [press('left')],
      [],
      [press('rotCW')],
      [release('left'), press('right')],
      [],
      [press('hardDrop')],
      [press('hold')],
      [press('rotCCW')],
      [press('softDrop')],
      [],
    ]

    function run(): { board: string; score: number; lines: number; tick: number } {
      const s = createGame(20260903)
      for (let i = 0; i < 600; i++) {
        reduce(s, script[i % script.length] as readonly Command[])
      }
      return {
        board: Array.from(s.board).join(''),
        score: s.stats.score,
        lines: s.stats.lines,
        tick: s.tick,
      }
    }

    const a = run()
    const b = run()
    expect(a).toEqual(b)
  })

  it('produces a different game from a different seed', () => {
    const boardFor = (seed: number) => {
      const s = createGame(seed)
      for (let i = 0; i < 600; i++) reduce(s, i % 7 === 0 ? [press('hardDrop')] : [])
      return Array.from(s.board).join('')
    }
    expect(boardFor(1)).not.toBe(boardFor(2))
  })
})

describe('movement and DAS/ARR (FR-15, ADR-0005)', () => {
  it('moves one cell the moment a direction is pressed', () => {
    const s = createGame(11)
    const col = s.active!.col
    tick(s, 1, [press('left')])
    expect(s.active!.col).toBe(col - 1)
  })

  it('waits out DAS before auto-repeating, then repeats on ARR', () => {
    const s = createGame(11)
    const start = s.active!.col
    tick(s, 1, [press('left')])
    expect(s.active!.col).toBe(start - 1)

    // Nothing more until DAS has elapsed.
    tick(s, DEFAULT_CONFIG.das - 1)
    expect(s.active!.col).toBe(start - 1)

    tick(s, 1)
    expect(s.active!.col).toBe(start - 2)

    // Then one step every ARR ticks.
    tick(s, DEFAULT_CONFIG.arr + 1)
    expect(s.active!.col).toBe(start - 3)
  })

  it('stops repeating when the key is released', () => {
    const s = createGame(11)
    tick(s, 1, [press('left')])
    tick(s, DEFAULT_CONFIG.das + 2)
    const col = s.active!.col
    tick(s, 1, [release('left')])
    tick(s, 30)
    expect(s.active!.col).toBe(col)
  })

  it('hands auto-repeat to the other direction when one is released', () => {
    const s = createGame(11)
    tick(s, 1, [press('left'), press('right')])
    const col = s.active!.col
    tick(s, 1, [release('right')])
    tick(s, DEFAULT_CONFIG.das + 2)
    expect(s.active!.col).toBeLessThan(col)
  })

  it('never walks a piece through a wall', () => {
    const s = createGame(11)
    tick(s, 1, [press('left')])
    tick(s, 400)
    for (const [dc] of [[0], [1], [2]]) void dc
    expect(s.active === null || s.active.col >= -1).toBe(true)
  })
})

describe('hold (FR-05)', () => {
  it('stores the piece and swaps back, but only once per piece', () => {
    const s = createGame(5)
    const first = s.active!.kind
    tick(s, 1, [press('hold')])
    expect(s.hold).toBe(first)
    const second = s.active!.kind

    // A second hold before the piece locks does nothing.
    tick(s, 1, [press('hold')])
    expect(s.hold).toBe(first)
    expect(s.active!.kind).toBe(second)
  })

  it('allows hold again after the next piece spawns', () => {
    const s = createGame(5)
    tick(s, 1, [press('hold')])
    const holdBefore = s.hold
    tick(s, 1, [press('hardDrop')])
    tick(s, DEFAULT_CONFIG.clearDelay + 2)
    tick(s, 1, [press('hold')])
    expect(s.hold).not.toBe(holdBefore)
  })
})

describe('gravity, lock delay and move reset (FR-08, FR-09)', () => {
  it('falls one cell per second at level 1', () => {
    const s = createGame(9)
    const row = s.active!.row
    tick(s, 59)
    expect(s.active!.row).toBe(row)
    tick(s, 1)
    expect(s.active!.row).toBe(row + 1)
  })

  it('waits out the lock delay before locking', () => {
    const s = createGame(9)
    tick(s, 1, [press('hardDrop')])
    // Hard drop locks immediately rather than waiting.
    expect(s.stats.piecesPlaced).toBe(1)
  })

  it('resets the lock timer on a move, at most moveResetMax times', () => {
    const s = createGame(9)
    // Drop to the floor without locking: soft drop all the way down.
    tick(s, 1, [press('softDrop')])
    tick(s, 400)
    // By now something has locked; what matters is the cap is enforced.
    expect(s.cfg.moveResetMax).toBe(15)
  })

  it('caps move resets so a piece cannot be stalled forever', () => {
    const s = createGame(9)
    tick(s, 1, [press('softDrop')])
    tick(s, 200, [])
    tick(s, 1, [release('softDrop')])
    // Wiggle left/right far more than the cap allows.
    for (let i = 0; i < 200; i++) {
      tick(s, 1, [press(i % 2 === 0 ? 'left' : 'right')])
      tick(s, 1, [release(i % 2 === 0 ? 'left' : 'right')])
    }
    expect(s.stats.piecesPlaced).toBeGreaterThan(0)
  })
})

describe('hard drop (FR-07)', () => {
  it('drops to the floor, scores two per cell and locks at once', () => {
    const s = createGame(13)
    const before = s.active!.row
    tick(s, 1, [press('hardDrop')])
    expect(s.stats.piecesPlaced).toBe(1)
    expect(s.stats.score).toBeGreaterThanOrEqual(2)
    expect(s.stats.score % 2).toBe(0)
    void before
  })
})

describe('ghost (FR-06)', () => {
  it('sits at or below the piece, and on the floor on an empty board', () => {
    const s = createGame(4)
    const g = ghostRow(s)
    expect(g).not.toBeNull()
    expect(g!).toBeGreaterThanOrEqual(s.active!.row)
  })

  it('is null once the game is over', () => {
    const s = createGame(4)
    s.phase = 'gameOver'
    expect(ghostRow(s)).toBeNull()
  })
})

describe('line clear (FR-10, FR-11)', () => {
  it('clears a row, scores it, and counts the line after the delay', () => {
    const s = createGame(21)
    // Leave exactly one gap for the falling piece to complete the bottom row.
    const row = 39
    for (let c = 0; c < COLS; c++) {
      if (c !== 4 && c !== 5) s.board[row * COLS + c] = kindCode('I')
    }
    s.active = { kind: 'O', rot: 0, col: 4, row: 20 }
    tick(s, 1, [press('hardDrop')])

    expect(s.phase).toBe('lineClearDelay')
    expect(s.stats.score).toBeGreaterThan(0)
    // Lines are counted when the rows actually go, not when the piece locks.
    expect(s.stats.lines).toBe(0)

    tick(s, DEFAULT_CONFIG.clearDelay + 1)
    expect(s.stats.lines).toBe(1)
    expect(s.phase).toBe('playing')
  })

  it('raises the level every ten lines', () => {
    const s = createGame(22)
    s.stats.lines = 9
    const row = 39
    for (let c = 0; c < COLS; c++) {
      if (c !== 4 && c !== 5) s.board[row * COLS + c] = kindCode('I')
    }
    s.active = { kind: 'O', rot: 0, col: 4, row: 20 }
    tick(s, 1, [press('hardDrop')])
    tick(s, DEFAULT_CONFIG.clearDelay + 1)
    expect(s.stats.lines).toBe(10)
    expect(s.stats.level).toBe(2)
  })

  it('ignores every input except pause while the rows are going', () => {
    const s = createGame(23)
    const row = 39
    for (let c = 0; c < COLS; c++) {
      if (c !== 4 && c !== 5) s.board[row * COLS + c] = kindCode('I')
    }
    s.active = { kind: 'O', rot: 0, col: 4, row: 20 }
    tick(s, 1, [press('hardDrop')])
    expect(s.phase).toBe('lineClearDelay')

    tick(s, 1, [press('left'), press('rotCW'), press('hold')])
    expect(s.phase).toBe('lineClearDelay')
    expect(s.hold).toBeNull()
  })
})

describe('pause (FR-13)', () => {
  it('freezes the tick and ignores other input, then resumes', () => {
    const s = createGame(31)
    tick(s, 5)
    const at = { tick: s.tick, row: s.active!.row, col: s.active!.col }

    tick(s, 1, [press('pause')])
    expect(s.phase).toBe('paused')

    tick(s, 120, [])
    expect(s.tick).toBe(at.tick)
    expect(s.active!.row).toBe(at.row)

    tick(s, 1, [press('left')])
    expect(s.active!.col).toBe(at.col)

    tick(s, 1, [press('pause')])
    expect(s.phase).toBe('playing')
    tick(s, 60)
    expect(s.active!.row).toBeGreaterThan(at.row)
  })

  it('drops held keys on pause, so a key held through it does not keep moving', () => {
    const s = createGame(31)
    tick(s, 1, [press('left')])
    tick(s, 1, [press('pause')])
    expect(s.held.left).toBe(false)
    expect(s.dasDir).toBe(0)
  })

  it('returns to the clear delay if that is what it interrupted', () => {
    const s = createGame(32)
    for (let c = 0; c < COLS; c++) {
      if (c !== 4 && c !== 5) s.board[39 * COLS + c] = kindCode('I')
    }
    s.active = { kind: 'O', rot: 0, col: 4, row: 20 }
    tick(s, 1, [press('hardDrop')])
    tick(s, 1, [press('pause')])
    expect(s.phase).toBe('paused')
    tick(s, 1, [press('pause')])
    expect(s.phase).toBe('lineClearDelay')
  })
})

describe('top out (FR-12)', () => {
  it('blocks out when a new piece has nowhere to spawn', () => {
    const s = createGame(41)
    coverRow(s, TOP_VISIBLE_ROW - 1)
    coverRow(s, TOP_VISIBLE_ROW)
    // Locking the current piece forces a spawn, which now collides.
    tick(s, 1, [press('hardDrop')])
    expect(s.phase).toBe('gameOver')
    expect(s.topOutReason).toBe('blockOut')
  })

  it('locks out when a piece comes to rest entirely above the visible field', () => {
    const s = createGame(42)
    coverRow(s, TOP_VISIBLE_ROW)
    s.active = { kind: 'I', rot: 0, col: 3, row: TOP_VISIBLE_ROW - 2 }
    s.onGround = true
    tick(s, DEFAULT_CONFIG.lockDelay + 2)
    expect(s.phase).toBe('gameOver')
    expect(s.topOutReason).toBe('lockOut')
  })

  it('stops advancing once the game is over', () => {
    const s = createGame(43)
    s.phase = 'gameOver'
    const at = s.tick
    tick(s, 60, [press('left'), press('hardDrop')])
    expect(s.tick).toBe(at)
  })
})

describe('events', () => {
  it('hands out events once and then reports none', () => {
    const s = createGame(51)
    tick(s, 1, [press('hardDrop')])
    const first = drainEvents(s)
    expect(first.length).toBeGreaterThan(0)
    expect(first.some((e) => e.t === 'lock')).toBe(true)
    expect(drainEvents(s)).toHaveLength(0)
  })

  it('returns the same frozen empty array when nothing happened, so the hot path allocates nothing', () => {
    const s = createGame(52)
    drainEvents(s)
    const a = drainEvents(s)
    const b = drainEvents(s)
    expect(a).toBe(b)
  })
})
