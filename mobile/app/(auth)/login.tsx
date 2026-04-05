import { Link, router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { loginUser } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Enter your email or username and password.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const session = await loginUser({
        email: email.trim(),
        password,
      })
      await setSession(session)
      router.replace('/(tabs)/profile')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppHeading eyebrow="Sign In" title="Pick up where you left off">
            Sign in to reach your mobile profile, diary, lists, and listening activity.
          </AppHeading>

          <View style={styles.form}>
            <TextField
              label="Email or username"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <InfoBanner tone="error" text={error} /> : null}

            <PrimaryButton label="Sign in" onPress={handleLogin} loading={loading} />
            <PrimaryButton label="Forgot password" onPress={() => router.push('/(auth)/forgot-password')} variant="ghost" />
          </View>

          <Text style={styles.footerText}>
            New here?{' '}
            <Link href="/(auth)/register" style={styles.link}>
              Create an account
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  form: {
    gap: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },
  link: {
    color: colors.accentSoft,
    fontWeight: '700',
  },
})
