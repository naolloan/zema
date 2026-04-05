import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { createList, getDiscoverLists, getMyLists } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, radius, spacing } from '@/theme/tokens'
import type { ListCategory } from '@/types'

const categoryOptions: Array<{ label: string; value: ListCategory }> = [
  { label: 'Mixed', value: 'MIXED' },
  { label: 'Albums', value: 'ALBUMS' },
  { label: 'Songs', value: 'SINGLES' },
  { label: 'EPs', value: 'EPS' },
  { label: 'Mixtapes', value: 'MIXTAPES' },
]

export default function ListsScreen() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [section, setSection] = useState<'discover' | 'yours'>(token ? 'yours' : 'discover')
  const [sort, setSort] = useState<'weekly' | 'recent' | 'liked'>('weekly')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ListCategory>('MIXED')
  const [isPublic, setIsPublic] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const discoverQuery = useQuery({
    queryKey: ['mobile-discover-lists', sort],
    queryFn: () => getDiscoverLists(sort, 12, 0),
  })

  const myListsQuery = useQuery({
    queryKey: ['mobile-my-lists-dashboard', user?.id],
    queryFn: () => getMyLists(user!.id),
    enabled: Boolean(token && user?.id),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createList({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        isPublic,
      }),
    onSuccess: async () => {
      setError(null)
      setMessage('List created.')
      setTitle('')
      setDescription('')
      setCategory('MIXED')
      setIsPublic(false)
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-lists-dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-discover-lists'] })
      setSection('yours')
    },
    onError: (caught: any) => {
      setMessage(null)
      setError(caught?.response?.data?.error || 'Unable to create a list right now.')
    },
  })

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Lists" title="Official and personal lists">
          Browse community lists, then create and manage your own without leaving the mobile app.
        </AppHeading>

        <View style={styles.modeRow}>
          <PrimaryButton label="Discover" onPress={() => setSection('discover')} variant={section === 'discover' ? 'accent' : 'ghost'} />
          {token ? <PrimaryButton label="Your Lists" onPress={() => setSection('yours')} variant={section === 'yours' ? 'accent' : 'ghost'} /> : null}
        </View>

        {message ? <InfoBanner tone="success" text={message} /> : null}
        {error ? <InfoBanner tone="error" text={error} /> : null}

        {section === 'discover' ? (
          <>
            <FeatureCard title="Community discovery">
              Popular this week, recently updated, and recently liked lists all live here first.
            </FeatureCard>

            <View style={styles.modeRow}>
              <PrimaryButton label="Popular This Week" onPress={() => setSort('weekly')} variant={sort === 'weekly' ? 'accent' : 'ghost'} />
              <PrimaryButton label="Recently Updated" onPress={() => setSort('recent')} variant={sort === 'recent' ? 'accent' : 'ghost'} />
              <PrimaryButton label="Recently Liked" onPress={() => setSort('liked')} variant={sort === 'liked' ? 'accent' : 'ghost'} />
            </View>

            {discoverQuery.isLoading ? <Text style={styles.helperText}>Loading lists…</Text> : null}
            {discoverQuery.isError ? <InfoBanner tone="error" text="Unable to load lists right now." /> : null}

            <View style={styles.listGrid}>
              {discoverQuery.data?.data.map((list) => (
                <ListCard key={list.id} list={list} />
              ))}
            </View>
          </>
        ) : token ? (
          <>
            <FeatureCard title="Create a list">
              Build a list directly on mobile, then start adding releases from release pages.
            </FeatureCard>

            <View style={styles.sectionCard}>
              <TextField label="List name" value={title} onChangeText={setTitle} />
              <TextField label="Description" value={description} onChangeText={setDescription} multiline hint="Optional. Use this to frame the list however you want." />
              <View style={styles.modeRow}>
                <PrimaryButton label={isPublic ? 'Public list' : 'Private list'} onPress={() => setIsPublic((current) => !current)} variant={isPublic ? 'accent' : 'ghost'} />
              </View>
              <View style={styles.categoryGrid}>
                {categoryOptions.map((option) => (
                  <PrimaryButton key={option.value} label={option.label} onPress={() => setCategory(option.value)} variant={category === option.value ? 'accent' : 'ghost'} />
                ))}
              </View>
              <PrimaryButton label={createMutation.isPending ? 'Creating…' : 'Create list'} onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={title.trim().length === 0} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your lists</Text>
              {myListsQuery.isLoading ? <Text style={styles.helperText}>Loading your lists…</Text> : null}
              {myListsQuery.isError ? <InfoBanner tone="error" text="Unable to load your lists right now." /> : null}
              <View style={styles.listGrid}>
                {myListsQuery.data?.length ? myListsQuery.data.map((list) => <ListCard key={list.id} list={list} />) : !myListsQuery.isLoading ? <Text style={styles.helperText}>You have not created any lists yet.</Text> : null}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  modeRow: {
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  listGrid: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryGrid: {
    gap: spacing.sm,
  },
})
