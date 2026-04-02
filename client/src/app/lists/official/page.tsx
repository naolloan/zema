import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { OfficialListCard } from '@/components/lists/official-list-card'
import { getDynamicListDefinitions, getOfficialListData } from '@/lib/music-api'

export default async function OfficialListsPage() {
  const definitions = getDynamicListDefinitions()
  const liveLists = definitions.filter((definition) => definition.status === 'live')
  const genreLists = definitions.filter((definition) => definition.section === 'genre')
  const regionLists = definitions.filter((definition) => definition.section === 'region')
  const livePreviews = await Promise.all(
    liveLists.map(async (definition) => ({
      slug: definition.slug,
      releases: (await getOfficialListData(definition, 4))?.items.map((item) => item.release) || [],
    })),
  )
  const livePreviewMap = new Map(livePreviews.map((entry) => [entry.slug, entry.releases]))

  function renderListGrid(items: typeof definitions) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((definition) => (
          <OfficialListCard
            key={definition.slug}
            definition={definition}
            previewReleases={livePreviewMap.get(definition.slug) || []}
          />
        ))}
      </div>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(244,211,94,0.18),_transparent_28%),linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.04))] p-8 text-white shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#f4d35e]">
          <Sparkles className="h-4 w-4" />
          Official Lists
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">The platform’s own discovery shelves.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
          Think of these as Zema’s own list shelf. They sit alongside user lists, but they update dynamically as ratings, reviews, and community momentum change.
        </p>
      </section>

      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Live Official Lists</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">The lists you can browse right now.</h2>
        </div>
        <div className="mt-6">{renderListGrid(liveLists)}</div>
      </section>

      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">By Genre</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Official lists queued for genre-aware charting.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
            These list ideas are part of the structure now. They will go live once the catalog has reliable genre metadata.
          </p>
        </div>
        <div className="mt-6">{renderListGrid(genreLists)}</div>
      </section>

      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">By Country And Region</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Regional official lists planned next.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
            Once country and region metadata is wired into charting, these lists will start behaving like the live official lists above.
          </p>
        </div>
        <div className="mt-6">{renderListGrid(regionLists)}</div>
      </section>
    </main>
  )
}
