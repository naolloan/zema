import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { MobileReview } from '@/types'
import { colors, radius, spacing } from '@/theme/tokens'

export function ReviewCard({
  review,
  onToggleLike,
  liking = false,
}: {
  review: MobileReview
  onToggleLike?: (reviewId: string) => void
  liking?: boolean
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(review.user.displayName || review.user.username || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.author}>{review.user.displayName || review.user.username}</Text>
          <Text style={styles.meta}>
            @{review.user.username} · {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.content}>{review.content}</Text>

      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {review.likesCount} like{review.likesCount === 1 ? '' : 's'} · {review.comments.length} comment{review.comments.length === 1 ? '' : 's'}
        </Text>
        {onToggleLike ? (
          <Pressable
            disabled={liking}
            onPress={() => onToggleLike(review.id)}
            style={({ pressed }) => [styles.likeButton, review.isLiked ? styles.likeButtonActive : null, pressed ? styles.likeButtonPressed : null]}
          >
            <Text style={[styles.likeButtonText, review.isLiked ? styles.likeButtonTextActive : null]}>{liking ? 'Working…' : review.isLiked ? 'Liked' : 'Like'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  author: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  content: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  likeButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  likeButtonActive: {
    borderColor: 'rgba(244,211,94,0.28)',
    backgroundColor: 'rgba(244,211,94,0.12)',
  },
  likeButtonPressed: {
    opacity: 0.88,
  },
  likeButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  likeButtonTextActive: {
    color: '#f8e7a2',
  },
})
