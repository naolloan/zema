# Zeማa Deployment Plan

## Goal
Deploy Zeማa as a production-ready web app with:
- a public frontend
- a public API
- a production PostgreSQL database
- real email delivery
- Google sign-in
- monitoring and rollback discipline

This plan is written around the current codebase as it exists today.

## Recommended Production Architecture

### Best fit for Zeማa
1. Frontend: `Vercel`
2. Backend API: `DigitalOcean`
3. Database: managed `PostgreSQL`
4. Email: `Resend`
5. Monitoring: `Sentry`
6. Assets/uploads: object storage later, temporary local volume first only if needed

### Why this split
- Next.js is easiest to deploy and iterate on with Vercel
- the Express API and Prisma backend fit well on a small DigitalOcean droplet or app platform
- PostgreSQL should be managed, not self-hosted, unless budget absolutely forces it
- Resend already matches the current auth/email code

## Recommended Domains

Use a clean production setup like:

- frontend: `https://zema.naol.aesturkey.com`
- API: `https://api.naol.aesturkey.com`
- email sender: `auth@naol.aesturkey.com`

If you want a single public product domain later, we can simplify to:
- app: `https://zema.yourdomain.com`
- api: `https://api.yourdomain.com`

## Current Readiness

### Already in good shape
- frontend and backend build successfully
- health endpoint exists: `/health`
- JWT auth is implemented
- Google OAuth is implemented
- password reset and email verification are implemented
- rate limiting and Helmet are already enabled
- production build works for the client

### Current production gaps we should plan around
1. Avatar uploads are stored on the server filesystem under `/uploads`
2. CORS is built around a single `FRONTEND_URL`
3. Google redirect URI in docs/examples is local-only right now
4. Email delivery depends on verified domain DNS
5. Error handling is functional, but production monitoring is not wired yet
6. There is no explicit production deployment script/runbook yet

## Deployment Path

## Phase 1: Production Preparation

### 1. Finalize production domains
Decide:
- frontend domain
- API domain
- sender domain/email

Recommended:
- `zema.naol.aesturkey.com`
- `api.naol.aesturkey.com`
- `auth@naol.aesturkey.com`

### 2. Verify the sender domain in Resend
We need:
- SPF
- DKIM
- any verification TXT records Resend requires

Once verified, set:

```env
EMAIL_FROM="Zeማa <auth@naol.aesturkey.com>"
```

### 3. Create production environment variables

#### Backend production env

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="a-long-random-production-secret"
NODE_ENV="production"
PORT=5000
FRONTEND_URL="https://zema.naol.aesturkey.com"

SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."

RESEND_API_KEY="..."
EMAIL_FROM="Zeማa <auth@naol.aesturkey.com>"

GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://api.naol.aesturkey.com/api/auth/google/callback"
```

#### Frontend production env

```env
NEXT_PUBLIC_API_BASE_URL="https://api.naol.aesturkey.com"
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"
```

### 4. Rotate exposed secrets before production
Because secrets have been used in development already, rotate before going live:
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- any Spotify secret in use
- consider rotating `JWT_SECRET` if it has ever been shared or reused

## Phase 2: Hosting Setup

### Frontend on Vercel
Use Vercel for the Next.js app.

Steps:
1. connect GitHub repo
2. set root to `client`
3. add frontend env vars
4. set production domain

### Backend on DigitalOcean
Recommended first production option:
- one small droplet or app platform instance for the API

Use:
- Node.js 18+
- production build from `server`

Basic backend run flow:

```bash
npm install
npm run build
npm start
```

The server entrypoint already starts from:
- `dist/index.js`

### Database
Best option:
- managed PostgreSQL

Why:
- backups
- easier upgrades
- less operational risk

## Phase 3: App Changes Needed Before Public Launch

### 1. Upload storage strategy
Current state:
- avatars are stored in local server filesystem under `/uploads/avatars`

Production recommendation:
- move avatar uploads to object storage later
- examples: DigitalOcean Spaces, S3, Cloudinary

Short-term acceptable:
- keep uploads on the backend host only if:
  - there is one server instance
  - storage is persistent
  - you accept migration later

Long-term better:
- object storage for uploads

### 2. Google OAuth production redirect
Update Google Cloud OAuth to:

```text
https://api.naol.aesturkey.com/api/auth/google/callback
```

Also update:
- authorized JavaScript origins for the frontend domain
- test/publish status depending on whether the app is public yet

### 3. CORS confirmation
Current server code already supports:
- localhost defaults
- one configured `FRONTEND_URL`

For production, this is okay if there is exactly one frontend app:
- `https://zema.naol.aesturkey.com`

If you later add:
- mobile app callbacks
- preview/staging apps
- multiple frontend domains

then we should expand the CORS config to support multiple origins via env.

### 4. Monitoring
Before public launch, add:
- Sentry on backend
- Sentry on frontend

This is one of the highest-value improvements for a production rollout.

### 5. Backups
Need:
- database backups
- restore procedure

If using managed PostgreSQL, enable automated backups immediately.

## Phase 4: Launch Checklist

## Infrastructure
- frontend domain resolves correctly
- API domain resolves correctly
- HTTPS enabled on both
- database reachable from backend
- environment variables set on both hosts

## Auth
- email/password signup works
- verification email arrives
- forgot-password email arrives
- reset link works
- Google sign-in works from production domain

## Core product
- search works
- review creation works
- diary logging works
- likes work
- list creation/editing works
- avatar upload works
- notifications load correctly

## Stability
- frontend build passes
- server build passes
- server tests pass
- health endpoint works in production
- logs are accessible
- monitoring is connected

## Recommended Deployment Order

1. Verify email domain in Resend
2. Decide production domains
3. Provision PostgreSQL
4. Deploy backend API
5. Configure Google OAuth production redirect
6. Deploy frontend
7. Run end-to-end auth tests
8. Add monitoring
9. Open to testers

## What We Should Do Before We Actually Deploy

### High-priority
1. finalize production domain names
2. verify Resend sender domain
3. rotate secrets
4. decide backend host
5. decide database host

### Strongly recommended next coding tasks
1. move uploads to object storage
2. add Sentry
3. allow multi-origin CORS through env if staging is needed
4. add a production deployment guide after hosting is chosen

## Realistic First Production Setup

If we want the simplest serious setup:

### Frontend
- Vercel

### Backend
- DigitalOcean droplet or app platform

### Database
- managed PostgreSQL

### Email
- Resend

### Monitoring
- Sentry

This is enough for a real launch to early users.

## Final Recommendation

Do not deploy Zeማa publicly until these three things are true:

1. real email delivery is working
2. Google OAuth is configured for production domains
3. backend storage strategy for avatars is at least acceptable for one-server production

Once those are in place, Zeማa is close to being deployable as a real product, not just a local project.
