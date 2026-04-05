import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra || {}) as {
  apiBaseUrl?: string
  googleAuthEnabled?: boolean
}

export const mobileConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || 'http://localhost:5000',
  googleAuthEnabled: (process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED || String(extra.googleAuthEnabled || false)) === 'true',
}
