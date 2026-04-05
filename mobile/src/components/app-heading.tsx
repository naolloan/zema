import { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '@/theme/tokens'

export function AppHeading({
  eyebrow,
  title,
  children,
}: PropsWithChildren<{ eyebrow?: string; title: string }>) {
  return (
    <View style={styles.wrapper}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {children ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
})
