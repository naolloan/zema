import { Stack } from 'expo-router'
import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { MobileQueryProvider } from '@/providers/query-provider'
import { useAuthStore } from '@/store/auth-store'
import { colors } from '@/theme/tokens'

function AppBootstrap({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated)
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="small" />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <MobileQueryProvider>
      <AppBootstrap>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AppBootstrap>
    </MobileQueryProvider>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})
