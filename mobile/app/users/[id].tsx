import { useLocalSearchParams, router } from 'expo-router'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArtistCard } from '@/components/artist-card'
import { Avatar } from '@/components/avatar'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { followUser, getUserLists, getUserProfile, getUserReleaseLikes, getUserWantToHear, unfollowUser } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, radius, spacing } from '@/theme/tokens'

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const userId = Array.isArray(id) ? id[0] : id
  const token = useAuthStore((state) => state.token)
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['mobile-user-profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: Boolean(userId),
  })

  const likedQuery = useQuery({
    queryKey: ['mobile-user-release-likes', userId],
    queryFn: () => getUserReleaseLikes(userId, 8, 0),
    enabled: Boolean(userId),
  })

  const wantQuery = useQuery({
    queryKey: ['mobile-user-want-to-hear', userId],
    queryFn: () => getUserWantToHear(userId, 8, 0),
    enabled: Boolean(userId),
  })

  const listsQuery = useQuery({
    queryKey: ['mobile-user-lists', userId],
    queryFn: () => getUserLists(userId, 8, 0),
    enabled: Boolean(userId),
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      const current = profileQuery.data
      if (!current) {
        return
      }

      if (current.isFollowing) {
        return unfollowUser(userId)
      }

      return followUser(userId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-user-profile', userId] })
    },
  })

  if (profileQuery.isLoading) {
    return (
      <ScreenShell>
        <View style={styles.center}>
          <Text style={styles.helperText}>Loading profile…</Text>
        </View>
      </ScreenShell>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ScreenShell>
        <View style={styles.content}>
          <InfoBanner tone="error" text="Unable to open that profile right now." />
        </View>
      </ScreenShell>
    )
  }

  const profile = profileQuery.data
  const isOwnProfile = currentUser?.id === profile.id

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Avatar uri={profile.avatarUrl} name={profile.displayName || profile.username} size={72} />
            <View style={styles.heroBody}>
              <Text style={styles.heroName}>{profile.displayName || profile.username}</Text>
              <Text style={styles.heroUsername}>@{profile.username}</Text>
              <Text style={styles.heroMeta}>{profile.isFriend ? 'Mutuals' : profile.isFollowing ? 'Following' : 'Zeማa member'}</Text>
            </View>
          </View>

          <Text style={styles.heroBio}>{profile.bio || 'No bio added yet.'}</Text>

          {isOwnProfile ? (
            <PrimaryButton label="Open your profile tab" onPress={() => router.replace('/profile')} />
          ) : token ? (
            <PrimaryButton
              label={followMutation.isPending ? 'Working…' : profile.isFollowing ? 'Unfollow' : 'Follow'}
              onPress={() => followMutation.mutate()}
              variant={profile.isFollowing ? 'ghost' : 'accent'}
              loading={followMutation.isPending}
            />
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Logged" value={profile._count.diaryEntries} />
          <StatCard label="Reviews" value={profile._count.reviews} />
          <StatCard label="Lists" value={profile._count.lists} />
          <StatCard label="Want To Hear" value={profile._count.wantToHear} />
          <StatCard label="Followers" value={profile.counts?.followers || profile._count.followers || 0} />
          <StatCard label="Following" value={profile.counts?.following || profile._count.following || 0} />
        </View>

        <Section title="Favorite Albums" emptyMessage="No favorite albums yet.">
          {profile.favoriteAlbums.length ? profile.favoriteAlbums.map((favorite) => <ReleaseCard key={favorite.id} release={favorite.release} />) : null}
        </Section>

        <Section title="Favorite Songs" emptyMessage="No favorite songs yet.">
          {profile.favoriteSongs.length ? profile.favoriteSongs.map((favorite) => <ReleaseCard key={favorite.id} release={favorite.release} />) : null}
        </Section>

        <Section title="Favorite Artists" emptyMessage="No favorite artists yet.">
          {profile.favoriteArtists.length ? profile.favoriteArtists.map((favorite) => <ArtistCard key={favorite.id} artist={favorite.artist} />) : null}
        </Section>

        <Section title="Liked Releases" emptyMessage="No liked releases to show yet.">
          {likedQuery.data?.data.length ? likedQuery.data.data.map((item) => <ReleaseCard key={item.id} release={item.release} />) : null}
        </Section>

        <Section title="Want To Hear" emptyMessage="Nothing on this shelf yet.">
          {wantQuery.data?.data.length ? wantQuery.data.data.map((item) => <ReleaseCard key={item.id} release={item.release} />) : null}
        </Section>

        <Section title="Lists" emptyMessage="No public lists to show yet.">
          {listsQuery.data?.data.length ? listsQuery.data.data.map((list) => <ListCard key={list.id} list={list} />) : null}
        </Section>
      </ScrollView>
    </ScreenShell>
  )
}

function Section({ title, emptyMessage, children }: { title: string; emptyMessage: string; children: ReactNode }) {
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
})
