'use client'

import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { formatRatingValue, RATING_VALUES } from '@/lib/utils'

const MOBILE_HINT_KEY = 'zema-rating-picker-mobile-hint-dismissed'

interface RatingPickerProps {
  value?: number | null
  loadingValue?: number | null
  onRate: (value: number) => void
  onClear?: () => void
  className?: string
}

export function RatingPicker({ value, loadingValue = null, onRate, onClear, className }: RatingPickerProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [showMobileHint, setShowMobileHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const hasDismissed = window.localStorage.getItem(MOBILE_HINT_KEY) === 'true'
    const prefersTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
    setShowMobileHint(prefersTouch && !hasDismissed)
  }, [])

  function dismissMobileHint() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MOBILE_HINT_KEY, 'true')
    }
    setShowMobileHint(false)
  }

  function handleRate(value: number) {
    dismissMobileHint()
    onRate(value)
  }

  const displayedRating = hoveredRating ?? value ?? 0
  const displayedWidth = `${(displayedRating / 5) * 100}%`
  const ratingSummaryLabel = hoveredRating !== null
    ? `Preview ${formatRatingValue(hoveredRating)}`
    : value
      ? `${formatRatingValue(value)} / 5`
      : 'No rating yet'
  const ratingLabel = hoveredRating !== null
    ? `Click to rate ${formatRatingValue(hoveredRating)} stars`
    : value
      ? `Your current rating: ${formatRatingValue(value)} stars`
      : 'Hover over the stars to choose a half or full rating'

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-white/62">Your rating</p>
        <div className={hoveredRating !== null ? 'rounded-full border border-[#8ecae6]/35 bg-[#8ecae6]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#c8f1ff]' : value ? 'rounded-full border border-[#f4d35e]/30 bg-[#f4d35e]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8e7a2]' : 'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/45'}>
          {ratingSummaryLabel}
        </div>
      </div>
      <div className="space-y-3">
        <div
          className="relative inline-flex"
          onMouseLeave={() => setHoveredRating(null)}
        >
          <div className="flex gap-1 text-white/18 transition-transform duration-150 ease-out">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={`base-${index}`}
                className={displayedRating > index ? 'h-8 w-8 fill-current text-white/28 transition-all duration-150 ease-out' : 'h-8 w-8 fill-current text-white/16 transition-all duration-150 ease-out'}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden transition-[width] duration-150 ease-out"
            style={{ width: displayedWidth }}
          >
            <div className={hoveredRating !== null ? 'flex gap-1 text-[#8ecae6]' : 'flex gap-1 text-[#f4d35e]'}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={`fill-${index}`} className="h-8 w-8 fill-current drop-shadow-[0_0_12px_rgba(244,211,94,0.2)] transition-all duration-150 ease-out" />
              ))}
            </div>
          </div>
          {loadingValue === null ? (
            <div className="absolute inset-0 grid grid-cols-10">
              {RATING_VALUES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={`Rate ${formatRatingValue(item)} stars`}
                  title={`${formatRatingValue(item)} stars`}
                  onMouseEnter={() => setHoveredRating(item)}
                  onFocus={() => setHoveredRating(item)}
                  onClick={() => handleRate(item)}
                  className="h-8 w-full cursor-pointer rounded-sm outline-none transition hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-[#8ecae6]/55"
                />
              ))}
            </div>
          ) : null}
          {loadingValue !== null ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#111318]/68">
              <BrandLoader className="h-5 w-auto" />
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-white/32">
          <span>0.5</span>
          <span>5</span>
        </div>
        {showMobileHint ? (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#8ecae6]/18 bg-[#8ecae6]/10 px-4 py-3 text-sm text-[#d4f5ff]">
            <p>Tap the left side of a star for a half-step and the right side for a full star.</p>
            <button
              type="button"
              onClick={dismissMobileHint}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Dismiss rating hint"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/60">{showMobileHint && !value && hoveredRating === null ? 'Tap the stars to choose a half or full rating' : ratingLabel}</p>
          {value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={loadingValue !== null}
              className="text-sm font-semibold text-[#8ecae6] transition hover:text-[#b7e8fb] disabled:opacity-60"
            >
              Clear rating
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
