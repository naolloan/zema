import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { InfoBanner } from '@/components/info-banner'
import { NotificationCard } from '@/components/notification-card'
import { PrimaryButton } from '@/components/primary-button'
import { ReleaseCard } from '@/components/release-card'
import { ScreenShell } from '@/components/screen-shell'
import { getMyDiary, getMyNotificationsPage, markMyNotificationsRead, markMyNotificationsUnread, markNotificationReadState } from '@/lib/auth-api'
import { mapWebTargetToMobilePath } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth-store'
import { colors, spacing } from '@/theme/tokens'

export default function ActivityScreen() {
  const token = useAuthStore((state) => state.token)
  const [segment, setSegment] = useState<'diary' | 'notifications'>('diary')
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all')
  const queryClient = useQueryClient()

  const diaryQuery = useQuery({
    queryKey: ['mobile-my-diary'],
    queryFn: () => getMyDiary(8, 0),
    enabled: Boolean(token && segment === 'diary'),
  })

  const notificationsQuery = useQuery({
    queryKey: ['mobile-my-notifications', notificationFilter],
    queryFn: () => getMyNotificationsPage(20, 0, notificationFilter),
    enabled: Boolean(token && segment === 'notifications'),
  })

  const markAllMutation = useMutation({
    mutationFn: async (state: 'read' | 'unread') => {
      if (state === 'read') {
        await markMyNotificationsRead()
        return
      }

      await markMyNotificationsUnread()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-notifications'] })
    },
  })

  const singleStateMutation = useMutation({
    mutationFn: ({ notificationId, state }: { notificationId: string; state: 'read' | 'unread' }) => markNotificationReadState(notificationId, state),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-notifications'] })
    },
  })

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        {token ? (
          <>
            <AppHeading eyebrow="Activity" title="Diary and notifications">
              Mobile now gives you both your listening trail and your incoming social activity in one place.
            </AppHeading>

            <View style={styles.segmentRow}>
              <PrimaryButton label="Diary" onPress={() => setSegment('diary')} variant={segment === 'diary' ? 'accent' : 'ghost'} />
              <PrimaryButton label="Notifications" onPress={() => setSegment('notifications')} variant={segment === 'notifications' ? 'accent' : 'ghost'} />
            </View>

            {segment === 'diary' ? (
              <>
                <FeatureCard title="Your recent diary">
                  This becomes the quick mobile destination for the releases you logged most recently.
                </FeatureCard>

                {diaryQuery.isLoading ? <Text style={styles.helperText}>Loading your latest diary entries…</Text> : null}
                {diaryQuery.isError ? <InfoBanner tone="error" text="Unable to load your diary right now." /> : null}

                <View style={styles.entries}>
                  {diaryQuery.data?.data.length ? (
                    diaryQuery.data.data.map((entry) => (
                      <View key={entry.id} style={styles.entryCard}>
                        <ReleaseCard release={entry.release} />
                        <Text style={styles.entryMeta}>
                          Logged {new Date(entry.listenedAt).toLocaleDateString()}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </Text>
                      </View>
                    ))
                  ) : (
                    !diaryQuery.isLoading ? <Text style={styles.helperText}>No diary entries yet. Log a release from its mobile release page.</Text> : null
                  )}
                </View>
              </>
            ) : (
              <>
                <FeatureCard title="Your notifications">
                  Follows, review likes, review comments, and list likes now have a real mobile home.
                </FeatureCard>

                <View style={styles.segmentRow}>
                  <PrimaryButton label="All" onPress={() => setNotificationFilter('all')} variant={notificationFilter === 'all' ? 'accent' : 'ghost'} />
                  <PrimaryButton label="Unread" onPress={() => setNotificationFilter('unread')} variant={notificationFilter === 'unread' ? 'accent' : 'ghost'} />
                </View>

                <View style={styles.bulkActions}>
                  <PrimaryButton label="Mark all read" onPress={() => markAllMutation.mutate('read')} variant="ghost" loading={markAllMutation.isPending} />
                  <PrimaryButton label="Mark all unread" onPress={() => markAllMutation.mutate('unread')} variant="ghost" loading={markAllMutation.isPending} />
                </View>

                {notificationsQuery.isLoading ? <Text style={styles.helperText}>Loading notifications…</Text> : null}
                {notificationsQuery.isError ? <InfoBanner tone="error" text="Unable to load notifications right now." /> : null}

                <View style={styles.entries}>
                  {notificationsQuery.data?.data.length ? (
                    notificationsQuery.data.data.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        disabled={singleStateMutation.isPending}
                        onToggleRead={() => singleStateMutation.mutate({ notificationId: notification.id, state: notification.unread ? 'read' : 'unread' })}
                        onPress={() => {
                          const target = mapWebTargetToMobilePath(notification.targetUrl)
                          if (!target) {
                            return
                          }

                          if (notification.unread) {
                            singleStateMutation.mutate({ notificationId: notification.id, state: 'read' })
                          }

                          router.push(target)
                        }}
                      />
                    ))
                  ) : (
                    !notificationsQuery.isLoading ? <Text style={styles.helperText}>No notifications here yet.</Text> : null
                  )}
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <AppHeading eyebrow="Activity" title="Your activity starts after sign in">
              Sign in to see your diary and notifications here, then watch the mobile app start to feel like your personal music home.
            </AppHeading>

            <FeatureCard title="What this tab holds">
              Your latest logs, your incoming notifications, and eventually the broader social activity around your account.
            </FeatureCard>

            <PrimaryButton label="Go to sign in" onPress={() => router.push('/(auth)/login')} variant="ghost" />
          </>
        )}
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  entries: {
    gap: spacing.md,
  },
  entryCard: {
    gap: spacing.sm,
  },
  entryMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentRow: {
    gap: spacing.sm,
  },
  bulkActions: {
    gap: spacing.sm,
  },
})
