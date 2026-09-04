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

## Releases and versioning

Every push to `main` creates a GitHub Release by itself
([`.github/workflows/release.yml`](.github/workflows/release.yml)), and deploys to
GitHub Pages ([`deploy.yml`](.github/workflows/deploy.yml)). Pull requests run tests
and a build first ([`ci.yml`](.github/workflows/ci.yml)).

**The version comes from your commit subjects**, so they have to follow Conventional
Commits. The whole range since the previous tag is scanned, so one `feat:` anywhere
in a push is enough for a minor bump — the merge commit's own subject does not need a
prefix.

| In the range since the last tag | Bump |
| --- | --- |
| `feat:` | minor — `v0.4.0` → `v0.5.0` |
| `fix:` · `docs:` · `chore:` · `ci:` · `refactor:` · `test:` · `perf:` | patch — `v0.4.0` → `v0.4.1` |
| `feat!:` (any `type!:`) or a `BREAKING CHANGE` footer | see the 0.x rule below |

**The 0.x rule:** while the major version is `0`, a breaking change bumps the
**minor**, not the major. Nothing is stable before 1.0, and `1.0.0` is a claim about
completeness — so crossing to it takes the explicit marker rather than happening on
its own. The first release of this repo was `v0.1.0` for the same reason.

Three markers, honoured **only in the HEAD commit subject** (not in bodies — the
bodies here run long and discuss releases, which would otherwise trigger them):

- `[release minor]` / `[release major]` — force a bigger bump. `[release major]` is
  the only way to reach `1.0.0`.
- `[skip release]` — no release for this push. For CI-only changes where a release
  would be noise. Never use it on a push that also carries a `feat:`, or you cancel
  that feature's release too.

**The notes are composed from the commit subjects**, grouped by type, breaking
changes first — see [`release-notes.sh`](.github/scripts/release-notes.sh). Not from
`--generate-notes`, which lists merged pull requests and therefore says nothing at all
when a push was direct commits. Both scripts run locally, so you can see what a
release will say before it says it:

```bash
bash .github/scripts/next-version.sh
bash .github/scripts/release-notes.sh v0.2.0 v0.1.0
```

**The README is not automated.** Any `feat:` that changes what a player can do must
update the `## Features` section above **in the same branch**, in the existing style —
one short English bullet. A README-only sync uses `docs:`, and never carries
`[skip release]`.

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
