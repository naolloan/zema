# Music Platform - Social Music Discovery Network

A community-driven music discovery and discussion platform inspired by Letterboxd, focused entirely on music.

## Features

- **Music Discovery**: Search and explore artists, releases, and tracks
- **Social Interaction**: Write reviews, rate music, and connect with other users
- **Personal Tracking**: Log listening activity with diary entries
- **Curated Lists**: Create and share custom music collections
- **Top Charts**: Dynamic charts based on community ratings
- **Favorites**: Curate favorite albums, songs, and artists on your profile
- **External Integration**: Music metadata from Spotify
- **Authentication**: Email verification, password reset, and Google sign-in

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication with email verification and password reset
- **External APIs**: Spotify Web API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run setup
   ```
3. Set up environment variables (see Environment Variables section)
4. Run database migrations:
   ```bash
   npm run db:migrate
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Environment Variables

Create `.env` files in both `client` and `server` directories:

### Server (.env)
```
DATABASE_URL="postgresql://username:password@localhost:5432/music_platform"
JWT_SECRET="your-jwt-secret"
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="Zeማa <auth@yourdomain.com>"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"
NODE_ENV="development"
PORT=5000
```

### Client (.env.local)
```
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"
```

## Project Structure

```
music-platform/
├── client/                 # Next.js frontend
├── server/                 # Express backend API
├── shared/                 # Shared types and utilities
├── package.json           # Root package.json
└── README.md
```

## API Endpoints

The backend provides RESTful APIs for:
- Authentication (`/api/auth`)
- Users (`/api/users`)
- Artists (`/api/artists`)
- Releases (`/api/releases`)
- Tracks (`/api/tracks`)
- Reviews (`/api/reviews`)
- Ratings (`/api/ratings`)
- Diary (`/api/diary`)
- Lists (`/api/lists`)
- Charts (`/api/charts`)
- Search (`/api/search`)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
