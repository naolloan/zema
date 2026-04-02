import { BrandLoader, BrandWordmark } from '@/components/brand/brand-logo'

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4 text-center text-white">
        <BrandLoader className="h-10 w-auto" withGlow />
        <div>
          <BrandWordmark className="text-xl font-bold tracking-[0.14em] text-white" />
          <p className="mt-2 text-sm text-white/58">Loading the next page...</p>
        </div>
      </div>
    </main>
  )
}
