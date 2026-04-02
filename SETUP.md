# Zeማa Setup Guide

This guide is the practical local-development setup for Zeማa.

## What you need

- Node.js 18+
- PostgreSQL 12+
- npm

## Quick start

### 1. Install dependencies

From the project root:

```bash
npm run setup
```

### 2. Create the database

Create a PostgreSQL database:

```sql
CREATE DATABASE music_platform;
```

### 3. Create local env files

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

### 4. Configure minimum local env values

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

### 5. Run migrations

```bash
npm run db:migrate
```

### 6. Start the app

```bash
npm run dev
```

Local URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`
- health: `http://localhost:5000/health`

## Optional integrations

These are optional for local development, but useful when you want richer external behavior.

### Spotify

```env
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
```

Notes:

- the codebase supports Spotify integration
- the app also contains MusicBrainz-based fallback behavior
- if Spotify credentials are missing or limited, some metadata flows may degrade gracefully instead of fully breaking

### Google sign-in

Server env:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"
```

Client env:

```env
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"
```

Google Cloud requirements:

- OAuth client type: `Web application`
- authorized redirect URI:

```text
http://localhost:5000/api/auth/google/callback
```

- if the consent screen is in testing mode, add your own Google account as a test user

### Resend email delivery

Server env:

```env
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="Zeማa <auth@yourdomain.com>"
```

Notes:

- email verification and password reset are implemented
- if Resend is not configured, development falls back to preview links
- real email delivery usually requires a verified sender/domain

## Current auth behavior

### Email/password accounts

- users can register with email and password
- sign-in is blocked until the email is verified
- forgot-password and reset-password are available
- change-password is available from the profile area

### Google accounts

- users can sign up/sign in with Google
- Google-created accounts do not need the email verification flow in the same way local email/password accounts do

## Useful commands

From the project root:

```bash
npm run dev
npm run build
npm run client:build
npm run server:build
npm run db:migrate
```

From the server directory:

```bash
npm test
npm run db:generate
npm run db:studio
```

## Project structure

```text
music-platform/
├── client/
│   ├── src/app
│   ├── src/components
│   ├── src/lib
│   └── src/types
├── server/
│   ├── prisma
│   ├── src/controllers
│   ├── src/middleware
│   ├── src/routes
│   ├── src/services
│   └── src/tests
├── shared/
├── README.md
└── SETUP.md
```

## Main implemented areas

- auth with email verification, reset password, and Google sign-in
- public home page plus signed-in home experience
- profile pages with diary, lists, activity, network, and favorites
- release pages with ratings, reviews, logs, stats, and overlays
- artist pages and linked releases
- public lists, official lists, likes, and comments
- notifications, follow relationships, and comment permissions

## GitHub setup

If you are setting the project up on GitHub for the first time:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

Recommended ongoing workflow:

```bash
git checkout -b feature/short-description
git add .
git commit -m "Describe the change"
git push -u origin feature/short-description
```

## Troubleshooting

### Port mismatch or CORS issues

Make sure:

- frontend runs on `http://localhost:3000`
- backend runs on `http://localhost:5000`
- `FRONTEND_URL` matches your frontend URL if you customize it

### Google sign-in fails after account selection

Check:

- redirect URI matches exactly
- your Google account is listed as a test user if the app is in testing
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"` is set in `client/.env.local`

### Password reset or verification email does not arrive

If you do not have a verified sender/domain yet, this is expected. Use the preview-link flow in local development until real email delivery is configured.
