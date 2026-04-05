import { ScrollView, StyleSheet } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { ScreenShell } from '@/components/screen-shell'
import { spacing } from '@/theme/tokens'

export default function ListsScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Lists" title="Official and personal lists">
          Mobile v1 should support browsing official lists first, then opening and managing personal lists once auth is wired.
        </AppHeading>

        <FeatureCard title="First mobile list loop">
          Open a list, view releases, and add a release from the release action sheet.
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
