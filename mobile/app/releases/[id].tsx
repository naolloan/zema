import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { MobileRatingPicker } from '@/components/mobile-rating-picker'
import { ScreenShell } from '@/components/screen-shell'
import { clearReleaseRating, getReleaseById, rateRelease } from '@/lib/music-api'
import { formatArtistCredits, formatRatingValue, formatReleaseType } from '@/lib/format'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ReleaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const releaseId = Array.isArray(id) ? id[0] : id
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  const releaseQuery = useQuery({
    queryKey: ['mobile-release-detail', releaseId],
    queryFn: () => getReleaseById(releaseId),
    enabled: Boolean(releaseId),
  })

  const rateMutation = useMutation({
    mutationFn: (value: number) => rateRelease(releaseId, value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-home-top-albums'] })
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => clearReleaseRating(releaseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-home-top-albums'] })
    },
  })

  if (releaseQuery.isLoading) {
    return (
      <ScreenShell>
        <View style={styles.center}>
          <Text style={styles.helperText}>Loading release…</Text>
        </View>
      </ScreenShell>
    )
  }

  if (releaseQuery.isError || !releaseQuery.data) {
    return (
      <ScreenShell>
        <View style={styles.content}>
          <InfoBanner tone="error" text="Unable to open this release right now." />
        </View>
      </ScreenShell>
    )
  }

  const release = releaseQuery.data
  const ratingHistogram = release.ratingBreakdown?.histogram || []
  const totalRatings = release.ratingBreakdown?.total || 0
  const isMutating = rateMutation.isPending || clearMutation.isPending

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {release.artworkUrl ? (
            <Image source={{ uri: release.artworkUrl }} style={styles.artwork} />
          ) : (
            <View style={styles.fallbackArtwork}>
              <Text style={styles.fallbackText}>{release.title.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.heroBody}>
            <AppHeading eyebrow={formatReleaseType(release.type)} title={release.title}>
              {formatArtistCredits(release.artistCredits)}
            </AppHeading>
            <Text style={styles.releaseMeta}>
              {release.releaseDate ? new Date(release.releaseDate).getFullYear() : 'Unknown year'} · {release.counts?.reviews || 0} reviews · {release.counts?.logs || 0} logs
            </Text>
          </View>
        </View>

        <FeatureCard title="Community rating">
          {release.ratingBreakdown ? `${formatRatingValue(release.ratingBreakdown.average)} average from ${release.ratingBreakdown.total} ratings.` : 'This release has not been rated yet.'}
        </FeatureCard>

        <View style={styles.ratingCard}>
          <MobileRatingPicker
            value={release.userRating?.value ?? null}
            onRate={(value) => rateMutation.mutate(value)}
            onClear={release.userRating ? () => clearMutation.mutate() : undefined}
            disabled={!token || isMutating}
          />
          {!token ? <Text style={styles.helperText}>Sign in on mobile to rate this release.</Text> : null}
          {rateMutation.isError ? <InfoBanner tone="error" text="Unable to save your rating right now." /> : null}
          {clearMutation.isError ? <InfoBanner tone="error" text="Unable to clear your rating right now." /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating distribution</Text>
          <View style={styles.histogram}>
            {ratingHistogram.map((bucket) => {
              const widthPercent = totalRatings ? Math.max((bucket.count / totalRatings) * 100, bucket.count > 0 ? 6 : 0) : 0
              return (
                <View key={bucket.value} style={styles.histogramRow}>
                  <Text style={styles.histogramLabel}>{formatRatingValue(bucket.value)}</Text>
                  <View style={styles.histogramTrack}>
                    <View style={[styles.histogramFill, { width: `${widthPercent}%` }]} />
                  </View>
                  <Text style={styles.histogramCount}>{bucket.count}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          <View style={styles.trackList}>
            {release.tracks?.length ? (
              release.tracks.map((track, index) => (
                <View key={track.id} style={styles.trackRow}>
                  <Text style={styles.trackNumber}>{track.trackNumber || index + 1}</Text>
                  <View style={styles.trackBody}>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                    <Text style={styles.trackArtists}>{formatArtistCredits(track.artistCredits)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>Track data will appear here when available for this release.</Text>
            )}
          </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.lg,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
  },
  fallbackArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '700',
  },
  heroBody: {
    gap: spacing.sm,
  },
  releaseMeta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  ratingCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  histogram: {
    gap: spacing.sm,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  histogramLabel: {
    width: 32,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  histogramTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  histogramFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  histogramCount: {
    width: 28,
    textAlign: 'right',
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  trackList: {
    gap: spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  trackNumber: {
    width: 20,
    color: colors.accentSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  trackBody: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  trackArtists: {
    color: colors.textMuted,
    fontSize: 13,
  },
})
