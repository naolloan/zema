import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeading } from '@/components/app-heading'
import { Avatar } from '@/components/avatar'
import { InfoBanner } from '@/components/info-banner'
import { PrimaryButton } from '@/components/primary-button'
import { ScreenShell } from '@/components/screen-shell'
import { TextField } from '@/components/text-field'
import { changePassword, deleteMyAccount, getMyProfile, logoutUser, updateMyProfile } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import { colors, radius, spacing } from '@/theme/tokens'
import type { CommentPermission } from '@/types'

const permissionOptions: Array<{ label: string; value: CommentPermission; description: string }> = [
  { label: 'Anyone', value: 'ANYONE', description: 'Anyone on Zeማa can comment on your reviews and lists.' },
  { label: 'Following', value: 'FOLLOWING', description: 'Only people you follow can comment.' },
  { label: 'Just You', value: 'SELF', description: 'Only you can comment on your own public content.' },
]

export default function ProfileSettingsScreen() {
  const token = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['mobile-my-profile-full'],
    queryFn: () => getMyProfile(),
    enabled: Boolean(token),
  })

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    commentPermission: 'FOLLOWING' as CommentPermission,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmation: '',
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!profileQuery.data) {
      return
    }

    setForm({
      username: profileQuery.data.username || '',
      displayName: profileQuery.data.displayName || '',
      bio: profileQuery.data.bio || '',
      avatarUrl: profileQuery.data.avatarUrl || '',
      commentPermission: profileQuery.data.commentPermission || 'FOLLOWING',
    })
  }, [profileQuery.data])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        username: form.username.trim(),
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        commentPermission: form.commentPermission,
      }),
    onSuccess: async (updatedProfile) => {
      setErrorMessage(null)
      setSuccessMessage('Settings saved.')
      await setUser({
        id: updatedProfile.id,
        email: updatedProfile.email,
        username: updatedProfile.username,
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        avatarUrl: updatedProfile.avatarUrl,
        emailVerifiedAt: updatedProfile.emailVerifiedAt,
        commentPermission: updatedProfile.commentPermission,
        counts: updatedProfile.counts,
        createdAt: updatedProfile.createdAt,
      })
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-profile-full'] })
    },
    onError: (caught: any) => {
      setSuccessMessage(null)
      setErrorMessage(caught?.response?.data?.error || 'Unable to save your settings right now.')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      }),
    onSuccess: () => {
      setErrorMessage(null)
      setSuccessMessage('Password updated.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (caught: any) => {
      setSuccessMessage(null)
      setErrorMessage(caught?.response?.data?.error || 'Unable to change your password right now.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteMyAccount({
        confirmation: deleteForm.confirmation,
        currentPassword: deleteForm.currentPassword || undefined,
      }),
    onSuccess: async () => {
      try {
        await logoutUser()
      } catch {
        // Safe to ignore when the server session is already gone.
      }
      await clearSession()
      router.replace('/(auth)/login')
    },
    onError: (caught: any) => {
      setSuccessMessage(null)
      setErrorMessage(caught?.response?.data?.error || 'Unable to delete your account right now.')
    },
  })

  if (!token) {
    return (
      <ScreenShell>
        <View style={styles.center}>
          <Text style={styles.helperText}>Sign in first to manage account settings.</Text>
        </View>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Settings" title="Account settings">
          Keep profile browsing clean on mobile while moving editing, permissions, password changes, and account deletion into one safer place.
        </AppHeading>

        {profileQuery.data ? (
          <View style={styles.profileCard}>
            <Avatar uri={form.avatarUrl || profileQuery.data.avatarUrl} name={form.displayName || form.username} size={72} />
            <View style={styles.profileBody}>
              <Text style={styles.profileName}>{form.displayName || profileQuery.data.displayName || form.username}</Text>
              <Text style={styles.profileMeta}>{profileQuery.data.email || 'No email on file'}</Text>
              <Text style={styles.profileMeta}>{profileQuery.data.emailVerifiedAt ? 'Email verified' : 'Email verification pending'}</Text>
            </View>
          </View>
        ) : null}

        {successMessage ? <InfoBanner tone="success" text={successMessage} /> : null}
        {errorMessage ? <InfoBanner tone="error" text={errorMessage} /> : null}
        {profileQuery.isLoading ? <Text style={styles.helperText}>Loading your settings…</Text> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TextField label="Username" value={form.username} onChangeText={(value) => setForm((current) => ({ ...current, username: value }))} hint="Usernames stay unique and become part of your public profile URL." autoCapitalize="none" autoCorrect={false} />
          <TextField label="Display name" value={form.displayName} onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))} />
          <TextField label="Bio" value={form.bio} onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))} multiline hint="Short, long, serious, playful. This can sound however you want." />
          <TextField label="Avatar URL" value={form.avatarUrl} onChangeText={(value) => setForm((current) => ({ ...current, avatarUrl: value }))} autoCapitalize="none" autoCorrect={false} hint="Paste an image URL for now. Native gallery upload can layer in next." />
          <PrimaryButton label={updateMutation.isPending ? 'Saving…' : 'Save profile changes'} onPress={() => updateMutation.mutate()} loading={updateMutation.isPending} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Comment permissions</Text>
          <Text style={styles.helperText}>Choose who can comment on your public reviews and lists.</Text>
          <View style={styles.permissionStack}>
            {permissionOptions.map((option) => (
              <PrimaryButton
                key={option.value}
                label={`${option.label} · ${option.description}`}
                onPress={() => setForm((current) => ({ ...current, commentPermission: option.value }))}
                variant={form.commentPermission === option.value ? 'accent' : 'ghost'}
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <TextField label="Current password" value={passwordForm.currentPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <TextField label="New password" value={passwordForm.newPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <TextField label="Confirm password" value={passwordForm.confirmPassword} onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <PrimaryButton label={passwordMutation.isPending ? 'Updating…' : 'Change password'} onPress={() => passwordMutation.mutate()} loading={passwordMutation.isPending} />
        </View>

        <View style={[styles.sectionCard, styles.dangerCard]}>
          <Text style={styles.sectionTitle}>Delete account</Text>
          <Text style={styles.helperText}>Type DELETE and confirm with your current password if your account uses one.</Text>
          <TextField label="Current password" value={deleteForm.currentPassword} onChangeText={(value) => setDeleteForm((current) => ({ ...current, currentPassword: value }))} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <TextField label="Type DELETE" value={deleteForm.confirmation} onChangeText={(value) => setDeleteForm((current) => ({ ...current, confirmation: value }))} autoCapitalize="characters" autoCorrect={false} />
          <PrimaryButton label={deleteMutation.isPending ? 'Deleting…' : 'Delete account'} onPress={() => deleteMutation.mutate()} loading={deleteMutation.isPending} variant="ghost" />
        </View>
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  profileCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  profileBody: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  profileMeta: {
    color: colors.textSoft,
    fontSize: 13,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dangerCard: {
    borderColor: 'rgba(255,123,84,0.28)',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  permissionStack: {
    gap: spacing.sm,
  },
})
