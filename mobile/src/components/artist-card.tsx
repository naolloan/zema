import { StyleSheet, Text, View } from 'react-native'
import type { MobileArtistSummary } from '@/types'
import { Avatar } from '@/components/avatar'
import { colors, radius, spacing } from '@/theme/tokens'

export function ArtistCard({ artist }: { artist: MobileArtistSummary }) {
  return (
    <View style={styles.card}>
      <Avatar name={artist.name} size={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={styles.meta}>{artist.type === 'GROUP' ? 'Group' : 'Artist'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
})
