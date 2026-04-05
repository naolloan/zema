import { ScrollView, StyleSheet } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { ScreenShell } from '@/components/screen-shell'
import { spacing } from '@/theme/tokens'

export default function ActivityScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Activity" title="Notifications and community movement">
          This tab will grow into notifications, recent follows, likes, comments, and review activity.
        </AppHeading>

        <FeatureCard title="Why this tab exists early">
          It gives us a stable place for notifications and social activity without overloading the profile tab.
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
