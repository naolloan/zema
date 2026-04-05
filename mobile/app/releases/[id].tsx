import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Image, Pressable } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { MobileRatingPicker } from '@/components/mobile-rating-picker'
import { ReviewCard } from '@/components/review-card'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { addWantToHear, clearReleaseRating, createReview, getReleaseById, getReleaseReviews, likeRelease, rateRelease, removeWantToHear, toggleReviewLike, unlikeRelease } from '@/lib/music-api'
import { formatArtistCredits, formatRatingValue, formatReleaseType } from '@/lib/format'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'
import { addListItem, createDiaryEntry, getMyLists } from '@/lib/auth-api'

export default function ReleaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const releaseId = Array.isArray(id) ? id[0] : id
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [listenedDate, setListenedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [diaryNotes, setDiaryNotes] = useState('')
  const [reviewContent, setReviewContent] = useState('')

  const releaseQuery = useQuery({
    queryKey: ['mobile-release-detail', releaseId],
    queryFn: () => getReleaseById(releaseId),
    enabled: Boolean(releaseId),
  })

  const myListsQuery = useQuery({
    queryKey: ['mobile-my-lists', user?.id],
    queryFn: () => getMyLists(user!.id),
    enabled: Boolean(token && user?.id),
  })

  const reviewsQuery = useQuery({
    queryKey: ['mobile-release-reviews', releaseId],
    queryFn: () => getReleaseReviews(releaseId, 8, 0, 'recent'),
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

  const likeMutation = useMutation({
    mutationFn: async () => {
      const current = releaseQuery.data
      if (!current) {
        return false
      }

      if (current.isLiked) {
        await unlikeRelease(releaseId)
        return false
      }

      await likeRelease(releaseId)
      return true
    },
    onSuccess: async (isLiked) => {
      setActionError(null)
      setActionMessage(isLiked ? 'Added to liked releases.' : 'Removed from liked releases.')
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-home-top-albums'] })
    },
    onError: () => {
      setActionMessage(null)
      setActionError('Unable to update likes right now.')
    },
  })

  const wantMutation = useMutation({
    mutationFn: async () => {
      const current = releaseQuery.data
      if (!current) {
        return false
      }

      if (current.isWantToHear) {
        await removeWantToHear(releaseId)
        return false
      }

      await addWantToHear(releaseId)
      return true
    },
    onSuccess: async (isWanted) => {
      setActionError(null)
      setActionMessage(isWanted ? 'Added to want-to-hear.' : 'Removed from want-to-hear.')
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
    },
    onError: () => {
      setActionMessage(null)
      setActionError('Unable to update want-to-hear right now.')
    },
  })

  const addToListMutation = useMutation({
    mutationFn: (listId: string) => addListItem(listId, { releaseId }),
    onSuccess: async () => {
      setActionError(null)
      setActionMessage('Release added to your list.')
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-lists', user?.id] })
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to add this release to the selected list.')
    },
  })

  const diaryMutation = useMutation({
    mutationFn: () =>
      createDiaryEntry({
        releaseId,
        listenedAt: new Date(`${listenedDate}T12:00:00.000Z`).toISOString(),
        notes: diaryNotes.trim() || undefined,
      }),
    onSuccess: async () => {
      setActionError(null)
      setActionMessage('Logged to your diary.')
      setDiaryNotes('')
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-diary'] })
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to log this release right now.')
    },
  })

  const createReviewMutation = useMutation({
    mutationFn: () =>
      createReview({
        releaseId,
        content: reviewContent.trim(),
      }),
    onSuccess: async () => {
      setActionError(null)
      setActionMessage('Review posted.')
      setReviewContent('')
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-reviews', releaseId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-detail', releaseId] })
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to post your review right now.')
    },
  })

  const likeReviewMutation = useMutation({
    mutationFn: (reviewId: string) => toggleReviewLike(reviewId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-release-reviews', releaseId] })
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

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {!token ? <Text style={styles.helperText}>Sign in on mobile to like, save, and add this release to your lists.</Text> : null}

          <View style={styles.actionButtons}>
            <ActionPill
              label={release.isLiked ? 'Liked' : 'Like release'}
              active={Boolean(release.isLiked)}
              disabled={!token || likeMutation.isPending}
              onPress={() => {
                setActionMessage(null)
                setActionError(null)
                likeMutation.mutate()
              }}
            />
            <ActionPill
              label={release.isWantToHear ? 'In want-to-hear' : 'Want to hear'}
              active={Boolean(release.isWantToHear)}
              disabled={!token || wantMutation.isPending}
              onPress={() => {
                setActionMessage(null)
                setActionError(null)
                wantMutation.mutate()
              }}
            />
          </View>

          {actionMessage ? <InfoBanner tone="success" text={actionMessage} /> : null}
          {actionError ? <InfoBanner tone="error" text={actionError} /> : null}

          {token ? (
            <View style={styles.listSection}>
              <Text style={styles.listTitle}>Add to one of your lists</Text>
              {myListsQuery.isLoading ? <Text style={styles.helperText}>Loading your lists…</Text> : null}
              {myListsQuery.isError ? <InfoBanner tone="error" text="Unable to load your lists right now." /> : null}
              <View style={styles.listButtons}>
                {myListsQuery.data?.length ? (
                  myListsQuery.data.slice(0, 4).map((list) => (
                    <Pressable
                      key={list.id}
                      style={({ pressed }) => [styles.listButton, pressed ? styles.listButtonPressed : null]}
                      disabled={addToListMutation.isPending}
                      onPress={() => {
                        setActionMessage(null)
                        setActionError(null)
                        addToListMutation.mutate(list.id)
                      }}
                    >
                      <Text style={styles.listButtonTitle}>{list.title}</Text>
                      <Text style={styles.listButtonMeta}>{list.itemsCount} items</Text>
                    </Pressable>
                  ))
                ) : (
                  !myListsQuery.isLoading ? <Text style={styles.helperText}>You do not have any lists yet on mobile.</Text> : null
                )}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Log to diary</Text>
          {!token ? <Text style={styles.helperText}>Sign in on mobile to log this release to your diary.</Text> : null}
          {token ? (
            <>
              <TextField
                label="Listened on"
                value={listenedDate}
                onChangeText={setListenedDate}
                autoCapitalize="none"
                autoCorrect={false}
                hint="Use YYYY-MM-DD"
              />
              <TextField
                label="Notes"
                value={diaryNotes}
                onChangeText={setDiaryNotes}
                multiline
                hint="Optional thoughts for this listen."
              />
              <ActionPill
                label={diaryMutation.isPending ? 'Logging…' : 'Log this release'}
                disabled={!token || diaryMutation.isPending || !/^\d{4}-\d{2}-\d{2}$/.test(listenedDate)}
                onPress={() => {
                  setActionMessage(null)
                  setActionError(null)
                  diaryMutation.mutate()
                }}
              />
            </>
          ) : null}
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

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {!token ? <Text style={styles.helperText}>Sign in on mobile to write and like reviews.</Text> : null}
          {token ? (
            <>
              <TextField
                label="Write a review"
                value={reviewContent}
                onChangeText={setReviewContent}
                multiline
                hint="Write whatever you want. Short or long is fine."
              />
              <ActionPill
                label={createReviewMutation.isPending ? 'Posting…' : 'Post review'}
                disabled={createReviewMutation.isPending || reviewContent.trim().length === 0}
                onPress={() => {
                  setActionMessage(null)
                  setActionError(null)
                  createReviewMutation.mutate()
                }}
              />
            </>
          ) : null}

          {reviewsQuery.isLoading ? <Text style={styles.helperText}>Loading reviews…</Text> : null}
          {reviewsQuery.isError ? <InfoBanner tone="error" text="Unable to load reviews right now." /> : null}
          <View style={styles.reviewList}>
            {reviewsQuery.data?.data.length ? (
              reviewsQuery.data.data.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  liking={likeReviewMutation.isPending}
                  onToggleLike={token ? (reviewId) => likeReviewMutation.mutate(reviewId) : undefined}
                />
              ))
            ) : (
              !reviewsQuery.isLoading ? <Text style={styles.helperText}>No reviews yet. Be the first to write one on mobile.</Text> : null
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
  actionCard: {
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
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPillActive: {
    borderColor: 'rgba(142,202,230,0.28)',
    backgroundColor: 'rgba(142,202,230,0.12)',
  },
  actionPillDisabled: {
    opacity: 0.55,
  },
  actionPillPressed: {
    opacity: 0.9,
  },
  actionPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  actionPillTextActive: {
    color: '#d7f2ff',
  },
  listSection: {
    gap: spacing.sm,
  },
  listTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  listButtons: {
    gap: spacing.sm,
  },
  listButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 4,
  },
  listButtonPressed: {
    opacity: 0.9,
  },
  listButtonTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  listButtonMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewList: {
    gap: spacing.md,
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

function ActionPill({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionPill,
        active ? styles.actionPillActive : null,
        disabled ? styles.actionPillDisabled : null,
        pressed && !disabled ? styles.actionPillPressed : null,
      ]}
    >
      <Text style={[styles.actionPillText, active ? styles.actionPillTextActive : null]}>{label}</Text>
    </Pressable>
  )
}
