import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { Avatar } from '@/components/avatar'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { addListComment, deleteList, getListById, likeList, unlikeList, updateList } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, radius, spacing } from '@/theme/tokens'
import type { ListCategory } from '@/types'

const categoryOptions: Array<{ label: string; value: ListCategory }> = [
  { label: 'Mixed', value: 'MIXED' },
  { label: 'Albums', value: 'ALBUMS' },
  { label: 'Songs', value: 'SINGLES' },
  { label: 'EPs', value: 'EPS' },
  { label: 'Mixtapes', value: 'MIXTAPES' },
]

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const listId = Array.isArray(id) ? id[0] : id
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ListCategory>('MIXED')
  const [isPublic, setIsPublic] = useState(false)

  const listQuery = useQuery({
    queryKey: ['mobile-list-detail', listId],
    queryFn: () => getListById(listId),
    enabled: Boolean(listId),
  })

  useEffect(() => {
    if (!listQuery.data) {
      return
    }

    setTitle(listQuery.data.title)
    setDescription(listQuery.data.description || '')
    setCategory(listQuery.data.category)
    setIsPublic(listQuery.data.isPublic)
  }, [listQuery.data])

  const likeMutation = useMutation({
    mutationFn: async () => {
      const current = listQuery.data
      if (!current) {
        return
      }

      if (current.isLiked) {
        return unlikeList(listId)
      }

      return likeList(listId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-list-detail', listId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-discover-lists'] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-lists-dashboard'] })
    },
  })

  const commentMutation = useMutation({
    mutationFn: () => addListComment(listId, { content: commentDraft.trim() }),
    onSuccess: async () => {
      setActionError(null)
      setActionMessage('Comment posted.')
      setCommentDraft('')
      await queryClient.invalidateQueries({ queryKey: ['mobile-list-detail', listId] })
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to comment on this list right now.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateList(listId, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        isPublic,
      }),
    onSuccess: async () => {
      setActionError(null)
      setActionMessage('List updated.')
      await queryClient.invalidateQueries({ queryKey: ['mobile-list-detail', listId] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-lists-dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-discover-lists'] })
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to update this list right now.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(listId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-lists-dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['mobile-discover-lists'] })
      router.replace('/lists')
    },
    onError: (caught: any) => {
      setActionMessage(null)
      setActionError(caught?.response?.data?.error || 'Unable to delete this list right now.')
    },
  })

  if (listQuery.isLoading) {
    return (
      <ScreenShell>
        <View style={styles.center}>
          <Text style={styles.helperText}>Loading list…</Text>
        </View>
      </ScreenShell>
    )
  }

  if (listQuery.isError || !listQuery.data) {
    return (
      <ScreenShell>
        <View style={styles.content}>
          <InfoBanner tone="error" text="Unable to open this list right now." />
        </View>
      </ScreenShell>
    )
  }

  const list = listQuery.data
  const isOwner = user?.id === list.user?.id

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="List" title={list.title}>
          {list.description || 'A public list from the Zeማa community.'}
        </AppHeading>

        <ListCard list={list} />

        {list.user ? (
          <Pressable onPress={() => router.push(`/users/${list.user.id}`)} style={({ pressed }) => [styles.ownerCard, pressed ? styles.pressed : null]}>
            <Avatar uri={list.user.avatarUrl} name={list.user.displayName || list.user.username} size={40} />
            <View style={styles.ownerBody}>
              <Text style={styles.ownerName}>{list.user.displayName || list.user.username}</Text>
              <Text style={styles.ownerMeta}>@{list.user.username}</Text>
            </View>
          </Pressable>
        ) : null}

        <FeatureCard title="List details">
          {list.itemsCount} items · {list.likesCount || 0} likes · {list.isPublic ? 'Public' : 'Private'}
        </FeatureCard>

        {actionMessage ? <InfoBanner tone="success" text={actionMessage} /> : null}
        {actionError ? <InfoBanner tone="error" text={actionError} /> : null}

        {token ? (
          <PrimaryButton
            label={likeMutation.isPending ? 'Working…' : list.isLiked ? 'Unlike list' : 'Like list'}
            onPress={() => likeMutation.mutate()}
            variant={list.isLiked ? 'ghost' : 'accent'}
            loading={likeMutation.isPending}
          />
        ) : null}

        {isOwner ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Edit this list</Text>
            <TextField label="List name" value={title} onChangeText={setTitle} />
            <TextField label="Description" value={description} onChangeText={setDescription} multiline />
            <PrimaryButton label={isPublic ? 'Public list' : 'Private list'} onPress={() => setIsPublic((current) => !current)} variant={isPublic ? 'accent' : 'ghost'} />
            <View style={styles.categoryGrid}>
              {categoryOptions.map((option) => (
                <PrimaryButton key={option.value} label={option.label} onPress={() => setCategory(option.value)} variant={category === option.value ? 'accent' : 'ghost'} />
              ))}
            </View>
            <PrimaryButton label={updateMutation.isPending ? 'Saving…' : 'Save changes'} onPress={() => updateMutation.mutate()} loading={updateMutation.isPending} disabled={title.trim().length === 0} />
            <PrimaryButton label={deleteMutation.isPending ? 'Deleting…' : 'Delete list'} onPress={() => deleteMutation.mutate()} loading={deleteMutation.isPending} variant="ghost" />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Releases in this list</Text>
          <View style={styles.releaseList}>
            {list.items?.length ? (
              list.items.map((item) => <ReleaseCard key={item.id} release={item.release} />)
            ) : (
              <Text style={styles.helperText}>No releases in this list yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {token ? (
            <View style={styles.sectionCard}>
              <TextField label="Add a comment" value={commentDraft} onChangeText={setCommentDraft} multiline hint="Say whatever you want about this list." />
              <PrimaryButton label={commentMutation.isPending ? 'Posting…' : 'Post comment'} onPress={() => commentMutation.mutate()} loading={commentMutation.isPending} disabled={commentDraft.trim().length === 0} />
            </View>
          ) : null}
          <View style={styles.commentList}>
            {list.comments?.length ? (
              list.comments.map((comment) => (
                <Pressable key={comment.id} onPress={() => router.push(`/users/${comment.user.id}`)} style={({ pressed }) => [styles.commentCard, pressed ? styles.pressed : null]}>
                  <Avatar uri={comment.user.avatarUrl} name={comment.user.displayName || comment.user.username} size={34} />
                  <View style={styles.commentBodyWrap}>
                    <Text style={styles.commentAuthor}>{comment.user.displayName || comment.user.username}</Text>
                    <Text style={styles.commentBody}>{comment.content}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.helperText}>No comments on this list yet.</Text>
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
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: spacing.sm,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  releaseList: {
    gap: spacing.md,
  },
  commentList: {
    gap: spacing.sm,
  },
  commentCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  commentBodyWrap: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  commentBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  ownerCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  ownerBody: {
    flex: 1,
    gap: 2,
  },
  ownerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ownerMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  categoryGrid: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
})
