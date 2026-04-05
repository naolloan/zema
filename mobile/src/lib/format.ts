import type { MobileArtistCredit } from '@/types'

export function formatReleaseType(type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE') {
  return {
    ALBUM: 'Album',
    EP: 'EP',
    SINGLE: 'Song',
    MIXTAPE: 'Mixtape',
  }[type]
}

export function formatArtistCredits(credits: MobileArtistCredit[]) {
  return credits.map((credit) => credit.artist.name).join(', ')
}

export function formatRatingValue(value?: number | null) {
  if (!value) {
    return '0'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export const MOBILE_RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const
