import { KINDS, type BagState, type Kind } from './types'
import { shuffle } from './rng'

/**
 * 7-bag randomiser (FR-03): every group of seven contains each tetromino exactly
 * once, so the longest possible drought is 12 pieces rather than unbounded.
 *
 * INVARIANT #6: exactly ONE bag per game. Re-creating it between pieces makes the
 * distribution look right in a short test while silently breaking the drought
 * guarantee the player actually relies on.
 */

export function createBag(seed: number): BagState {
  const bag: BagState = { remaining: [], rngState: seed | 0 }
  refill(bag)
  return bag
}

/** Fills `remaining` with a freshly shuffled set of all seven kinds. */
export function refill(bag: BagState): void {
  const next = KINDS.slice() as Kind[]
  bag.rngState = shuffle(next, bag.rngState)
  // Pieces are taken from the end, so reversing here is not needed -- order is
  // whatever the shuffle produced.
  bag.remaining = next
}

/** Takes the next kind, refilling when the bag runs dry. Mutates `bag` (ADR-0010). */
export function nextKind(bag: BagState): Kind {
  if (bag.remaining.length === 0) refill(bag)
  return bag.remaining.pop() as Kind
}
