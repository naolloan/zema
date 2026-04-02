import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/brand/brand-logo'
import { OfficialListCard } from '@/components/lists/official-list-card'
import { ReleaseCard } from '@/components/music/release-card'
import { ReleaseBrowser } from '@/components/music/release-browser'
import { ReviewCard } from '@/components/music/review-card'
import { UserAvatar } from '@/components/profile/user-avatar'
import { getDynamicListDefinitions, getOfficialListData, getRecentReviews, getTopReleases } from '@/lib/music-api'
import type { Release, Review, User } from '@/types'

function isWithinLastDays(isoDate: string, days: number) {
  const boundary = new Date()
  boundary.setDate(boundary.getDate() - days)
  return new Date(isoDate) >= boundary
}

function dedupeReleasesById(releases: Release[]) {
  const seen = new Set<string>()
  return releases.filter((release) => {
    if (seen.has(release.id)) {
      return false
    }

    seen.add(release.id)
    return true
  })
}

function buildWeeklyTypeReleases(reviews: Review[], type: Release['type'], limit = 4) {
  const grouped = new Map<string, { release: Release; mentions: number; likes: number }>()

  for (const review of reviews) {
    if (review.release.type !== type) {
      continue
    }

    const current = grouped.get(review.release.id)
    if (current) {
      current.mentions += 1
      current.likes += review.likesCount
    } else {
      grouped.set(review.release.id, {
        release: review.release,
        mentions: 1,
        likes: review.likesCount,
      })
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.mentions - a.mentions || b.likes - a.likes || a.release.title.localeCompare(b.release.title))
    .slice(0, limit)
    .map((entry) => entry.release)
}

function buildPopularReviewers(reviews: Review[], limit = 4) {
  const grouped = new Map<string, { user: User; reviewsCount: number; likesCount: number }>()

  for (const review of reviews) {
    const current = grouped.get(review.user.id)
    if (current) {
      current.reviewsCount += 1
      current.likesCount += review.likesCount
    } else {
      grouped.set(review.user.id, {
        user: review.user,
        reviewsCount: 1,
        likesCount: review.likesCount,
      })
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.likesCount - a.likesCount || b.reviewsCount - a.reviewsCount || a.user.username.localeCompare(b.user.username))
    .slice(0, limit)
}

export default async function ReleasesPage() {
  const officialLists = getDynamicListDefinitions().filter((definition) => definition.status === 'live')
  const featuredOfficialLists = officialLists.slice(0, 6)
  const [albums, songs, eps, mixtapes, recentReviewsResponse] = await Promise.all([
    getTopReleases('ALBUM', 4),
    getTopReleases('SINGLE', 4),
    getTopReleases('EP', 4),
    getTopReleases('MIXTAPE', 4),
    getRecentReviews(40, 0),
  ])
  const officialListPreviewPayloads = await Promise.all(
    featuredOfficialLists.map(async (definition) => ({
      slug: definition.slug,
      releases: (await getOfficialListData(definition, 4))?.items.map((item) => item.release) || [],
    })),
  )
  const officialListPreviewMap = new Map(officialListPreviewPayloads.map((entry) => [entry.slug, entry.releases]))
  const recentReviews = recentReviewsResponse?.data || []
  const weeklyReviews = recentReviews.filter((review) => isWithinLastDays(review.createdAt, 7))
  const justReviewedReleases = dedupeReleasesById(recentReviews.map((review) => review.release)).slice(0, 6)
  const popularReviewsThisWeek = [...weeklyReviews]
    .sort((a, b) => b.likesCount - a.likesCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
  const popularReviewers = buildPopularReviewers(weeklyReviews, 4)
  const browseSeedReleases = dedupeReleasesById([
    ...(albums?.items.map((item) => item.release) || []),
    ...(songs?.items.map((item) => item.release) || []),
    ...(eps?.items.map((item) => item.release) || []),
    ...(mixtapes?.items.map((item) => item.release) || []),
    ...justReviewedReleases,
  ])
  const weeklyTypeSections = [
    { title: 'Albums', releases: buildWeeklyTypeReleases(weeklyReviews, 'ALBUM', 4), href: '/lists/official/popular-this-week' },
    { title: 'Songs', releases: buildWeeklyTypeReleases(weeklyReviews, 'SINGLE', 4), href: '/lists/official/popular-this-week' },
    { title: 'EPs', releases: buildWeeklyTypeReleases(weeklyReviews, 'EP', 4), href: '/lists/official/popular-this-week' },
    { title: 'Mixtapes', releases: buildWeeklyTypeReleases(weeklyReviews, 'MIXTAPE', 4), href: '/lists/official/popular-this-week' },
  ]

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(142,202,230,0.14),_transparent_24%),linear-gradient(145deg,_rgba(20,26,36,0.92),_rgba(10,14,21,0.76))] p-8 text-white shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#f4d35e]">
          <BrandMark className="h-5 w-auto" />
          Releases
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Browse the records the community is shaping in real time.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
          This is the release-side home for Zema: charts, official lists, and direct entry points into albums, songs, EPs, and mixtapes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/lists/official"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]"
          >
            Browse Official Lists
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.1]"
          >
            Search Releases
          </Link>
        </div>
      </section>

      <ReleaseBrowser seedReleases={browseSeedReleases} />

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">
              <Sparkles className="h-4 w-4" />
              Official Lists
            </p>
            <h2 className="mt-3 text-4xl font-semibold text-white">Platform-run release lists.</h2>
          </div>
          <Link href="/lists/official" className="text-sm font-semibold text-[#f4d35e] transition hover:text-[#ffe082]">
            View all
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredOfficialLists.map((definition) => (
            <OfficialListCard
              key={definition.slug}
              definition={definition}
              previewReleases={officialListPreviewMap.get(definition.slug) || []}
            />
          ))}
        </div>
      </section>

      <section id="popular-this-week" className="grid gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Popular This Week</p>
          <h2 className="mt-2 text-4xl font-semibold text-white">Separated by release type.</h2>
        </div>
        {weeklyTypeSections.map((section) => (
          <div key={section.title}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">{section.title}</p>
                <h3 className="mt-2 text-3xl font-semibold text-white">{section.title} catching fire this week</h3>
              </div>
              <Link href={section.href} className="text-sm font-semibold text-[#f4d35e] transition hover:text-[#ffe082]">
                Open weekly list
              </Link>
            </div>
            {section.releases.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {section.releases.map((release, index) => (
                  <ReleaseCard key={`${section.title}-${release.id}`} release={release} eyebrow={`Week ${index + 1}`} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] p-6 text-white/60">
                Not enough review activity this week to surface {section.title.toLowerCase()} yet.
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-8">
        {[
          { title: 'Top Album Releases', chart: albums, href: '/lists/official/top-250-albums', eyebrow: 'Albums' },
          { title: 'Top Songs Right Now', chart: songs, href: '/lists/official/top-250-songs', eyebrow: 'Songs' },
          { title: 'Top EP Releases', chart: eps, href: '/lists/official/top-250-eps', eyebrow: 'EPs' },
          { title: 'Top Mixtape Releases', chart: mixtapes, href: '/lists/official/top-250-mixtapes', eyebrow: 'Mixtapes' },
        ].map((section) => (
          <div key={section.title}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">{section.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{section.title}</h2>
              </div>
              <Link href={section.href} className="text-sm font-semibold text-[#8ecae6] transition hover:text-white">
                Open top 250
              </Link>
            </div>
            {section.chart?.items?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {section.chart.items.map((item) => (
                  <ReleaseCard key={`${section.title}-${item.release.id}`} release={item.release} eyebrow={`#${item.rank}`} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] p-6 text-white/60">
                This chart needs a little more rating activity before it fills out.
              </div>
            )}
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Just Reviewed</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Freshly discussed releases.</h2>
          </div>
          <Link href="/reviews" className="text-sm font-semibold text-[#f4d35e] transition hover:text-[#ffe082]">
            Open reviews
          </Link>
        </div>
        {justReviewedReleases.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {justReviewedReleases.map((release) => (
              <ReleaseCard key={`just-reviewed-${release.id}`} release={release} eyebrow="Just Reviewed" />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] p-6 text-white/60">
            No recently reviewed releases yet.
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Popular Reviews This Week</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">The writing earning the most love.</h2>
          </div>
          <Link href="/reviews" className="text-sm font-semibold text-[#8ecae6] transition hover:text-white">
            Browse all reviews
          </Link>
        </div>
        {popularReviewsThisWeek.length ? (
          <div className="space-y-4">
            {popularReviewsThisWeek.map((review) => (
              <ReviewCard key={`weekly-review-${review.id}`} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/60">
            This week has not produced any standout popular reviews yet.
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Popular Reviewers</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Writers gaining the most traction this week.</h2>
          </div>
          <Link href="/reviews" className="text-sm font-semibold text-[#f4d35e] transition hover:text-[#ffe082]">
            See community reviews
          </Link>
        </div>
        {popularReviewers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {popularReviewers.map((entry) => (
              <Link
                key={`reviewer-${entry.user.id}`}
                href={`/users/${entry.user.id}`}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-[#8ecae6]/24"
              >
                <UserAvatar user={entry.user} className="h-16 w-16" textClassName="text-lg" />
                <h3 className="mt-4 text-xl font-semibold text-white">{entry.user.displayName || entry.user.username}</h3>
                <p className="mt-1 text-sm text-white/56">@{entry.user.username}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-white/48">
                  <span className="rounded-full bg-white/8 px-2.5 py-1">{entry.reviewsCount} reviews</span>
                  <span className="rounded-full bg-[#f4d35e]/12 px-2.5 py-1 text-[#f4d35e]">{entry.likesCount} likes</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/60">
            No reviewer momentum has formed yet this week.
          </div>
        )}
      </section>
    </main>
  )
}
