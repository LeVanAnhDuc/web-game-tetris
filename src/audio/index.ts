import type { GameEvent } from '../engine'

/**
 * Sound effects (FR-17, FR-27).
 *
 * Synthesised with the Web Audio API rather than shipped as files, for two reasons
 * that both come from `overview.md`: the Non-Goals forbid bringing in any
 * copyrighted music, and the infrastructure ceiling is 0d/month, so a handful of
 * oscillators beats a handful of audio assets in the bundle (NFR-PERF-04).
 *
 * The context is created on the first sound, never at load: browsers refuse to start
 * one before a user gesture, and creating a suspended context on every page load is
 * how a tab ends up marked as playing audio while sitting silent.
 */

export interface Sfx {
  /** Turn game events into sound. Silent when muted or unavailable. */
  play(events: readonly GameEvent[]): void
  setEnabled(on: boolean): void
  setVolume(v: number): void
  dispose(): void
}

type Ctor = new () => AudioContext

function audioContextCtor(): Ctor | null {
  const w = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

interface Tone {
  /** Hz. An array is an arpeggio, one step per entry. */
  freq: number | readonly number[]
  /** Seconds. */
  dur: number
  type: OscillatorType
  /** Relative loudness, before the master volume. */
  gain: number
}

/**
 * Deliberately small and dry. These punctuate a fast game; anything with a tail
 * turns a four-piece-per-second stretch into mud.
 */
const TONES = {
  lock: { freq: 180, dur: 0.05, type: 'square', gain: 0.18 },
  rotate: { freq: 420, dur: 0.03, type: 'square', gain: 0.1 },
  hold: { freq: 300, dur: 0.05, type: 'triangle', gain: 0.14 },
  hardDrop: { freq: 120, dur: 0.06, type: 'square', gain: 0.2 },
  single: { freq: [660, 880], dur: 0.09, type: 'square', gain: 0.28 },
  double: { freq: [660, 880, 990], dur: 0.08, type: 'square', gain: 0.3 },
  triple: { freq: [660, 880, 1100, 1320], dur: 0.075, type: 'square', gain: 0.32 },
  tetris: { freq: [523, 659, 784, 1046, 1318], dur: 0.08, type: 'sawtooth', gain: 0.36 },
  spin: { freq: [880, 1174, 1568], dur: 0.08, type: 'triangle', gain: 0.32 },
  levelUp: { freq: [523, 784, 1046], dur: 0.11, type: 'triangle', gain: 0.3 },
  topOut: { freq: [440, 330, 220, 165], dur: 0.16, type: 'sawtooth', gain: 0.3 },
} as const satisfies Record<string, Tone>

type ToneName = keyof typeof TONES

export function createSfx(enabled: boolean, volume: number): Sfx {
  let on = enabled
  let vol = volume
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let broken = false

  function ensure(): boolean {
    if (broken || !on) return false
    if (ctx) {
      // A context can be suspended by the browser when the tab goes away.
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      return true
    }
    const Ctor = audioContextCtor()
    if (!Ctor) {
      broken = true
      return false
    }
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = vol
      master.connect(ctx.destination)
      return true
    } catch {
      // No audio device, or a policy that forbids one. Silence is a fine outcome;
      // failing to start the game is not.
      broken = true
      return false
    }
  }

  function tone(name: ToneName): void {
    if (!ensure() || !ctx || !master) return
    const spec = TONES[name] as Tone
    const freqs = Array.isArray(spec.freq) ? (spec.freq as readonly number[]) : [spec.freq as number]
    const now = ctx.currentTime
    for (let i = 0; i < freqs.length; i++) {
      const start = now + i * spec.dur
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = spec.type
      osc.frequency.setValueAtTime(freqs[i] as number, start)
      // A short attack and an exponential tail: a square wave gated on and off
      // clicks, and a click is what people hear as "cheap".
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(spec.gain, start + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur)
      osc.connect(gain)
      gain.connect(master)
      osc.start(start)
      osc.stop(start + spec.dur + 0.01)
    }
  }

  return {
    play(events) {
      if (!on) return
      for (let i = 0; i < events.length; i++) {
        const ev = events[i] as GameEvent
        switch (ev.t) {
          case 'clear':
            // A T-spin gets its own sound: it is the thing worth telling the player
            // they did, and the row count alone does not say it.
            if (ev.spin !== 'none') tone('spin')
            else if (ev.rows >= 4) tone('tetris')
            else if (ev.rows === 3) tone('triple')
            else if (ev.rows === 2) tone('double')
            else tone('single')
            break
          case 'levelUp':
            tone('levelUp')
            break
          case 'topOut':
            tone('topOut')
            break
          case 'hardDrop':
            if (ev.cells > 0) tone('hardDrop')
            break
          case 'lock':
            tone('lock')
            break
          case 'rotate':
            tone('rotate')
            break
          case 'hold':
            tone('hold')
            break
          default:
            break
        }
      }
    },

    setEnabled(next) {
      on = next
      if (!next && ctx) void ctx.suspend().catch(() => {})
      if (next && ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
    },

    setVolume(v) {
      vol = Math.min(1, Math.max(0, v))
      if (master) master.gain.value = vol
    },

    dispose() {
      if (ctx) void ctx.close().catch(() => {})
      ctx = null
      master = null
    },
  }
}
