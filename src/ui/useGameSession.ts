import { useCallback, useEffect, useRef, useState } from 'react'
import { TICK_HZ, type Command, type Kind, type Phase, type TopOutReason } from '../engine'
import { createSfx } from '../audio'
import { createKeyboardInput } from '../input/keyboard'
import { createBoardRenderer } from '../render/canvas'
import { createEffects } from '../render/effects'
import { createLoop } from '../runtime/loop'
import { createSession } from '../runtime/session'
import { settingsToConfig, useSettings } from '../settings'

/**
 * Wires the game to React without letting React drive it.
 *
 * INVARIANT #3: React state must never be what advances the loop. The engine runs
 * inside `requestAnimationFrame` and writes straight to the canvas; React only
 * receives a HUD snapshot at ~10Hz. Sixty `setState` calls a second would allocate
 * and reconcile continuously, and the resulting dropped frames only show up on a
 * slow device.
 */

/** ~10Hz. The HUD does not need to be right to the frame; the board does. */
const HUD_EVERY_TICKS = 6

export interface HudSnapshot {
  score: number
  lines: number
  level: number
  combo: number
  b2b: boolean
  seconds: number
  pps: number
  hold: Kind | null
  next: readonly Kind[]
  phase: Phase
  topOutReason: TopOutReason | null
}

const EMPTY_HUD: HudSnapshot = {
  score: 0,
  lines: 0,
  level: 1,
  combo: -1,
  b2b: false,
  seconds: 0,
  pps: 0,
  hold: null,
  next: [],
  phase: 'playing',
  topOutReason: null,
}

export function useGameSession(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const { settings, loading } = useSettings()
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD)
  const sendRef = useRef<(cmd: Command) => void>(() => {})
  const restartRef = useRef<() => void>(() => {})

  // Live handles, so changing a setting takes effect without tearing the game down.
  const sfxRef = useRef<ReturnType<typeof createSfx> | null>(null)
  const rendererRef = useRef<ReturnType<typeof createBoardRenderer> | null>(null)
  const effectsRef = useRef<ReturnType<typeof createEffects> | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    const canvas: HTMLCanvasElement | null = canvasRef.current
    if (canvas === null) return
    const el = canvas

    const renderer = createBoardRenderer(canvas)
    rendererRef.current = renderer
    renderer.setOptions({ ghost: settingsRef.current.ghost, colorBlind: settingsRef.current.colorBlindMode })
    const sfx = createSfx(settingsRef.current.sound, settingsRef.current.volume)
    sfxRef.current = sfx
    // The renderer's visual memory (ADR-0012). Created here so its lifetime matches
    // the canvas exactly -- it is torn down with the effect below.
    const effects = createEffects()
    effects.setSmoothHorizontal(settingsRef.current.smoothHorizontal)
    effectsRef.current = effects
    // Only the SEED comes from the clock, and it comes from out here -- the engine
    // itself never reads one (invariant #1).
    // Difficulty and DAS/ARR are engine config, so they are fixed for the round --
     // changing the fall speed mid-game would make the replay describe something
     // that never happened (ADR-0013). The settings screen pauses, so the natural
     // moment to adopt them is the next round.
    const session = createSession(Date.now() >>> 0, settingsToConfig(settingsRef.current))
    sendRef.current = session.send
    restartRef.current = () => {
      session.restart(Date.now() >>> 0, settingsToConfig(settingsRef.current))
      publish(true)
    }

    let sinceHud = HUD_EVERY_TICKS

    function publish(force = false): void {
      if (!force && sinceHud < HUD_EVERY_TICKS) return
      sinceHud = 0
      const s = session.state
      const seconds = s.stats.playTicks / TICK_HZ
      setHud({
        score: s.stats.score,
        lines: s.stats.lines,
        level: s.stats.level,
        combo: s.stats.combo,
        b2b: s.stats.b2b,
        seconds,
        pps: seconds > 0 ? s.stats.piecesPlaced / seconds : 0,
        hold: s.hold,
        next: s.queue.slice(),
        phase: s.phase,
        topOutReason: s.topOutReason,
      })
    }

    /**
     * Sizes the canvas from `.main`, never from the element the canvas lives in.
     *
     * Measuring the canvas's own container is circular: the container's width comes
     * from the canvas, the canvas asks the container, and every ResizeObserver pass
     * shrinks it a little until the board collapses. `.main` is laid out by the
     * viewport and the fixed-width rails, so it cannot move in response to the
     * canvas.
     */
    function fitBoard(): void {
      const main = el.closest('.main') as HTMLElement | null
      if (!main) return
      const box = main.getBoundingClientRect()
      const rails = Array.from(main.querySelectorAll<HTMLElement>('.rail')).reduce(
        (sum, rail) => sum + rail.offsetWidth,
        0,
      )
      const style = getComputedStyle(main)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      // 14 = the well's 6px padding plus its 1px border, on both sides.
      const width = box.width - rails - padX - 14
      const height = box.height - padY - 14
      renderer.resize(Math.max(40, width), Math.max(80, height))
      renderer.draw(session.state, 1, effects)
    }

    const loop = createLoop({
      tick: () => {
        // BEFORE the engine steps: `reduce` locks a piece and spawns the next one in
        // the same call, so anything the effects need about the piece that just
        // locked has to be captured here.
        effects.beforeTick(session.state)
        const events = session.tick()
        effects.onTick(session.state, events)
        if (events.length > 0) sfx.play(events)
        sinceHud++
      },
      draw: (alpha, dtMs) => {
        effects.advance(dtMs)
        renderer.draw(session.state, alpha, effects)
        publish()
      },
      // A hidden tab pauses the game rather than dropping pieces unseen
      // (NFR-REL-01). Sent as a command so the engine stays the only thing that
      // knows what "paused" means.
      onAutoPause: () => {
        if (session.state.phase === 'playing' || session.state.phase === 'lineClearDelay') {
          session.send({ k: 'press', a: 'pause' })
          session.tick()
          publish(true)
        }
      },
    })

    const keyboard = createKeyboardInput(session.send, settingsRef.current.bindings)
    keyboard.attach()

    fitBoard()
    publish(true)
    loop.start()

    const observer = new ResizeObserver(fitBoard)
    const main = el.closest('.main')
    if (main) observer.observe(main)
    window.addEventListener('resize', fitBoard)

    return () => {
      loop.stop()
      effects.dispose()
      effectsRef.current = null
      sfx.dispose()
      sfxRef.current = null
      rendererRef.current = null
      keyboard.detach()
      observer.disconnect()
      window.removeEventListener('resize', fitBoard)
      sendRef.current = () => {}
      restartRef.current = () => {}
    }
    // Rebuilt when the KEY BINDINGS change, because the keyboard listener closes
    // over them, and when loading finishes so the first round uses saved settings.
    // Not on every settings change: the live handles below cover the rest.
  }, [canvasRef, loading, settings.bindings])

  // Applied live -- these are presentation, so they need no new round.
  useEffect(() => {
    sfxRef.current?.setEnabled(settings.sound)
    sfxRef.current?.setVolume(settings.volume)
  }, [settings.sound, settings.volume])

  useEffect(() => {
    rendererRef.current?.setOptions({ ghost: settings.ghost, colorBlind: settings.colorBlindMode })
  }, [settings.ghost, settings.colorBlindMode])

  useEffect(() => {
    effectsRef.current?.setSmoothHorizontal(settings.smoothHorizontal)
  }, [settings.smoothHorizontal])

  const send = useCallback((cmd: Command) => sendRef.current(cmd), [])
  const restart = useCallback(() => restartRef.current(), [])
  const press = useCallback(
    (a: Command['a']) => {
      sendRef.current({ k: 'press', a })
    },
    [],
  )

  return { hud, send, press, restart }
}
