import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { ScreenShell } from '@/components/screen-shell'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Profile" title={user?.displayName || user?.username || 'Your profile'}>
          The mobile profile will reuse the same identity model as the web app: favorites, diary, liked releases, lists, and account settings.
        </AppHeading>

        <FeatureCard title="Session state">
          {user ? `Signed in as @${user.username}` : 'No mobile session yet. The next step is wiring real auth screens and persisted login.'}
        </FeatureCard>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mobile settings path</Text>
          <Text style={styles.cardBody}>
            Account settings will live under this tab so profile browsing stays clean, just like the web version.
          </Text>
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
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
})
