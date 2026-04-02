import { redirect } from 'next/navigation'

interface LegacyDynamicListPageProps {
  params: {
    slug: string
  }
}

export default function LegacyDynamicListPage({ params }: LegacyDynamicListPageProps) {
  redirect(`/lists/official/${params.slug}`)
}
