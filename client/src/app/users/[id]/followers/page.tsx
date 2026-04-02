import { RelationshipListView } from '@/components/profile/relationship-list-view'

export default async function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RelationshipListView userId={id} mode="followers" />
}
