import { RelationshipListView } from '@/components/profile/relationship-list-view'

export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RelationshipListView userId={id} mode="following" />
}
