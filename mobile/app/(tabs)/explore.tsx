import { ScrollView, StyleSheet } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { ScreenShell } from '@/components/screen-shell'
import { spacing } from '@/theme/tokens'

export default function ExploreScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Explore" title="Search and discovery will live here">
          The first mobile explore pass will cover releases, artists, users, and lists using the existing backend search endpoints.
        </AppHeading>

        <FeatureCard title="Planned V1">
          Search input, segmented result groups, and quick access into release pages, profiles, and official lists.
        </FeatureCard>
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
})
