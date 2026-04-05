import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { searchReleases } from '@/lib/music-api'
import { colors, spacing } from '@/theme/tokens'

export default function ExploreScreen() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const searchQuery = useQuery({
    queryKey: ['mobile-release-search', submittedQuery],
    queryFn: () => searchReleases(submittedQuery, 12),
    enabled: submittedQuery.trim().length > 0,
  })

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Explore" title="Search and discovery will live here">
          The first mobile explore pass will cover releases, artists, users, and lists using the existing backend search endpoints.
        </AppHeading>

        <FeatureCard title="Planned V1">
          Search input, segmented result groups, and quick access into release pages, profiles, and official lists.
        </FeatureCard>

        <View style={styles.searchArea}>
          <TextField label="Search releases" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
          <PrimaryButton label="Search" onPress={() => setSubmittedQuery(query.trim())} />
        </View>

        {searchQuery.isError ? <InfoBanner tone="error" text="Unable to search releases right now." /> : null}
        {submittedQuery && searchQuery.isLoading ? <Text style={styles.helperText}>Searching releases…</Text> : null}
        {!submittedQuery ? <Text style={styles.helperText}>Search by release title to test the first mobile discovery flow.</Text> : null}

        <View style={styles.results}>
          {searchQuery.data?.map((release) => (
            <ReleaseCard key={release.id} release={release} />
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
  searchArea: {
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  results: {
    gap: spacing.md,
  },
})
