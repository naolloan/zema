import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { requestPasswordReset } from '@/lib/auth-api'
import { spacing } from '@/theme/tokens'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleReset() {
    if (!email.trim()) {
      setError('Enter the email for the account you want to recover.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await requestPasswordReset(email.trim())
      setMessage(
        result.deliveryMode === 'preview'
          ? 'Reset is in development preview mode. Use the backend preview link while email delivery is still being finalized.'
          : 'Reset instructions were sent if that email belongs to an account.',
      )
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to start password reset right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppHeading eyebrow="Reset Password" title="Recover your account">
            Enter the email attached to your account and we will start the reset flow.
          </AppHeading>

          <View style={styles.form}>
            <TextField label="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />

            {error ? <InfoBanner tone="error" text={error} /> : null}
            {message ? <InfoBanner tone="info" text={message} /> : null}

            <PrimaryButton label="Send reset instructions" onPress={handleReset} loading={loading} />
            <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} variant="ghost" />
          </View>
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
})
