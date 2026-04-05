import { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '@/theme/tokens'

export function FeatureCard({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
})
