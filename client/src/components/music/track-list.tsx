import type { Track } from '@/types'
import { formatDuration } from '@/lib/utils'
import { ArtistCreditLine } from './artist-credit-line'

interface TrackListProps {
  tracks: Track[]
}

export function TrackList({ tracks }: TrackListProps) {
  if (!tracks.length) {
    return <p className="text-sm text-white/56">Track listing has not been added yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/8 px-4 py-4 last:border-b-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-white/68">
            {track.trackNumber || index + 1}
          </div>
          <div>
            <p className="font-medium text-white">{track.title}</p>
            <ArtistCreditLine credits={track.artistCredits} className="mt-1 block text-xs text-white/56" />
          </div>
          <div className="text-sm text-white/48">{track.duration ? formatDuration(track.duration) : '--:--'}</div>
        </div>
      ))}
    </div>
  )
}
