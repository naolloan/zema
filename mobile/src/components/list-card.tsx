import { Link } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MobileListSummary } from '@/types'
import { colors, radius, spacing } from '@/theme/tokens'

export function ListCard({ list }: { list: MobileListSummary }) {
  const previews = list.previewReleases?.slice(0, 3) || []

  return (
    <Link href={`/lists/${list.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
        <View style={styles.previewRow}>
          {previews.length ? (
            previews.map((release) =>
              release.artworkUrl ? (
                <Image key={release.id} source={{ uri: release.artworkUrl }} style={styles.previewImage} />
              ) : (
                <View key={release.id} style={styles.previewFallback}>
                  <Text style={styles.previewFallbackText}>{release.title.slice(0, 1).toUpperCase()}</Text>
                </View>
              ),
            )
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyPreviewText}>No items yet</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{list.title}</Text>
          <Text style={styles.meta}>
            {list.itemsCount} items · {list.likesCount || 0} likes
          </Text>
          {list.description ? <Text style={styles.description} numberOfLines={2}>{list.description}</Text> : null}
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  previewRow: {
    flexDirection: 'row',
    height: 110,
  },
  previewImage: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  previewFallback: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyPreview: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: spacing.md,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
})
