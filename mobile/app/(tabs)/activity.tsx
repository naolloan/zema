import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { getMyDiary } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ActivityScreen() {
  const token = useAuthStore((state) => state.token)
  const diaryQuery = useQuery({
    queryKey: ['mobile-my-diary'],
    queryFn: () => getMyDiary(8, 0),
    enabled: Boolean(token),
  })

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        {token ? (
          <>
            <AppHeading eyebrow="Activity" title="Recent diary activity">
              Your latest listens live here first on mobile. Notifications and broader social activity can layer in next.
            </AppHeading>

            <FeatureCard title="Why this tab exists early">
              It now gives us a real place for your latest logs, so the mobile listening loop already has a visible destination.
            </FeatureCard>

            {diaryQuery.isLoading ? <Text style={styles.helperText}>Loading your latest diary entries…</Text> : null}
            {diaryQuery.isError ? <InfoBanner tone="error" text="Unable to load your diary right now." /> : null}

            <View style={styles.entries}>
              {diaryQuery.data?.data.length ? (
                diaryQuery.data.data.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <ReleaseCard release={entry.release} />
                    <Text style={styles.entryMeta}>
                      Logged {new Date(entry.listenedAt).toLocaleDateString()}
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </Text>
                  </View>
                ))
              ) : (
                !diaryQuery.isLoading ? <Text style={styles.helperText}>No diary entries yet. Log a release from its mobile release page.</Text> : null
              )}
            </View>
          </>
        ) : (
          <>
            <AppHeading eyebrow="Activity" title="Your listening history starts after sign in">
              Sign in to see your diary activity here and start building a real mobile listening trail.
            </AppHeading>

            <FeatureCard title="What this tab will hold">
              Recent logs first, then notifications, follows, comments, and other social activity.
            </FeatureCard>

            <PrimaryButton label="Go to sign in" onPress={() => router.push('/(auth)/login')} variant="ghost" />
          </>
        )}
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  entries: {
    gap: spacing.md,
  },
  entryCard: {
    gap: spacing.sm,
  },
  entryMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
})
