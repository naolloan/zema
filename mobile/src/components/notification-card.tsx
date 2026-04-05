import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell, Heart, MessageSquareText, UserPlus } from 'lucide-react-native'
import type { MobileNotificationItem } from '@/types'
import { Avatar } from '@/components/avatar'
import { colors, radius, spacing } from '@/theme/tokens'

function NotificationIcon({ type }: { type: MobileNotificationItem['type'] }) {
  switch (type) {
    case 'follow':
      return <UserPlus color={colors.accent} size={16} />
    case 'review_like':
    case 'list_like':
      return <Heart color={colors.danger} size={16} />
    case 'review_comment':
      return <MessageSquareText color={colors.accentSoft} size={16} />
    default:
      return <Bell color={colors.textSoft} size={16} />
  }
}

export function NotificationCard({
  notification,
  onPress,
  onToggleRead,
  disabled = false,
}: {
  notification: MobileNotificationItem
  onPress?: () => void
  onToggleRead?: () => void
  disabled?: boolean
}) {
  return (
    <View style={[styles.card, notification.unread ? styles.cardUnread : null]}>
      <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.topRow, pressed ? styles.pressed : null]}>
        <View style={styles.identityRow}>
          <Avatar uri={notification.user.avatarUrl} name={notification.user.displayName || notification.user.username} size={40} />
          <View style={styles.body}>
            <Text style={styles.text}>{notification.text}</Text>
            <Text style={styles.meta}>{new Date(notification.createdAt).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.iconBadge}>
          <NotificationIcon type={notification.type} />
        </View>
      </Pressable>

      <View style={styles.footer}>
        <Text style={[styles.stateText, notification.unread ? styles.stateTextUnread : null]}>
          {notification.unread ? 'Unread' : 'Read'}
        </Text>
        {onToggleRead ? (
          <Pressable onPress={onToggleRead} style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}>
            <Text style={styles.actionText}>{notification.unread ? 'Mark read' : 'Mark unread'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardUnread: {
    borderColor: 'rgba(244,211,94,0.26)',
    backgroundColor: '#151d28',
  },
  pressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stateTextUnread: {
    color: colors.accent,
  },
  action: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionPressed: {
    opacity: 0.88,
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
})
