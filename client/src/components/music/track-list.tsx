import type { Track } from '@/types'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { formatDuration, formatRatingValue } from '@/lib/utils'
import { ArtistCreditLine } from './artist-credit-line'

interface TrackListProps {
  tracks: Track[]
}

export function TrackList({ tracks }: TrackListProps) {
  if (!tracks.length) {
    return <p className="text-sm text-white/56">Track listing has not been added yet.</p>
  }

  const groupedTracks = tracks.reduce<Map<number, Track[]>>((groups, track, index) => {
    const discNumber = track.discNumber || 1
    const existing = groups.get(discNumber) || []
    existing.push({
      ...track,
      trackNumber: track.trackNumber || index + 1,
    })
    groups.set(discNumber, existing)
    return groups
  }, new Map())

  const orderedDiscs = Array.from(groupedTracks.entries()).sort((a, b) => a[0] - b[0])
  const showDiscHeadings = orderedDiscs.length > 1

  return (
    <div className="space-y-4">
      {orderedDiscs.map(([discNumber, discTracks]) => (
        <div key={`disc-${discNumber}`} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
          {showDiscHeadings ? (
            <div className="border-b border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">Disc {discNumber}</p>
            </div>
          ) : null}
          {discTracks.map((track, index) => (
            <div
              key={track.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/8 px-4 py-4 last:border-b-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-white/68">
                {track.trackNumber || index + 1}
              </div>
              <div>
                <Link href={`/tracks/${track.id}`} className="font-medium text-white transition hover:text-[#ffe082]">
                  {track.title}
                </Link>
                <ArtistCreditLine credits={track.artistCredits} className="mt-1 block text-xs text-white/56" />
              </div>
              <div className="flex items-center gap-3 text-sm text-white/48">
                {typeof track.averageRating === 'number' && (track.ratingCount || 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#f4d35e]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="font-medium">{formatRatingValue(track.averageRating)}</span>
                  </span>
                ) : null}
                <span>{track.duration ? formatDuration(track.duration) : '--:--'}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
