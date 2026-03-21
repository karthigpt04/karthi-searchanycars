import { useState, useEffect, useCallback, useRef } from 'react'

interface PriceRangeSliderProps {
  min: number
  max: number
  valueMin: string
  valueMax: string
  onChangeMin: (val: string) => void
  onChangeMax: (val: string) => void
  /** Theme: 'light' for normal search, 'dark' for splus, 'dark-green' for spn */
  theme?: 'light' | 'dark' | 'dark-green'
}

const formatLabel = (val: number): string => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(val % 10000000 === 0 ? 0 : 1)}Cr`
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`
  return `₹${val}`
}

// Convert value to slider position (0-1000) using sqrt scale for better low-range precision
const toSlider = (val: number, min: number, max: number): number => {
  if (val <= min) return 0
  if (val >= max) return 1000
  const ratio = (val - min) / (max - min)
  return Math.round(Math.sqrt(ratio) * 1000)
}

// Convert slider position back to value
const fromSlider = (pos: number, min: number, max: number): number => {
  const ratio = (pos / 1000) ** 2
  return Math.round(min + ratio * (max - min))
}

// Snap to nearest "nice" number
const snapToNice = (val: number): number => {
  if (val <= 0) return 0
  if (val < 50000) return Math.round(val / 10000) * 10000
  if (val < 500000) return Math.round(val / 25000) * 25000
  if (val < 5000000) return Math.round(val / 100000) * 100000
  if (val < 50000000) return Math.round(val / 500000) * 500000
  return Math.round(val / 10000000) * 10000000
}

export const PriceRangeSlider = ({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  theme = 'light',
}: PriceRangeSliderProps) => {
  const numMin = Number(valueMin) || min
  const numMax = Number(valueMax) || max

  const [sliderMin, setSliderMin] = useState(() => toSlider(numMin, min, max))
  const [sliderMax, setSliderMax] = useState(() => toSlider(numMax, min, max))
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Sync slider from external value changes (e.g. preset buttons, typed input)
  useEffect(() => {
    if (!dragging) {
      setSliderMin(toSlider(Number(valueMin) || min, min, max))
      setSliderMax(toSlider(Number(valueMax) || max, min, max))
    }
  }, [valueMin, valueMax, min, max, dragging])

  const getPositionFromEvent = useCallback(
    (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): number => {
      const track = trackRef.current
      if (!track) return 0
      const rect = track.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(ratio * 1000)
    },
    [],
  )

  const commitValue = useCallback(
    (which: 'min' | 'max', pos: number) => {
      const raw = fromSlider(pos, min, max)
      const snapped = snapToNice(raw)
      if (which === 'min') {
        onChangeMin(snapped <= min ? '' : String(snapped))
      } else {
        onChangeMax(snapped >= max ? '' : String(snapped))
      }
    },
    [min, max, onChangeMin, onChangeMax],
  )

  // Mouse/touch drag handlers
  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPositionFromEvent(e)
      if (dragging === 'min') {
        setSliderMin(Math.min(pos, sliderMax - 10))
      } else {
        setSliderMax(Math.max(pos, sliderMin + 10))
      }
    }

    const onUp = (e: MouseEvent | TouchEvent) => {
      const pos = getPositionFromEvent(e)
      if (dragging === 'min') {
        const finalPos = Math.min(pos, sliderMax - 10)
        setSliderMin(finalPos)
        commitValue('min', finalPos)
      } else {
        const finalPos = Math.max(pos, sliderMin + 10)
        setSliderMax(finalPos)
        commitValue('max', finalPos)
      }
      setDragging(null)
    }

    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, sliderMin, sliderMax, getPositionFromEvent, commitValue])

  const leftPct = (sliderMin / 1000) * 100
  const rightPct = 100 - (sliderMax / 1000) * 100
  const displayMin = snapToNice(fromSlider(sliderMin, min, max))
  const displayMax = snapToNice(fromSlider(sliderMax, min, max))

  const isDark = theme === 'dark' || theme === 'dark-green'
  const accentColor = theme === 'dark-green' ? 'var(--spn-accent, #00C9A7)' : isDark ? 'var(--sp-gold, #d4a853)' : 'var(--navy, #1a2744)'
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : '#e0e4ea'
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary, #555)'

  const themeClass = `price-slider-wrapper price-slider--${theme}`

  return (
    <div className={themeClass}>
      <div className="price-slider-header">
        <span className="price-slider-title" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#888' }}>Price Range</span>
        <div className="price-slider-values" style={{ color: isDark ? '#fff' : 'var(--navy, #1a2744)' }}>
          <span>{displayMin <= min ? formatLabel(min) : formatLabel(displayMin)}</span>
          <span className="price-slider-values-sep" style={{ color: labelColor }}> — </span>
          <span>{displayMax >= max ? formatLabel(max) : formatLabel(displayMax)}</span>
        </div>
      </div>
      <div className="price-slider-track-area">
        <div
          ref={trackRef}
          className="price-slider-track"
          style={{ background: trackBg }}
          onMouseDown={(e) => {
            const pos = getPositionFromEvent(e)
            if (Math.abs(pos - sliderMin) < Math.abs(pos - sliderMax)) {
              setSliderMin(pos)
              setDragging('min')
            } else {
              setSliderMax(pos)
              setDragging('max')
            }
          }}
          onTouchStart={(e) => {
            const pos = getPositionFromEvent(e)
            if (Math.abs(pos - sliderMin) < Math.abs(pos - sliderMax)) {
              setSliderMin(pos)
              setDragging('min')
            } else {
              setSliderMax(pos)
              setDragging('max')
            }
          }}
        >
          <div
            className="price-slider-fill"
            style={{
              left: `${leftPct}%`,
              right: `${rightPct}%`,
              background: accentColor,
            }}
          />
          <div
            className={`price-slider-thumb${dragging === 'min' ? ' is-dragging' : ''}`}
            style={{ left: `${leftPct}%`, '--accent': accentColor } as React.CSSProperties}
            onMouseDown={(e) => { e.stopPropagation(); setDragging('min') }}
            onTouchStart={(e) => { e.stopPropagation(); setDragging('min') }}
          />
          <div
            className={`price-slider-thumb${dragging === 'max' ? ' is-dragging' : ''}`}
            style={{ left: `${100 - rightPct}%`, '--accent': accentColor } as React.CSSProperties}
            onMouseDown={(e) => { e.stopPropagation(); setDragging('max') }}
            onTouchStart={(e) => { e.stopPropagation(); setDragging('max') }}
          />
        </div>
      </div>
      <div className="price-slider-labels" style={{ color: labelColor }}>
        <span>{formatLabel(min)}</span>
        <span>{formatLabel(max)}</span>
      </div>
    </div>
  )
}
