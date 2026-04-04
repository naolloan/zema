# Zeማa Mobile App Plan

## Goal
Build a production-ready mobile app for Zeማa on both Android and iOS without trying to clone the web app one-for-one on day one.

The mobile app should focus on the core listening loop:
- browse releases
- rate and review
- log to diary
- like releases
- manage want-to-hear
- use lists
- manage profile

## Recommended Stack

### Core choice
Use `React Native` with `Expo`.

### Why this is the right fit
- fastest path to Android + iOS from one codebase
- strong ecosystem for auth, storage, image upload, and notifications
- easiest store-build pipeline for a small team
- works well with the existing TypeScript backend
- lets us reuse types, API contracts, validation logic, and some utilities

### Recommended app structure
- `apps/web` or existing `client` for Next.js
- `apps/mobile` for Expo app
- `server` stays as the API
- `packages/shared` for shared types, constants, helpers, and possibly query models

## What We Can Reuse

### Reuse directly or with light changes
- API contract shape from `server`
- client API logic patterns from:
  - `client/src/lib/api.ts`
  - `client/src/lib/auth-api.ts`
  - `client/src/lib/music-api.ts`
- TypeScript types from:
  - `client/src/types/index.ts`
  - `shared/types.ts`
- auth/session model
- business rules for:
  - likes
  - want to hear
  - comments
  - favorites
  - diary logging
  - profile settings

### Rebuild for mobile
- all UI components
- navigation
- layout systems
- menus, drawers, sheets, and modals
- image grids and profile shelves
- home/discovery presentation

### Shared later if we refactor
- formatting helpers from `client/src/lib/utils.ts`
- username validation rules
- rating values/constants
- release/list/profile display helpers

## Mobile V1 Scope

### Must-have
1. Authentication
- sign in
- sign up
- Google sign in
- forgot password
- email verification messaging

2. Home / discovery
- mobile home feed
- explore search
- releases feed
- official lists shelf

3. Releases
- release details
- rate with half-stars
- like release
- add to want-to-hear
- add to list
- open Spotify link
- view stats

4. Reviews
- read reviews
- write review
- like review
- comment on review

5. Diary
- log a release
- see diary entries

6. Lists
- open personal/public lists
- add releases to lists
- create and edit lists
- official lists browsing

7. Profile
- own profile
- public user profiles
- favorite albums/songs/artists
- settings
- avatar upload by gallery and URL

8. Notifications
- notifications list
- mark read/unread

### Good to have for V1 if time allows
- push notifications
- image crop flow for avatar uploads
- better offline caching
- release stat deep links

### Postpone until V2
- full parity with every web surface
- advanced animations everywhere
- complex moderation/admin tools
- heavy offline support
- tablet-specific layouts

## Recommended Mobile Navigation

Use a bottom tab bar for:
- Home
- Explore
- Lists
- Activity
- Profile

Use stack navigation inside each tab for:
- release page
- artist page
- list page
- user profile
- settings
- notifications

Use bottom sheets for:
- release quick actions
- filter menus
- add-to-list

## Suggested Mobile Tech Choices

### App framework
- `Expo`
- `Expo Router`

### Data fetching
- `@tanstack/react-query`

### Forms
- `react-hook-form`
- `zod` if we want shared validation

### State
- keep using a light store approach
- likely `zustand` again for auth/session if we want parity

### Styling
- `NativeWind` or `StyleSheet` + design tokens

Recommendation:
- use `NativeWind` only if we want web-like utility styling speed
- otherwise use regular React Native styles with shared tokens for a cleaner long-term native feel

My recommendation for Zeማa:
- `Expo Router`
- `React Query`
- `zustand`
- React Native `StyleSheet` plus shared design tokens

## Delivery Plan

### Phase 1: foundation
Estimated: 1-2 weeks

- create Expo app
- connect to current API
- set up auth/session persistence
- add navigation shell
- create theme tokens
- share types/constants into `shared`

### Phase 2: core product loop
Estimated: 3-5 weeks

- home
- explore
- release detail
- rating
- reviews
- diary logging
- like / want-to-hear
- profile basics

### Phase 3: lists and settings
Estimated: 2-3 weeks

- list views
- add to list
- create/edit lists
- profile settings
- avatar flow
- notifications screen

### Phase 4: production hardening
Estimated: 2-4 weeks

- QA across devices
- loading/error polish
- analytics
- crash monitoring
- app icons / splash / store assets
- App Store and Play Store prep

## Realistic Timeline

### Lean but real mobile launch
`8-12 weeks`

### More polished public release
`3-5 months`

That assumes we stay disciplined about scope and avoid full web parity in v1.

## Backend Readiness Notes

The backend is already in a good place for mobile because it already supports:
- JWT auth
- Google auth
- password reset and verification flows
- profile settings
- likes, comments, lists, reviews, diary, notifications

Before mobile build starts, we should still tighten:
- production file storage strategy for avatars/uploads
- production CORS/env setup
- rate limiting
- API error consistency review
- pagination consistency on heavily used endpoints

## Deployment Plan For Mobile Later

### Mobile app
- build with `EAS Build`
- submit with `EAS Submit`

### Backend
- keep existing server API deployed separately

### Monitoring
- use Sentry when student benefits are available

## First Concrete Steps When We Start

1. Create `apps/mobile` with Expo
2. Move reusable types/constants into `shared`
3. Extract API client into a shared package or mirror it cleanly for mobile
4. Build auth flow first
5. Build release detail + rating + review loop second
6. Build profile + lists third

## Final Recommendation

We should build the mobile app, but we should build a focused mobile v1, not a rushed copy of the full website.

Best strategy:
- web stays the feature lab
- mobile ships the strongest core loop
- shared backend and shared types keep both products aligned
