import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '@/theme/tokens'

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'accent',
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'accent' | 'ghost'
}) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' ? styles.ghost : styles.accent,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.text : '#111318'} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'ghost' ? styles.ghostLabel : styles.accentLabel]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.65,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  accentLabel: {
    color: '#111318',
  },
  ghostLabel: {
    color: colors.text,
  },
})
