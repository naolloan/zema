'use client'

const NOTIFICATION_COUNT_EVENT = 'zema:notification-count'

export function emitNotificationCount(unreadCount: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<number>(NOTIFICATION_COUNT_EVENT, {
      detail: unreadCount,
    }),
  )
}

export function subscribeToNotificationCount(listener: (unreadCount: number) => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<number>
    listener(customEvent.detail ?? 0)
  }

  window.addEventListener(NOTIFICATION_COUNT_EVENT, handler)
  return () => window.removeEventListener(NOTIFICATION_COUNT_EVENT, handler)
}
