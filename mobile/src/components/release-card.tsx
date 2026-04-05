import { Link } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MobileReleaseSummary } from '@/types'
import { formatArtistCredits, formatRatingValue, formatReleaseType } from '@/lib/format'
import { colors, radius, spacing } from '@/theme/tokens'

export function ReleaseCard({ release }: { release: MobileReleaseSummary }) {
  return (
    <Link href={`/releases/${release.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
        {release.artworkUrl ? (
          <Image source={{ uri: release.artworkUrl }} style={styles.artwork} />
        ) : (
          <View style={styles.fallbackArtwork}>
            <Text style={styles.fallbackText}>{release.title.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {release.title}
            </Text>
            <Text style={styles.type}>{formatReleaseType(release.type)}</Text>
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {formatArtistCredits(release.artistCredits)}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {release.averageRating ? `${formatRatingValue(release.averageRating)} avg` : 'No rating yet'}
            </Text>
            <Text style={styles.metaText}>
              {release.counts?.reviews || release.ratingCount || 0} ratings
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  fallbackArtwork: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  type: {
    color: colors.accentSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
})
