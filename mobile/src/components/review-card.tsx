import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { MobileReview } from '@/types'
import { Avatar } from '@/components/avatar'
import { TextField } from '@/components/text-field'
import { colors, radius, spacing } from '@/theme/tokens'

export function ReviewCard({
  review,
  onToggleLike,
  onAddComment,
  liking = false,
  commenting = false,
  allowComments = false,
}: {
  review: MobileReview
  onToggleLike?: (reviewId: string) => void
  onAddComment?: (reviewId: string, content: string) => void
  liking?: boolean
  commenting?: boolean
  allowComments?: boolean
}) {
  const [showComments, setShowComments] = useState(review.comments.length > 0)
  const [commentDraft, setCommentDraft] = useState('')

  return (
    <View style={styles.card}>
      <Pressable onPress={() => router.push(`/users/${review.user.id}`)} style={({ pressed }) => [styles.header, pressed ? styles.headerPressed : null]}>
        <Avatar uri={review.user.avatarUrl} name={review.user.displayName || review.user.username} size={40} />
        <View style={styles.headerBody}>
          <Text style={styles.author}>{review.user.displayName || review.user.username}</Text>
          <Text style={styles.meta}>
            @{review.user.username} · {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>

      <Text style={styles.content}>{review.content}</Text>

      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {review.likesCount} like{review.likesCount === 1 ? '' : 's'} · {review.comments.length} comment{review.comments.length === 1 ? '' : 's'}
        </Text>
        <View style={styles.footerActions}>
          <Pressable onPress={() => setShowComments((current) => !current)} style={({ pressed }) => [styles.commentButton, pressed ? styles.buttonPressed : null]}>
            <Text style={styles.commentButtonText}>{showComments ? 'Hide comments' : 'Comments'}</Text>
          </Pressable>
          {onToggleLike ? (
            <Pressable
              disabled={liking}
              onPress={() => onToggleLike(review.id)}
              style={({ pressed }) => [styles.likeButton, review.isLiked ? styles.likeButtonActive : null, pressed ? styles.buttonPressed : null]}
            >
              <Text style={[styles.likeButtonText, review.isLiked ? styles.likeButtonTextActive : null]}>{liking ? 'Working…' : review.isLiked ? 'Liked' : 'Like'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showComments ? (
        <View style={styles.commentsSection}>
          {review.comments.length ? (
            review.comments.map((comment) => (
              <Pressable
                key={comment.id}
                onPress={() => router.push(`/users/${comment.user.id}`)}
                style={({ pressed }) => [styles.commentCard, pressed ? styles.headerPressed : null]}
              >
                <Avatar uri={comment.user.avatarUrl} name={comment.user.displayName || comment.user.username} size={28} />
                <View style={styles.commentBodyWrap}>
                  <Text style={styles.commentAuthor}>{comment.user.displayName || comment.user.username}</Text>
                  <Text style={styles.commentBody}>{comment.content}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No comments yet.</Text>
          )}

          {allowComments && onAddComment ? (
            <View style={styles.composer}>
              <TextField
                label="Add a comment"
                value={commentDraft}
                onChangeText={setCommentDraft}
                multiline
                hint="Keep it as short or long as you want."
              />
              <Pressable
                disabled={commenting || commentDraft.trim().length === 0}
                onPress={() => {
                  const nextContent = commentDraft.trim()
                  if (!nextContent) {
                    return
                  }
                  onAddComment(review.id, nextContent)
                  setCommentDraft('')
                  setShowComments(true)
                }}
                style={({ pressed }) => [styles.inlineAction, (commenting || commentDraft.trim().length === 0) ? styles.inlineActionDisabled : null, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.inlineActionText}>{commenting ? 'Posting…' : 'Post comment'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
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
  headerPressed: {
    opacity: 0.88,
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
  footerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  footerMeta: {
    color: colors.textSoft,
    fontSize: 12,
    flex: 1,
  },
  likeButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentButton: {
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
  buttonPressed: {
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
  commentButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  commentsSection: {
    gap: spacing.sm,
  },
  commentCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  commentBodyWrap: {
    flex: 1,
    gap: 2,
  },
  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  commentBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 13,
  },
  composer: {
    gap: spacing.sm,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inlineActionDisabled: {
    opacity: 0.6,
  },
  inlineActionText: {
    color: '#111318',
    fontSize: 12,
    fontWeight: '700',
  },
})
