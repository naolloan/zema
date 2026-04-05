import { forwardRef } from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { colors, radius, spacing } from '@/theme/tokens'

interface TextFieldProps extends TextInputProps {
  label?: string
  hint?: string
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, style, ...props },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textSoft}
        style={[styles.input, props.multiline ? styles.multiline : null, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  multiline: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
})
