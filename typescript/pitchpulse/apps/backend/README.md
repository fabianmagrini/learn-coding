# PitchPulse Backend

Node.js + TypeScript backend API for PitchPulse football news aggregator.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL
- Redis
- JWT Authentication
- bcrypt (password hashing)
- Zod (validation)
- rss-parser
- Vitest

## Features

- **RESTful API**: Express-based REST API
- **JWT Authentication**: Secure token-based auth
- **RSS Ingestion**: Automated feed parsing
- **Keyword Tagging**: Basic NLP for team detection
- **Personalized Feed**: User preference-based filtering
- **Feature Architecture**: Domain-driven design

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (with auto-reload)
pnpm dev

# Run tests
pnpm test
pnpm test:coverage

# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── auth/          # Authentication
│   ├── feed/          # Feed APIs
│   ├── rss/           # RSS ingestion
│   └── user/          # User management
├── shared/            # Shared code
│   ├── middleware/    # Express middleware
│   └── utils/         # Utilities
├── db/                # Database
│   ├── client.ts      # PostgreSQL client
│   └── init.sql       # Schema & seed data
├── scripts/           # CLI scripts
│   └── ingest-feeds.ts
└── index.ts           # Entry point
```

## Environment Variables

Create `.env` file:

```
PORT=4000
NODE_ENV=development

DATABASE_URL=postgresql://pitchpulse:pitchpulse_dev@localhost:5432/pitchpulse
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (auth required)

### User
- `POST /api/user/onboarding` - Complete onboarding
- `GET /api/user/preferences` - Get user preferences

### Feed
- `GET /api/feed/personalized` - Personalized feed
- `GET /api/feed/team/:team` - Team-specific feed
- `GET /api/feed/latest` - Latest articles

## RSS Ingestion

Run the ingestion script:

```bash
pnpm tsx src/scripts/ingest-feeds.ts
```

This will:
1. Fetch RSS feeds from all active sources
2. Store new articles in database
3. Tag articles with team names

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test:coverage
```

## Database

The schema is automatically created via `init.sql` when Docker starts.

### Tables
- `users` - User accounts
- `teams` - Football teams
- `leagues` - Football leagues
- `news_sources` - RSS sources
- `articles` - News articles
- `article_tags` - Article metadata
- `user_favorite_teams` - User preferences
- `user_favorite_leagues` - User preferences

## Available Scripts

- `pnpm dev` - Development server with auto-reload
- `pnpm build` - Compile TypeScript
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm test:coverage` - Generate coverage
- `pnpm lint` - Run ESLint
