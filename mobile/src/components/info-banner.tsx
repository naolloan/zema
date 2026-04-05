import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '@/theme/tokens'

export function InfoBanner({
  tone = 'info',
  text,
}: {
  tone?: 'info' | 'error' | 'warning' | 'success'
  text: string
}) {
  return (
    <View style={[styles.banner, toneStyles[tone].container]}>
      <Text style={[styles.text, toneStyles[tone].text]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
  },
})

const toneStyles = {
  info: StyleSheet.create({
    container: {
      borderColor: 'rgba(142,202,230,0.28)',
      backgroundColor: 'rgba(142,202,230,0.1)',
    },
    text: {
      color: '#d7f2ff',
    },
  }),
  error: StyleSheet.create({
    container: {
      borderColor: 'rgba(255,123,84,0.28)',
      backgroundColor: 'rgba(255,123,84,0.1)',
    },
    text: {
      color: '#ffd8cf',
    },
  }),
  warning: StyleSheet.create({
    container: {
      borderColor: 'rgba(244,211,94,0.3)',
      backgroundColor: 'rgba(244,211,94,0.1)',
    },
    text: {
      color: '#fff2bf',
    },
  }),
  success: StyleSheet.create({
    container: {
      borderColor: 'rgba(72,199,116,0.28)',
      backgroundColor: 'rgba(72,199,116,0.1)',
    },
    text: {
      color: '#d3ffe2',
    },
  }),
}
