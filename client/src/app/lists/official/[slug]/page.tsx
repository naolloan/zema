import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReleaseCard } from '@/components/music/release-card'
import { getDynamicListDefinition, getOfficialListData } from '@/lib/music-api'

interface OfficialListDetailPageProps {
  params: {
    slug: string
  }
}

export default async function OfficialListDetailPage({ params }: OfficialListDetailPageProps) {
  const definition = getDynamicListDefinition(params.slug)

  if (!definition) {
    notFound()
  }

  const data = definition.status === 'live'
    ? await getOfficialListData(definition, definition.limit)
    : null

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className={`rounded-[2.2rem] border border-white/10 bg-gradient-to-br ${definition.accent} p-[1px] shadow-[0_20px_70px_rgba(0,0,0,0.24)]`}>
        <div className="rounded-[calc(2.2rem-1px)] bg-[#111318]/92 p-8 text-white">
          <Link
            href="/lists/official"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/68 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Official Lists
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-white/48">
            {definition.releaseType === 'ALL' ? 'All Releases' : definition.releaseType}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-white">{definition.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">{definition.description}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/72">{definition.limit} ranked spots</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/72">
              {definition.status === 'live' ? 'Live official list' : 'Planned official list'}
            </span>
          </div>
        </div>
      </section>

      {data?.items?.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <ReleaseCard key={`${definition.slug}-${item.release.id}`} release={item.release} eyebrow={`#${item.rank}`} />
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-8 text-white/64">
          {definition.status === 'planned'
            ? 'This official list structure is now in place, but it needs genre or country metadata support before it can populate automatically.'
            : 'No releases have qualified for this official list yet. It will fill itself in as the community activity grows.'}
        </section>
      )}
    </main>
  )
}
