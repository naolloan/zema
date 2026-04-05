import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { ListCard } from '@/components/list-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { getListById, likeList, unlikeList } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const listId = Array.isArray(id) ? id[0] : id
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['mobile-list-detail', listId],
    queryFn: () => getListById(listId),
    enabled: Boolean(listId),
  })

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

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="List" title={list.title}>
          {list.description || 'A public list from the Zeማa community.'}
        </AppHeading>

        <ListCard list={list} />

        <FeatureCard title="List details">
          {list.itemsCount} items · {list.likesCount || 0} likes · {list.isPublic ? 'Public' : 'Private'}
        </FeatureCard>

        {token ? (
          <PrimaryButton
            label={likeMutation.isPending ? 'Working…' : list.isLiked ? 'Unlike list' : 'Like list'}
            onPress={() => likeMutation.mutate()}
            variant={list.isLiked ? 'ghost' : 'accent'}
            loading={likeMutation.isPending}
          />
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
          <View style={styles.commentList}>
            {list.comments?.length ? (
              list.comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <Text style={styles.commentAuthor}>{comment.user.displayName || comment.user.username}</Text>
                  <Text style={styles.commentBody}>{comment.content}</Text>
                </View>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 6,
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
})
