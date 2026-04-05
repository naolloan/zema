import { PropsWithChildren } from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { colors } from '@/theme/tokens'

export function ScreenShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
