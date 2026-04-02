import Link from 'next/link'
import { BookOpen, Heart, Library, MessageSquare, Star, Users } from 'lucide-react'
import { CoverArt } from '@/components/music/cover-art'
import { HomeHeroActions, HomeSidebarActions } from '@/components/home/home-auth-cta'
import { formatDate, truncateText } from '@/lib/utils'
import { getRecentReviews, getTopReleases } from '@/lib/music-api'

const featurePanels = [
  {
    title: 'Write and share reviews',
    description: 'Keep the same review, diary, and reaction tools you already have, but surface them from a stronger public front door.',
    icon: MessageSquare,
  },
  {
    title: 'Build lists, likes, and favorites',
    description: 'Curate mixed lists, like releases freely, and shape your profile with favorite albums, songs, and artists.',
    icon: Library,
  },
  {
    title: 'Follow people with taste',
    description: 'See what friends are listening to, whose reviews are resonating, and which records are bubbling up this week.',
    icon: Users,
  },
]

const quickActions = [
  {
    title: 'Log the records you love',
    description: 'Albums, EPs, songs, and mixtapes all live in one diary-driven workflow.',
    icon: BookOpen,
  },
  {
    title: 'Rate, like, and discuss',
    description: 'Community ratings and review activity keep the homepage alive instead of static.',
    icon: Heart,
  },
  {
    title: 'Find the next obsession',
    description: 'Jump from charts to discographies to reviews without changing how the app works.',
    icon: Star,
  },
]

function buildBackdropStyle(imageUrl?: string | null) {
  if (!imageUrl) {
    return {
      background:
        'radial-gradient(circle at top left, rgba(46, 117, 148, 0.28), transparent 34%), radial-gradient(circle at top right, rgba(241, 135, 42, 0.22), transparent 28%), linear-gradient(180deg, rgba(10, 14, 21, 0.94), rgba(10, 14, 21, 0.9))',
    }
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(8,12,18,0.28), rgba(8,12,18,0.92) 72%), url("${imageUrl}")`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  }
}

export default async function Home() {
  const [heroChart, albumChart, songChart, recentReviewsEnvelope] = await Promise.all([
    getTopReleases(undefined, 8),
    getTopReleases('ALBUM', 12),
    getTopReleases('SINGLE', 10),
    getRecentReviews(5, 0),
  ])

  const heroItems = heroChart?.items ?? []
  const albumItems = albumChart?.items ?? []
  const songItems = songChart?.items ?? []
  const recentReviews = recentReviewsEnvelope?.data ?? []
  const heroRelease = heroItems[0]?.release
  const sidebarReleases = heroItems.slice(0, 4).map((item) => item.release)

  return (
    <main className="bg-[#0a0e15] text-white">
      <section className="border-b border-white/8">
        <div
          className="relative overflow-hidden"
          style={buildBackdropStyle(heroRelease?.artworkUrl)}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(142,202,230,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,211,94,0.12),transparent_24%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <h1 className="mx-auto max-w-4xl text-center text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Track records you have heard. Save those you want to revisit. Tell your friends what is worth pressing play on.
            </h1>
            <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div className="max-w-3xl">
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/74 sm:text-lg">
                  Keep the same reviews, lists, favorites, artist pages, and release discovery tools you already built, now framed as a stronger public-facing social music home.
                </p>
                <HomeHeroActions />
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <span>Albums</span>
                  <span>EPs</span>
                  <span>Singles</span>
                  <span>Mixtapes</span>
                  <span>Reviews</span>
                  <span>Lists</span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.82),rgba(14,18,26,0.62))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#8ecae6]">Now lighting up the charts</p>
                  {heroRelease ? (
                    <div className="mt-4 flex items-center gap-4">
                      <div className="w-24 shrink-0">
                        <CoverArt title={heroRelease.title} artworkUrl={heroRelease.artworkUrl} className="rounded-[1.2rem]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">{heroRelease.title}</h2>
                        <p className="mt-1 text-sm text-white/68">
                          {heroRelease.artistCredits[0]?.artist.name || heroRelease.artist.name}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-white/55">
                          <span className="rounded-full bg-[#f4d35e]/14 px-3 py-1 text-[#f4d35e]">{heroRelease.type}</span>
                          {typeof heroItems[0]?.averageRating === 'number' ? (
                            <span className="rounded-full bg-white/8 px-3 py-1">
                              {heroItems[0].averageRating.toFixed(1)} avg
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-white/64">The chart highlight will appear here as soon as release data loads.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {heroItems.length ? (
                heroItems.map(({ release }) => (
                  <Link key={release.id} href={`/releases/${release.id}`} className="group block">
                    <CoverArt
                      title={release.title}
                      artworkUrl={release.artworkUrl}
                      className="rounded-[1rem] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_22px_40px_rgba(0,0,0,0.28)]"
                    />
                  </Link>
                ))
              ) : (
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-square rounded-[1rem] border border-white/8 bg-white/[0.04]" />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        {featurePanels.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-[0.35rem] border border-white/10 bg-[#2a3440]/58 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-[#c7d5e0]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/70">{description}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-white/8 bg-[#0d131c]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/45">This Week’s Standouts</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Popular albums right now</h2>
                </div>
                <Link href="/lists/official" className="text-sm font-medium text-[#8ecae6] transition hover:text-[#d0effa]">
                  See official lists
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {albumItems.slice(0, 12).map(({ release }) => (
                  <Link key={release.id} href={`/releases/${release.id}`} className="group block">
                    <CoverArt
                      title={release.title}
                      artworkUrl={release.artworkUrl}
                      className="rounded-[0.9rem] transition duration-200 group-hover:-translate-y-1"
                    />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4d35e]">Quick Start</p>
              <div className="mt-4 space-y-4">
                {quickActions.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="rounded-[1rem] bg-[#101720] p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-[#f4d35e]" />
                      <h3 className="text-sm font-semibold text-white">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#8ecae6]">From The Community</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Recent reviews</h2>
              </div>
              <Link href="/reviews" className="text-sm font-medium text-[#f4d35e] transition hover:text-[#ffe082]">
                Browse all reviews
              </Link>
            </div>

            <div className="mt-6 space-y-5">
              {recentReviews.length ? (
                recentReviews.map((review) => (
                  <article key={review.id} className="grid gap-4 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 sm:grid-cols-[4.8rem_1fr]">
                    <Link href={`/releases/${review.release.id}`} className="block">
                      <CoverArt title={review.release.title} artworkUrl={review.release.artworkUrl} className="rounded-[0.95rem]" />
                    </Link>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <Link href={`/users/${review.user.id}`} className="font-semibold text-white transition hover:text-[#ffe082]">
                          {review.user.displayName || review.user.username}
                        </Link>
                        <span className="text-white/38">{formatDate(review.createdAt)}</span>
                        <span className="rounded-full bg-[#111318]/76 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[#8ecae6]">
                          {review.release.type}
                        </span>
                      </div>
                      <Link href={`/releases/${review.release.id}`} className="mt-2 block text-lg font-semibold text-white transition hover:text-[#8ecae6]">
                        {review.release.title}
                      </Link>
                      <p className="mt-2 text-sm leading-7 text-white/72">{truncateText(review.content, 220)}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                        <span>{review.likesCount} likes</span>
                        <span>{review.comments.length} comments</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/64">
                  Reviews will appear here once the community starts writing.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[1.5rem] border border-white/10 bg-[#101720] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4d35e]">Popular Songs</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Singles climbing fast</h2>
                </div>
                <Link href="/releases" className="text-sm font-medium text-[#8ecae6] transition hover:text-[#d0effa]">
                  Open releases
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {songItems.slice(0, 5).map(({ release }, index) => (
                  <Link
                    key={release.id}
                    href={`/releases/${release.id}`}
                    className="flex items-center gap-3 rounded-[1rem] bg-white/[0.04] p-3 transition hover:bg-white/[0.07]"
                  >
                    <span className="w-6 text-sm font-semibold text-white/45">{index + 1}</span>
                    <div className="w-12 shrink-0">
                      <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="rounded-[0.75rem]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{release.title}</p>
                      <p className="truncate text-xs text-white/55">{release.artistCredits[0]?.artist.name || release.artist.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/45">Popular This Week</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {sidebarReleases.length ? (
                  sidebarReleases.map((release) => (
                    <Link key={release.id} href={`/releases/${release.id}`} className="block">
                      <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="rounded-[0.75rem]" />
                    </Link>
                  ))
                ) : (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="aspect-square rounded-[0.75rem] border border-white/10 bg-white/[0.04]" />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(142,202,230,0.09),rgba(255,255,255,0.03))] p-5">
              <HomeSidebarActions />
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
