import { useCallback, useMemo, useRef } from 'react'
import { COLS, VISIBLE_ROWS, type Action, type Kind } from '../engine'
import { touchHandlers } from '../input/touch'
import { useI18n, type MessageKey } from '../i18n'
import { Icon, type IconName } from './Icon'
import { PiecePreview } from './PiecePreview'
import { AnimatedNumber, useBumpKey } from './AnimatedNumber'
import { useGameSession, type HudSnapshot } from './useGameSession'

/**
 * The play screen (US-01). Layout follows the approved mockup: mobile 375 first,
 * then rails at 768, then keyboard hints and no touch band at 1024+.
 *
 * The settings and language controls are present but inert -- they are the entry
 * points for FR-23..FR-34, and holding their space now means the layout does not
 * move when those features land.
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function clock(seconds: number): string {
  const total = Math.floor(seconds)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function Stat({ labelKey, value }: { labelKey: MessageKey; value: string }) {
  const { t } = useI18n()
  return (
    <div className="statrow">
      <span className="label">{t(labelKey)}</span>
      <span className="value value--sm">{value}</span>
    </div>
  )
}

function PadButton({
  action,
  icon,
  text,
  wide,
  send,
}: {
  action: Action
  icon?: IconName
  text?: string
  wide?: boolean
  send: (cmd: { k: 'press' | 'release'; a: Action }) => void
}) {
  const { t } = useI18n()
  // `useRef(touchHandlers(...))` evaluates its argument on every render and throws
  // the result away; lazily initialising keeps it to one per button.
  const ref = useRef<ReturnType<typeof touchHandlers> | null>(null)
  if (ref.current === null) ref.current = touchHandlers(send, action)
  const handlers = ref.current
  const label = t(`action.${action}` as MessageKey)
  return (
    <button
      type="button"
      className={wide ? 'padbtn padbtn--wide' : 'padbtn'}
      aria-label={label}
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      onPointerLeave={handlers.onPointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {icon ? <Icon name={icon} size={22} /> : text}
    </button>
  )
}

function Hint({ keys, icons, whatKey }: { keys?: string; icons?: IconName[]; whatKey: MessageKey }) {
  const { t } = useI18n()
  return (
    <div className="hint">
      <span className="hint__key">
        {icons ? icons.map((n) => <Icon key={n} name={n} size={14} />) : keys}
      </span>
      <span className="hint__what">{t(whatKey)}</span>
    </div>
  )
}

function Queue({ next, cell }: { next: readonly Kind[]; cell: number }) {
  return (
    <div className="queue">
      {next.map((kind, i) => (
        <PiecePreview key={`${kind}-${i}`} kind={kind} cell={cell} />
      ))}
    </div>
  )
}

function PausedModal({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  const { t } = useI18n()
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('modal.paused')}>
      <div className="modal">
        <h2 className="modal__title">{t('modal.paused')}</h2>
        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onResume} autoFocus>
            <Icon name="play" size={18} />
            {t('action.resume')}
          </button>
          <button type="button" className="btn btn--secondary" aria-disabled="true" title={t('notReady.body')}>
            {t('action.settings')}
          </button>
          <button type="button" className="btn btn--danger" onClick={onRestart}>
            {t('action.restart')}
          </button>
        </div>
      </div>
    </div>
  )
}

function GameOverModal({ hud, onRestart }: { hud: HudSnapshot; onRestart: () => void }) {
  const { t, locale } = useI18n()
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('modal.gameOver')}>
      <div className="modal">
        <h2 className="modal__title">{t('modal.gameOver')}</h2>
        <p className="modal__body">
          {hud.topOutReason === 'lockOut' ? t('modal.lockOut') : t('modal.blockOut')}
        </p>
        <div className="statlist">
          <Stat labelKey="hud.score" value={nf.format(hud.score)} />
          <Stat labelKey="hud.lines" value={nf.format(hud.lines)} />
          <Stat labelKey="hud.level" value={nf.format(hud.level)} />
          <Stat labelKey="hud.time" value={clock(hud.seconds)} />
          <Stat labelKey="hud.pps" value={hud.pps.toFixed(2)} />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onRestart} autoFocus>
            <Icon name="restart" size={18} />
            {t('action.playAgain')}
          </button>
          <button type="button" className="btn btn--secondary" aria-disabled="true" title={t('notReady.body')}>
            {t('action.highScores')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlayScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { hud, send, press, restart } = useGameSession(canvasRef)
  const { t, locale } = useI18n()
  // Memoised: building an Intl formatter is not free, and this component now
  // re-renders on every HUD publish.
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const fmt = useCallback((n: number) => nf.format(n), [nf])

  const paused = hud.phase === 'paused'
  const over = hud.phase === 'gameOver'

  // The level flashes once when it changes. The score counts up inside
  // AnimatedNumber, which writes its own text node rather than re-rendering this
  // tree at frame rate (invariant #3).
  const levelBump = useBumpKey(hud.level)

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('action.pause')}
          onClick={() => press('pause')}
        >
          <Icon name="pause" />
        </button>

        <span className="wordmark" aria-hidden="true">
          {t('app.title')}
        </span>

        <div className="topbar__stack topbar__grow">
          <span className="label">{t('hud.score')}</span>
          <AnimatedNumber className="value" value={hud.score} format={fmt} />
        </div>
        <div className="topbar__stack topbar__stack--wide">
          <span className="label">{t('hud.lines')}</span>
          <span className="value">{nf.format(hud.lines)}</span>
        </div>
        <div className="topbar__stack">
          <span className="label">{t('hud.level')}</span>
          <span key={levelBump} className="value value--bump">
            {nf.format(hud.level)}
          </span>
        </div>

        <button
          type="button"
          className="icon-btn"
          aria-label={t('action.settings')}
          aria-disabled="true"
          title={t('notReady.body')}
        >
          <Icon name="sliders" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('action.language')}
          aria-disabled="true"
          title={t('notReady.body')}
          style={{ width: 'auto', minWidth: 44, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
        >
          {locale.toUpperCase()}
        </button>
      </header>

      {/* Mobile only: hold and next sit above the board, because there are no rails. */}
      <div className="strip">
        <div className="strip__col">
          <span className="label">{t('hud.hold')}</span>
          <div className="slot">
            <PiecePreview kind={hud.hold} cell={12} />
          </div>
        </div>
        <div className="strip__col" style={{ flex: 1 }}>
          <span className="label">{t('hud.next')}</span>
          <Queue next={hud.next} cell={9} />
        </div>
      </div>

      <div className="main">
        <aside className="rail rail--left">
          <div className="strip__col">
            <span className="label">{t('hud.hold')}</span>
            <div className="slot">
              <PiecePreview kind={hud.hold} cell={16} />
            </div>
          </div>
          <div className="statlist">
            <Stat labelKey="hud.time" value={clock(hud.seconds)} />
            <Stat labelKey="hud.pps" value={hud.pps.toFixed(2)} />
            {hud.b2b ? <Stat labelKey="hud.b2b" value="×" /> : null}
            {hud.combo > 0 ? <Stat labelKey="hud.combo" value={`×${hud.combo}`} /> : null}
          </div>
        </aside>

        <div className="board-area">
          <div className="well">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={t('board.label', { cols: COLS, rows: VISIBLE_ROWS })}
            />
          </div>
        </div>

        <aside className="rail rail--right">
          <span className="label">{t('hud.next')}</span>
          <Queue next={hud.next} cell={14} />
        </aside>
      </div>

      <div className="touchband">
        <div className="touchband__cluster">
          <PadButton action="left" icon="left" send={send} />
          <PadButton action="right" icon="right" send={send} />
          <PadButton action="softDrop" icon="down" send={send} />
          <PadButton action="hold" icon="hold" send={send} />
        </div>
        <div className="touchband__cluster">
          <PadButton action="rotCCW" icon="rotateCCW" send={send} />
          <PadButton action="rotCW" icon="rotateCW" send={send} />
          <PadButton action="hardDrop" icon="hardDrop" wide send={send} />
        </div>
      </div>

      <footer className="hints">
        <Hint icons={['left', 'right']} whatKey="hint.move" />
        <Hint icons={['down']} whatKey="hint.softDrop" />
        <Hint keys="Space" whatKey="hint.hardDrop" />
        <Hint keys="Z / X" whatKey="hint.rotate" />
        <Hint keys="Shift" whatKey="hint.hold" />
        <Hint keys="Esc" whatKey="hint.pause" />
      </footer>

      {paused ? <PausedModal onResume={() => press('pause')} onRestart={restart} /> : null}
      {over ? <GameOverModal hud={hud} onRestart={restart} /> : null}
    </div>
  )
}
