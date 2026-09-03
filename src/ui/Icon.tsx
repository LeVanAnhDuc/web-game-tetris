/**
 * Inline SVG icons, one consistent stroke style. MASTER.md §9 forbids emoji or
 * dingbat glyphs as icons: they recolour badly, size unpredictably, and render
 * differently per platform.
 */

export type IconName =
  | 'pause'
  | 'play'
  | 'sliders'
  | 'left'
  | 'right'
  | 'down'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hardDrop'
  | 'hold'
  | 'restart'
  | 'arrowUp'

const PATHS: Record<IconName, { d: string; filled?: boolean }> = {
  pause: { d: 'M6 4h4v16H6zM14 4h4v16h-4z', filled: true },
  play: { d: 'M7 4l13 8-13 8z', filled: true },
  sliders: {
    d: 'M3 6h18M3 12h18M3 18h18',
  },
  left: { d: 'M19 12H5M12 19l-7-7 7-7' },
  right: { d: 'M5 12h14M12 5l7 7-7 7' },
  down: { d: 'M12 5v14M19 12l-7 7-7-7' },
  rotateCW: { d: 'M22 5v6h-6M19.5 15a8.5 8.5 0 1 1-2-8.8L22 11' },
  rotateCCW: { d: 'M2 5v6h6M4.5 15a8.5 8.5 0 1 0 2-8.8L2 11' },
  hardDrop: { d: 'M7 6l5 5 5-5M7 13l5 5 5-5' },
  hold: { d: 'M3 4h18v5H3zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4' },
  restart: { d: 'M2 5v6h6M4.5 15a8.5 8.5 0 1 0 2-8.8L2 11' },
  arrowUp: { d: 'M12 19V5M5 12l7-7 7 7' },
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const icon = PATHS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={icon.filled ? 'currentColor' : 'none'}
      stroke={icon.filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={icon.d} />
      {name === 'sliders' ? (
        <>
          <circle cx="9" cy="6" r="2.5" />
          <circle cx="15" cy="12" r="2.5" />
          <circle cx="8" cy="18" r="2.5" />
        </>
      ) : null}
    </svg>
  )
}
