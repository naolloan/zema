import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { getDiscoverLists } from '@/lib/auth-api'
import { colors, spacing } from '@/theme/tokens'

export default function ListsScreen() {
  const [sort, setSort] = useState<'weekly' | 'recent' | 'liked'>('weekly')
  const listsQuery = useQuery({
    queryKey: ['mobile-discover-lists', sort],
    queryFn: () => getDiscoverLists(sort, 12, 0),
  })

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Lists" title="Official and personal lists">
          Mobile v1 should support browsing official lists first, then opening and managing personal lists once auth is wired.
        </AppHeading>

        <FeatureCard title="First mobile list loop">
          Open a list, view releases, and add a release from the release action sheet.
        </FeatureCard>

        <View style={styles.actions}>
          <PrimaryButton label="Popular This Week" onPress={() => setSort('weekly')} variant={sort === 'weekly' ? 'accent' : 'ghost'} />
          <PrimaryButton label="Recently Updated" onPress={() => setSort('recent')} variant={sort === 'recent' ? 'accent' : 'ghost'} />
          <PrimaryButton label="Recently Liked" onPress={() => setSort('liked')} variant={sort === 'liked' ? 'accent' : 'ghost'} />
        </View>

        {listsQuery.isLoading ? <Text style={styles.helperText}>Loading lists…</Text> : null}
        {listsQuery.isError ? <InfoBanner tone="error" text="Unable to load lists right now." /> : null}

        <View style={styles.listGrid}>
          {listsQuery.data?.data.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  actions: {
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
})
