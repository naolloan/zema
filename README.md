# Zeማa

Zeማa is a social music platform inspired by the community and discovery feel of Letterboxd, but built for music. Users can explore artists and releases, rate and review records, log listens, curate lists, follow other users, and shape live community charts.

## Current status

The app is actively in development and already includes the main social/discovery flows:

- artist and release discovery
- reviews, ratings, and diary logging
- user profiles, follows, notifications, and comments
- public lists and official lists
- favorites, likes, and want-to-hear tracking
- Google sign-in plus email/password auth

Some integrations are intentionally partial for now:

- Spotify support exists, but live Spotify access may be limited until valid credentials are configured
- email verification and password reset support real delivery through Resend, but local development can also use preview links without a custom domain

## Tech stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Express, TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT, Google OAuth, email verification, password reset
- Metadata sources: Spotify and MusicBrainz

## Local development

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm

### 1. Install dependencies

```bash
npm run setup
```

### 2. Create local env files

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

### 3. Update environment variables

Minimum local setup:

`server/.env`

```env
DATABASE_URL="postgresql://username:password@localhost:5432/music_platform"
JWT_SECRET="change-this-in-development-too"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

`client/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="false"
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Start the app

```bash
npm run dev
```

App URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`
- health check: `http://localhost:5000/health`

## Environment variables

### Server

Required for basic local development:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `FRONTEND_URL`

Optional integrations:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### Client

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`

## Auth notes

### Email/password

- registration requires email verification before sign-in
- forgot-password and reset-password are implemented
- if Resend is not configured, development mode falls back to preview links instead of real email delivery

### Google sign-in

To enable Google sign-in:

1. create a Google OAuth web application
2. set this redirect URI exactly:

```text
http://localhost:5000/api/auth/google/callback
```

3. add these server env vars:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"
```

4. enable the client button:

```env
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"
```

If your Google OAuth app is in testing mode, add your own Google account as a test user.

## Email delivery notes

Resend is supported for transactional email.

For local development, a custom domain is not required if you are comfortable using preview links instead of real delivery. If you want real email delivery later, you will typically need:

- a verified sender/domain
- `RESEND_API_KEY`
- `EMAIL_FROM`

## Project structure

```text
music-platform/
├── client/                  # Next.js frontend
├── mobile/                  # Expo / React Native mobile app foundation
├── server/                  # Express API
├── shared/                  # Shared utilities/types
├── README.md
└── SETUP.md
```

## Useful scripts

From the project root:

```bash
npm run dev
npm run build
npm run client:build
npm run server:build
npm run mobile:dev
npm run db:migrate
```

Backend tests:

```bash
cd server && npm test
```

## GitHub workflow

Recommended workflow for future changes:

1. branch from `main`
2. make one focused change at a time
3. commit with a clear message
4. push branch
5. open a pull request

Example:

```bash
git checkout -b feature/profile-polish
git add .
git commit -m "Polish profile layout and interactions"
git push -u origin feature/profile-polish
```

## Main product areas

- **Home**: public and signed-in discovery surfaces
- **Explore**: search artists, releases, users, and lists
- **Releases**: browse, rate, review, log, like, add to lists, want to hear
- **Artists**: profiles with linked releases and discography
- **Profiles**: favorites, diary, lists, network, notifications
- **Lists**: user-created lists and official lists
- **Reviews**: community review discovery and interaction

## Setup guide

For a fuller setup walkthrough, see [SETUP.md](/home/naol/CascadeProjects/music-platform/SETUP.md).

For production planning, deployment order, and hosting recommendations, see [DEPLOYMENT_PLAN.md](/home/naol/CascadeProjects/music-platform/DEPLOYMENT_PLAN.md).
