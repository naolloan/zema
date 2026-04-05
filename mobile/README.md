# Zeማa Mobile

This is the Expo + React Native mobile app foundation for Zeማa.

## Planned goals
- shared auth/session model with the web app
- shared API contract with the existing Express backend
- mobile-first navigation with bottom tabs
- release, review, diary, lists, profile, and notifications in phased rollout

## Expected env

Create a local `.env` file in `mobile/` when we wire real runtime config:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

## Commands

From the repo root:

```bash
npm run mobile:dev
npm run mobile:android
npm run mobile:ios
```

Or from this directory:

```bash
npm install
npm run dev
```

## Notes

- This scaffold is intentionally focused on app structure first.
- Real auth flows, release screens, and list/review features will be layered in next.
