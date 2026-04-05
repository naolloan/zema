import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user)

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow={user ? 'Signed In' : 'Mobile Foundation'} title={user ? `Welcome back, ${user.displayName || user.username}` : 'Zeማa for iPhone and Android'}>
          {user
            ? 'Your mobile session is now connected. Next we can layer release browsing, rating, and diary logging on top of this shell.'
            : 'We now have the first real auth path in place. Sign in or create an account to start testing the mobile session flow.'}
        </AppHeading>

        {user ? (
          <FeatureCard title="What comes next">
            Release detail, review flows, diary logging, and list actions will build on this signed-in shell next.
          </FeatureCard>
        ) : (
          <View style={styles.actions}>
            <PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} />
            <PrimaryButton label="Create account" onPress={() => router.push('/(auth)/register')} variant="ghost" />
          </View>
        )}

        <FeatureCard title="Shared backend">
          This mobile app will reuse the existing Express API and the same product rules the web app already follows.
        </FeatureCard>

        <View style={styles.badges}>
          {['Rate', 'Review', 'Log', 'List', 'Like'].map((item) => (
            <View key={item} style={styles.badge}>
              <Text style={styles.badgeText}>{item}</Text>
            </View>
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
