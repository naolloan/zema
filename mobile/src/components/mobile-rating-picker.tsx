import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Star, X } from 'lucide-react-native'
import { MOBILE_RATING_VALUES, formatRatingValue } from '@/lib/format'
import { colors, spacing } from '@/theme/tokens'

export function MobileRatingPicker({
  value,
  onRate,
  onClear,
  disabled = false,
}: {
  value?: number | null
  onRate: (value: number) => void
  onClear?: () => void
  disabled?: boolean
}) {
  const displayedRating = value ?? 0
  const fillWidth = `${(displayedRating / 5) * 100}%`

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>Your rating</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{value ? `${formatRatingValue(value)} / 5` : 'No rating yet'}</Text>
        </View>
      </View>

      <View style={styles.starArea}>
        <View style={styles.baseStars}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star key={`base-${index}`} size={30} color="rgba(255,255,255,0.16)" fill="rgba(255,255,255,0.16)" />
          ))}
        </View>

        <View pointerEvents="none" style={[styles.fillOverlay, { width: fillWidth }]}>
          <View style={styles.fillStars}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={`fill-${index}`} size={30} color={colors.accent} fill={colors.accent} />
            ))}
          </View>
        </View>

        <View style={styles.tapTargets}>
          {MOBILE_RATING_VALUES.map((ratingValue) => (
            <Pressable
              key={ratingValue}
              style={styles.tapTarget}
              disabled={disabled}
              onPress={() => onRate(ratingValue)}
            />
          ))}
        </View>
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>0.5</Text>
        <Text style={styles.scaleText}>5</Text>
      </View>

      <Text style={styles.hint}>Tap the left half of a star for a half-step and the right half for a full star.</Text>

      {value && onClear ? (
        <Pressable style={styles.clearRow} onPress={onClear} disabled={disabled}>
          <X size={14} color={colors.accentSoft} />
          <Text style={styles.clearText}>Clear rating</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,211,94,0.28)',
    backgroundColor: 'rgba(244,211,94,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#f8e7a2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  starArea: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  baseStars: {
    flexDirection: 'row',
    gap: 4,
  },
  fillOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  fillStars: {
    flexDirection: 'row',
    gap: 4,
  },
  tapTargets: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
  },
  tapTarget: {
    width: 17,
    height: 30,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  clearText: {
    color: colors.accentSoft,
    fontSize: 13,
    fontWeight: '700',
  },
})
