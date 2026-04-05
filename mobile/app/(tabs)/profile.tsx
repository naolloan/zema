import { router } from 'expo-router'
import { useEffect, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { ArtistCard } from '@/components/artist-card'
import { Avatar } from '@/components/avatar'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { getMyProfile, getUserLists, getUserReleaseLikes, getUserWantToHear, logoutUser } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, radius, spacing } from '@/theme/tokens'

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clearSession)

  const profileQuery = useQuery({
    queryKey: ['mobile-my-profile-full'],
    queryFn: () => getMyProfile(),
    enabled: Boolean(token),
  })

  const profile = profileQuery.data
  const profileId = profile?.id || user?.id

  const likedQuery = useQuery({
    queryKey: ['mobile-my-release-likes', profileId],
    queryFn: () => getUserReleaseLikes(profileId!, 8, 0),
    enabled: Boolean(token && profileId),
  })

  const wantToHearQuery = useQuery({
    queryKey: ['mobile-my-want-to-hear', profileId],
    queryFn: () => getUserWantToHear(profileId!, 8, 0),
    enabled: Boolean(token && profileId),
  })

  const listsQuery = useQuery({
    queryKey: ['mobile-my-profile-lists', profileId],
    queryFn: () => getUserLists(profileId!, 8, 0),
    enabled: Boolean(token && profileId),
  })

  useEffect(() => {
    if (!profile) {
      return
    }

    void setUser({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      emailVerifiedAt: profile.emailVerifiedAt,
      commentPermission: profile.commentPermission,
      counts: profile.counts,
      createdAt: profile.createdAt,
    })
  }, [profile, setUser])

  async function handleLogout() {
    try {
      await logoutUser()
    } catch {
      // Local session clear still matters if the server session is already gone.
    } finally {
      await clearSession()
      router.replace('/(auth)/login')
    }
  }

  if (!token || !user) {
    return (
      <ScreenShell>
        <ScrollView contentContainerStyle={styles.content}>
          <AppHeading eyebrow="Profile" title="Your mobile profile starts after sign in">
            Sign in to unlock your diary, likes, want-to-hear, lists, curated favorites, and account settings.
          </AppHeading>

          <FeatureCard title="What lives here">
            Profile on mobile is becoming the same identity hub as the web app, just adapted for a native flow.
          </FeatureCard>

          <View style={styles.ctaGroup}>
            <PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} />
            <PrimaryButton label="Create account" onPress={() => router.push('/(auth)/register')} variant="ghost" />
          </View>
        </ScrollView>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Avatar uri={profile?.avatarUrl || user.avatarUrl} name={profile?.displayName || user.displayName || user.username} size={72} />
            <View style={styles.heroBody}>
              <Text style={styles.heroName}>{profile?.displayName || user.displayName || user.username}</Text>
              <Text style={styles.heroUsername}>@{profile?.username || user.username}</Text>
              <Text style={styles.heroMeta}>{profile?.emailVerifiedAt ? 'Verified email' : 'Email verification pending'}</Text>
            </View>
          </View>

          <Text style={styles.heroBio}>{profile?.bio || 'Use profile settings to add a short bio and shape how people experience your taste on mobile.'}</Text>

          <View style={styles.heroActions}>
            <PrimaryButton label="Account settings" onPress={() => router.push('/profile/settings')} />
            <PrimaryButton label="Notifications" onPress={() => router.push('/activity')} variant="ghost" />
            {profileId ? <PrimaryButton label="Public view" onPress={() => router.push(`/users/${profileId}`)} variant="ghost" /> : null}
          </View>
        </View>

        {profileQuery.isLoading ? <Text style={styles.helperText}>Refreshing your profile…</Text> : null}
        {profileQuery.isError ? <InfoBanner tone="error" text="Unable to refresh your profile right now." /> : null}

        {profile ? (
          <View style={styles.statsGrid}>
            <StatCard label="Logged" value={profile._count.diaryEntries} />
            <StatCard label="Reviews" value={profile._count.reviews} />
            <StatCard label="Lists" value={profile._count.lists} />
            <StatCard label="Want To Hear" value={profile._count.wantToHear} />
            <StatCard label="Followers" value={profile.counts?.followers || profile._count.followers || 0} />
            <StatCard label="Following" value={profile.counts?.following || profile._count.following || 0} />
          </View>
        ) : null}

        <Section title="Favorite Albums" emptyMessage="No favorite albums yet.">
          {profile?.favoriteAlbums?.length ? profile.favoriteAlbums.map((favorite) => <ReleaseCard key={favorite.id} release={favorite.release} />) : null}
        </Section>

        <Section title="Favorite Songs" emptyMessage="No favorite songs yet.">
          {profile?.favoriteSongs?.length ? profile.favoriteSongs.map((favorite) => <ReleaseCard key={favorite.id} release={favorite.release} />) : null}
        </Section>

        <Section title="Favorite Artists" emptyMessage="No favorite artists yet.">
          {profile?.favoriteArtists?.length ? profile.favoriteArtists.map((favorite) => <ArtistCard key={favorite.id} artist={favorite.artist} />) : null}
        </Section>

        <Section title="Liked Releases" emptyMessage="You have not liked any releases yet.">
          {likedQuery.data?.data.length ? likedQuery.data.data.map((item) => <ReleaseCard key={item.id} release={item.release} />) : null}
        </Section>

        <Section title="Want To Hear" emptyMessage="Your want-to-hear shelf is still empty.">
          {wantToHearQuery.data?.data.length ? wantToHearQuery.data.data.map((item) => <ReleaseCard key={item.id} release={item.release} />) : null}
        </Section>

        <Section title="Your Lists" emptyMessage="You have not created any lists yet on mobile.">
          {listsQuery.data?.data.length ? listsQuery.data.data.map((list) => <ListCard key={list.id} list={list} />) : null}
        </Section>

        <PrimaryButton label="Sign out" onPress={handleLogout} variant="ghost" />
      </ScrollView>
    </ScreenShell>
  )
}

function Section({
  title,
  emptyMessage,
  children,
}: {
  title: string
  emptyMessage: string
  children: ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{hasChildren ? children : <Text style={styles.helperText}>{emptyMessage}</Text>}</View>
    </View>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroBody: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  heroUsername: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  heroMeta: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroBio: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  heroActions: {
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionBody: {
    gap: spacing.md,
  },
})
