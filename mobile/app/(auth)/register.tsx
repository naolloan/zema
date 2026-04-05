import { Link, router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { registerUser } from '@/lib/auth-api'
import { colors, spacing } from '@/theme/tokens'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRegister() {
    if (!email.trim() || !username.trim() || !password) {
      setError('Email, username, and password are required.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await registerUser({
        email: email.trim(),
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      })

      setMessage(
        result.deliveryMode === 'preview'
          ? 'Account created. Verification is in preview mode for now, so use the development link from the backend response when needed.'
          : 'Account created. Check your email and verify before signing in.',
      )
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to create your account right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppHeading eyebrow="Create Account" title="Claim your mobile corner of the catalog">
            Start with your identity first. Reviews, diary entries, favorites, and lists will grow from there.
          </AppHeading>

          <View style={styles.form}>
            <TextField label="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextField label="Username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} hint="Choose the unique name people will find you by." />
            <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <TextField label="Display name" value={displayName} onChangeText={setDisplayName} />
            <TextField label="Short bio" value={bio} onChangeText={setBio} multiline />

            {error ? <InfoBanner tone="error" text={error} /> : null}
            {message ? <InfoBanner tone="info" text={message} /> : null}

            <PrimaryButton label="Create account" onPress={handleRegister} loading={loading} />
          </View>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </Text>

          <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} variant="ghost" />
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
