import Link from 'next/link'
import type { ArtistCredit } from '@/types'
import { cn } from '@/lib/utils'

interface ArtistCreditLineProps {
  credits: ArtistCredit[]
  className?: string
}

export function ArtistCreditLine({ credits, className }: ArtistCreditLineProps) {
  if (!credits?.length) {
    return <span className={cn('text-white/60', className)}>Unknown artist</span>
  }

  return (
    <span className={cn('text-sm text-white/70', className)}>
      {credits.map((credit, index) => (
        <span key={credit.id}>
          <Link href={`/artists/${credit.artist.id}`} className="transition hover:text-white">
            {credit.artist.name}
          </Link>
          {credit.joinPhrase ? ` ${credit.joinPhrase}` : index < credits.length - 1 ? ', ' : ''}
        </span>
      ))}
    </span>
  )
}
