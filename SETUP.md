# Music Platform - Setup Guide

A comprehensive social music platform for discovery, discussion, and personal listening history.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run setup
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE music_platform;
```

2. Copy environment files:
```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.local.example client/.env.local
```

3. Update environment variables:
```bash
# server/.env
DATABASE_URL="postgresql://username:password@localhost:5432/music_platform"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:3001"

# client/.env.local
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
```

### 3. Database Migrations

```bash
npm run db:migrate
```

### 4. Start Development Servers

```bash
npm run dev
```

This will start both the frontend (http://localhost:3001) and backend (http://localhost:5000) servers.

## Project Structure

```
music-platform/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/         # App router pages
│   │   ├── components/   # React components
│   │   ├── lib/         # Utility functions
│   │   ├── types/       # TypeScript types
│   │   └── hooks/       # Custom React hooks
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Express backend API
│   ├── src/
│   │   ├── controllers/  # API route handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── prisma/       # Database schema
│   └── package.json
├── shared/                 # Shared types and utilities
├── package.json           # Root package.json
└── README.md
```

## Features Implemented

### ✅ Core Features
- **User Authentication**: Registration, login, JWT-based auth
- **Music Database**: Complete schema for artists, releases, tracks
- **External API Integration**: Spotify Web API for metadata
- **Reviews & Ratings**: User-generated content system
- **Diary/Listening Log**: Personal music tracking
- **Favorites**: 4 favorite releases per user
- **Lists**: Curated music collections
- **Charts**: Dynamic top-rated music
- **Search**: Global search across all content
- **Social Features**: Review likes, user profiles

### ✅ Technical Features
- **TypeScript**: Full type safety
- **Database**: PostgreSQL with Prisma ORM
- **API Design**: RESTful API with proper error handling
- **Frontend**: Next.js 14 with modern UI components
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Secure JWT implementation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Verify a new email address
- `POST /api/auth/verify-email/resend` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/google/start` - Start Google sign-in
- `GET /api/auth/google/callback` - Complete Google sign-in
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

Client auth UI note:
- Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"` in `client/.env.local` when Google sign-in is configured.

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/reviews` - Get user's reviews
- `GET /api/users/:id/diary` - Get user's diary entries
- `GET /api/users/:id/favorites` - Get user's favorites
- `GET /api/users/:id/lists` - Get user's lists

### Artists
- `GET /api/artists/search?q=query` - Search artists
- `GET /api/artists/:id` - Get artist by ID
- `GET /api/artists/:id/releases` - Get artist's releases

### Releases
- `GET /api/releases/search?q=query` - Search releases
- `GET /api/releases/:id` - Get release by ID
- `GET /api/releases/:id/tracks` - Get release tracks
- `GET /api/releases/:id/reviews` - Get release reviews
- `POST /api/releases/:id/rate` - Rate a release
- `PUT /api/releases/:id/rate` - Update rating
- `POST /api/releases/:id/favorite` - Add to favorites
- `DELETE /api/releases/:id/favorite` - Remove from favorites

### Reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `GET /api/reviews/:id` - Get review by ID
- `POST /api/reviews/:id/like` - Like/unlike review

### Diary
- `POST /api/diary` - Create diary entry
- `GET /api/diary/my-entries` - Get my diary entries
- `GET /api/diary/user/:userId` - Get user's diary entries
- `PUT /api/diary/:id` - Update diary entry
- `DELETE /api/diary/:id` - Delete diary entry

### Lists
- `POST /api/lists` - Create list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `GET /api/lists/:id` - Get list by ID
- `GET /api/lists/user/:userId` - Get user's lists
- `POST /api/lists/:id/items` - Add item to list
- `PUT /api/lists/:id/items/:itemId` - Update list item
- `DELETE /api/lists/:id/items/:itemId` - Remove item from list
- `PUT /api/lists/:id/reorder` - Reorder list items

### Charts
- `GET /api/charts/top-releases` - Get top releases
- `GET /api/charts/:type` - Get chart by type

### Search
- `GET /api/search?q=query&type=all|artist|release|track` - Global search

## Database Schema

The platform uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: Authentication and profiles
- **Artists**: Music artists (individuals and groups)
- **Releases**: Albums, EPs, singles, mixtapes
- **Tracks**: Individual songs with credits
- **Reviews**: User reviews for releases
- **Ratings**: 1-5 star ratings
- **Diary Entries**: Personal listening logs
- **Favorites**: User's 4 favorite releases
- **Lists**: Curated music collections
- **Artist Credits**: Flexible role-based credits

## External Integrations

### Spotify Web API
- Fetches artist, release, and track metadata
- Provides canonical Spotify links for artists, albums, and tracks
- Caches data locally to reduce API calls

## Development Notes

### Code Quality
- TypeScript throughout for type safety
- ESLint configuration for code standards
- Prisma for type-safe database operations

### Performance
- Database indexing on frequently queried fields
- Pagination for large result sets
- Caching of external API responses
- Image optimization for release artwork

### Security
- JWT-based authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- SQL injection prevention through Prisma

## Deployment

### Environment Variables
- `NODE_ENV`: Set to 'production'
- `DATABASE_URL`: Production PostgreSQL connection
- `JWT_SECRET`: Strong secret key
- `FRONTEND_URL`: Production frontend URL

### Build Process
```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
