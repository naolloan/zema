export function mapWebTargetToMobilePath(targetUrl?: string | null) {
  if (!targetUrl) {
    return null
  }

  const path = targetUrl.replace(/^https?:\/\/[^/]+/i, '').split('#')[0]

  const releaseMatch = path.match(/^\/releases\/([^/]+)/)
  if (releaseMatch) {
    return `/releases/${releaseMatch[1]}`
  }

  const listMatch = path.match(/^\/lists\/([^/]+)/)
  if (listMatch) {
    return `/lists/${listMatch[1]}`
  }

  const userMatch = path.match(/^\/users\/([^/]+)/)
  if (userMatch) {
    return `/users/${userMatch[1]}`
  }

  if (path === '/profile') {
    return '/profile'
  }

  if (path === '/notifications') {
    return '/activity'
  }

  return null
}
