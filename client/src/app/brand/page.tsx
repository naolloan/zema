import { BrandMark, BrandWordmark, type BrandVariant } from '@/components/brand/brand-logo'

const variants: Array<{
  id: BrandVariant
  title: string
  description: string
}> = [
  {
    id: 'closer',
    title: 'Closer To Your Original',
    description: 'Keeps the most direct resemblance to your generated logo: bright, familiar, and app-icon friendly.',
  },
  {
    id: 'premium',
    title: 'Premium Editorial',
    description: 'More restrained and polished, with richer tones and smoother note heads for a slightly more mature brand feel.',
  },
  {
    id: 'ethiopian',
    title: 'Subtle Ethiopian Touch',
    description: 'Keeps the three-circle concept but adds light melodic line details and warmer accent colors for a more rooted identity.',
  },
]

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-[#0b0f16] px-6 py-12 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8ecae6]">Brand Study</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[0.08em] text-white sm:text-5xl">
            Three directions for <BrandWordmark className="font-bold text-white" />
          </h1>
          <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg">
            This page compares the three logo directions side by side so we can choose one confidently before rolling it across the whole app.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {variants.map((variant) => (
            <section
              key={variant.id}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,25,35,0.9),rgba(12,16,24,0.86))] p-6 shadow-[0_28px_60px_rgba(0,0,0,0.22)]"
            >
              <div className="rounded-[1.5rem] border border-white/8 bg-[#101722] px-5 py-7">
                <BrandMark variant={variant.id} className="mx-auto h-28 w-auto" withGlow />
                <div className="mt-5 flex items-center justify-center gap-3">
                  <BrandWordmark className="text-3xl font-bold tracking-[0.12em] text-white" />
                </div>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-white">{variant.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/72">{variant.description}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
