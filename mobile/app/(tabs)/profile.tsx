import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { getMyProfile, logoutUser } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function refreshProfile() {
      if (!token) {
        return
      }

      setRefreshing(true)
      setError(null)

      try {
        const profile = await getMyProfile(token)
        await setUser({
          id: profile.id,
          email: profile.email,
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: profile.emailVerifiedAt,
        })
      } catch (caught: any) {
        setError(caught?.response?.data?.error || 'Unable to refresh your profile right now.')
      } finally {
        setRefreshing(false)
      }
    }

    refreshProfile()
  }, [setUser, token])

  async function handleLogout() {
    try {
      await logoutUser()
    } catch {
      // If the server session is already gone, we still clear locally.
    } finally {
      await clearSession()
      router.replace('/(auth)/login')
    }
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        {user ? (
          <>
            <AppHeading eyebrow="Profile" title={user.displayName || user.username}>
              The mobile profile will reuse the same identity model as the web app: favorites, diary, liked releases, lists, and account settings.
            </AppHeading>

            <FeatureCard title="Session state">
              {refreshing ? 'Refreshing your account details from the backend…' : `Signed in as @${user.username}`}
            </FeatureCard>

            {error ? <InfoBanner tone="error" text={error} /> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mobile settings path</Text>
              <Text style={styles.cardBody}>
                Account settings will live under this tab so profile browsing stays clean, just like the web version.
              </Text>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Email</Text>
                <Text style={styles.metaValue}>{user.email || 'No email on file'}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Verification</Text>
                <Text style={styles.metaValue}>{user.emailVerifiedAt ? 'Verified' : 'Pending'}</Text>
              </View>
            </View>

            <PrimaryButton label="Sign out" onPress={handleLogout} variant="ghost" />
          </>
        ) : (
          <>
            <AppHeading eyebrow="Profile" title="Your mobile profile starts with sign in">
              Sign in to reach your identity, diary, likes, lists, and account settings from here.
            </AppHeading>

            <FeatureCard title="No session yet">
              Once you sign in, this tab will become the center of your personal music history on mobile.
            </FeatureCard>

            <View style={styles.ctaGroup}>
              <PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} />
              <PrimaryButton label="Create account" onPress={() => router.push('/(auth)/register')} variant="ghost" />
            </View>
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
  ctaGroup: {
    gap: spacing.sm,
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
  metaGrid: {
    gap: spacing.md,
  },
  metaCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  metaValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
})
