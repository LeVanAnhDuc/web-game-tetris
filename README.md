# web-game-tetris

Tetris on the modern Guideline, running entirely in the browser. No backend, no
account, no install — open the page and play.

Built for players who already have Guideline reflexes: full SRS with wall kicks,
7-bag, hold, ghost piece, lock delay with move reset, T-spin, combo and
back-to-back. Getting one of those details wrong is the difference between a Tetris
that feels right and one that feels broken, so the rules live in a pure,
deterministic engine that is tested against the published kick tables rather than
against how it looks on screen.

## Features

- Marathon play on the modern Guideline: SRS rotation with wall kicks, 7-bag
  randomiser, hold, ghost piece, a five-deep next queue, soft and hard drop, lock
  delay with a capped move reset, and level-based gravity.
- Guideline scoring including T-spin and T-spin mini, combo, back-to-back and
  perfect clear.
- Keyboard controls with configurable-in-the-engine DAS/ARR, plus touch controls on
  small screens.
- Pause and resume, and an automatic pause when the tab goes to the background so a
  game is never lost to a tab switch.
- Bilingual interface, English and Vietnamese, detected from the browser.

## Running it

```bash
npm ci
npm run dev        # dev server
npm run test       # unit tests
npm run typecheck  # tsc, no emit
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

Uses **npm**, not Yarn (ADR-0001). No environment variables are needed — see
[`.env.example`](.env.example) for why that is the correct answer rather than an
omission.

## How it is put together

| Folder | Holds |
| --- | --- |
| `src/engine/` | Every rule, as pure functions. No DOM, no clock, no `Math.random` |
| `src/runtime/` | The fixed-timestep loop, the round lifecycle, replay recording |
| `src/input/` | Keyboard and touch, reporting presses and releases only |
| `src/render/` | Canvas renderer and its pre-rendered cell sprites |
| `src/i18n/` | Two flat locale files and a `t()` |
| `src/ui/` | React: screens, HUD, modals |

The engine is deterministic on purpose: a whole game is described by a seed plus the
commands and the ticks they arrived on. That is what makes replays reproducible, what
turns a rules bug into a file instead of a story, and what keeps server-side score
validation possible later without writing the rules a second time.

## Documentation

[`docs/README.md`](docs/README.md) is the map. Start there — it lists what each
document answers and whether it is filled in. Decisions and the reasoning behind them
are one file each under [`docs/decisions/`](docs/decisions/README.md).
