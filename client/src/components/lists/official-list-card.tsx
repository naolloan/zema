import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { CoverArt } from '@/components/music/cover-art'
import type { DynamicListDefinition, Release } from '@/types'

interface OfficialListCardProps {
  definition: DynamicListDefinition
  previewReleases?: Release[]
}

function OfficialListPreview({ definition, previewReleases = [] }: OfficialListCardProps) {
  if (!previewReleases.length) {
    return (
      <div className={`flex aspect-[1.6/1] items-center justify-center rounded-[1.3rem] bg-gradient-to-br ${definition.accent} p-[1px]`}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-[calc(1.3rem-1px)] bg-[#121821]/92 text-center text-white/72">
          <BookOpen className="h-7 w-7 text-[#f4d35e]" />
          <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]">
            {definition.status === 'live' ? 'Updating live' : 'Coming soon'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid aspect-[1.6/1] grid-cols-2 gap-1.5 overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#0d121a] p-1.5">
      {Array.from({ length: 4 }, (_, index) => previewReleases[index] || null).map((release, index) => (
        <div key={release?.id || `official-preview-${index}`} className="overflow-hidden rounded-[0.85rem] bg-white/[0.04]">
          {release ? (
            <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="h-full rounded-[0.85rem]" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${definition.accent} opacity-55`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function OfficialListCard({ definition, previewReleases = [] }: OfficialListCardProps) {
  return (
    <Link
      href={`/lists/official/${definition.slug}`}
      className={`rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${definition.accent} p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.2)] transition hover:-translate-y-1`}
    >
      <div className="flex h-full flex-col justify-between rounded-[calc(1.8rem-1px)] bg-[linear-gradient(180deg,rgba(18,24,34,0.94),rgba(10,14,21,0.86))] p-5">
        <OfficialListPreview definition={definition} previewReleases={previewReleases} />
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
              {definition.limit} • {definition.releaseType === 'ALL' ? 'All Releases' : definition.releaseType}
            </p>
            <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
              definition.status === 'live'
                ? 'bg-[#8ecae6]/14 text-[#8ecae6]'
                : 'bg-white/10 text-white/65'
            }`}>
              {definition.status === 'live' ? 'Live' : 'Coming Soon'}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white">{definition.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/64">{definition.description}</p>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#f4d35e]">
          Open List
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
