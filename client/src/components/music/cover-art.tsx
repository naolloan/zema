import { getApiAssetFallback } from '@/lib/music-api'
import { BrandMark } from '@/components/brand/brand-logo'
import { cn } from '@/lib/utils'

interface CoverArtProps {
  title: string
  artworkUrl?: string | null
  className?: string
}

export function CoverArt({ title, artworkUrl, className }: CoverArtProps) {
  if (artworkUrl) {
    return (
      <img
        src={artworkUrl}
        alt={`${title} cover art`}
        className={cn('aspect-square w-full rounded-[1.5rem] object-cover shadow-2xl shadow-black/20', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'aspect-square w-full rounded-[1.5rem] bg-gradient-to-br p-[1px] shadow-2xl shadow-black/20',
        getApiAssetFallback(title),
        className,
      )}
    >
      <div className="flex h-full w-full items-center justify-center rounded-[calc(1.5rem-1px)] bg-[#171a20] text-white/74">
        <BrandMark className="h-12 w-auto opacity-95" />
      </div>
    </div>
  )
}
