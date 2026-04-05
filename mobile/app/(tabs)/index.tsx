import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { InfoBanner } from '@/components/info-banner'
import { getTopReleases } from '@/lib/music-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user)
  const topAlbumsQuery = useQuery({
    queryKey: ['mobile-home-top-albums'],
    queryFn: () => getTopReleases('ALBUM', 6),
  })

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

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Featured Albums</Text>
          <Text style={styles.sectionTitle}>The first mobile release shelf</Text>
          {topAlbumsQuery.isLoading ? <Text style={styles.sectionBody}>Loading the current top releases…</Text> : null}
          {topAlbumsQuery.isError ? <InfoBanner tone="error" text="Unable to load featured releases right now." /> : null}
          <View style={styles.releaseList}>
            {topAlbumsQuery.data?.items.slice(0, 4).map((item) => (
              <ReleaseCard key={item.release.id} release={item.release} />
            ))}
          </View>
        </View>

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
  section: {
    gap: spacing.sm,
  },
  sectionEyebrow: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  releaseList: {
    gap: spacing.md,
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
