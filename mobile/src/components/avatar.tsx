import { Image, StyleSheet, Text, View } from 'react-native'
import { UserRound } from 'lucide-react-native'
import { colors } from '@/theme/tokens'

export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string | null
  name?: string | null
  size?: number
}) {
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
  }

  const fallback = name?.trim()?.slice(0, 1)?.toUpperCase()

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      {fallback ? <Text style={[styles.fallbackText, { fontSize: Math.max(14, size * 0.34) }]}>{fallback}</Text> : <UserRound color={colors.textSoft} size={size * 0.44} />}
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceMuted,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackText: {
    color: colors.text,
    fontWeight: '700',
  },
})
