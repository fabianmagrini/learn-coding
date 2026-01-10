# PitchPulse

A cross-platform football news aggregation platform that provides personalized, curated news feeds from thousands of sources.

## Overview

PitchPulse aggregates football news, transfer rumors, match reports, and statistical analysis into a single, noise-free, team-centric news experience. The MVP focuses on Premier League coverage with RSS feed aggregation and basic keyword tagging.

## Features (Phase 1 - MVP)

- **User Authentication**: Secure registration and login system
- **Personalized Onboarding**: Select favorite teams and leagues
- **RSS Feed Aggregation**: Automated ingestion from top football news sources
- **Keyword Tagging**: Basic team and player identification in articles
- **Personalized Feed**: News filtered by user's favorite teams
- **Reliability Scoring**: Source credibility indicators
- **Responsive Design**: Clean, card-based UI with Tailwind CSS

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: rsbuild
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**:
  - TanStack Query (server state)
  - Zustand (client state)
- **Routing**: React Router
- **Testing**: Vitest, React Testing Library
- **Component Development**: Storybook

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **RSS Parsing**: rss-parser
- **Testing**: Vitest

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Monorepo**: pnpm workspaces

## Project Structure

```
pitchpulse/
├── apps/
│   ├── frontend/              # React application
│   │   ├── src/
│   │   │   ├── features/      # Feature-based modules
│   │   │   │   ├── auth/      # Authentication
│   │   │   │   ├── feed/      # News feed
│   │   │   │   └── onboarding/# User onboarding
│   │   │   ├── shared/        # Shared components
│   │   │   │   └── components/ui/  # shadcn components
│   │   │   └── lib/           # Utilities
│   │   ├── .storybook/        # Storybook config
│   │   └── vitest.config.ts   # Test config
│   │
│   └── backend/               # Node.js API
│       ├── src/
│       │   ├── features/      # Feature-based modules
│       │   │   ├── auth/      # Authentication
│       │   │   ├── feed/      # Feed APIs
│       │   │   ├── rss/       # RSS ingestion
│       │   │   └── user/      # User management
│       │   ├── shared/        # Shared utilities
│       │   │   ├── middleware/# Express middleware
│       │   │   └── utils/     # Helper functions
│       │   ├── db/            # Database client & schemas
│       │   └── scripts/       # CLI scripts
│       └── vitest.config.ts
│
├── packages/                  # Shared packages (future)
├── docker-compose.yml         # Database services
├── pnpm-workspace.yaml        # Monorepo config
└── package.json               # Root package
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   cd /path/to/pitchpulse
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Frontend (`apps/frontend/.env`):
   ```bash
   cp apps/frontend/.env.example apps/frontend/.env
   ```

   Backend (`apps/backend/.env`):
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   Update the values in `.env` files as needed.

4. **Start database services**
   ```bash
   pnpm docker:up
   ```

   This starts PostgreSQL and Redis containers.

### Running the Application

#### Development Mode

1. **Start both frontend and backend**
   ```bash
   pnpm dev
   ```

   Or run individually:
   ```bash
   # Frontend (http://localhost:3000)
   cd apps/frontend
   pnpm dev

   # Backend (http://localhost:4000)
   cd apps/backend
   pnpm dev
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Backend Health: http://localhost:4000/health

#### Database Setup

The database schema is automatically initialized when you start the PostgreSQL container. The `init.sql` script creates:
- Users table
- Teams table (pre-populated with Premier League teams)
- Leagues table
- News sources table
- Articles table
- Article tags table
- User preferences tables

#### RSS Feed Ingestion

To fetch and ingest RSS feeds manually:

```bash
cd apps/backend
pnpm tsx src/scripts/ingest-feeds.ts
```

This script:
- Fetches articles from all active RSS sources
- Stores new articles in the database
- Tags articles with team names

## Testing

### Frontend Tests
```bash
cd apps/frontend
pnpm test              # Run tests
pnpm test:coverage     # With coverage
pnpm test:ui           # Interactive UI
```

### Backend Tests
```bash
cd apps/backend
pnpm test              # Run tests
pnpm test:coverage     # With coverage
```

### Run All Tests
```bash
pnpm test
```

## Storybook

View and develop UI components in isolation:

```bash
cd apps/frontend
pnpm storybook
```

Access at http://localhost:6006

## Building for Production

```bash
# Build all apps
pnpm build

# Build individually
cd apps/frontend && pnpm build
cd apps/backend && pnpm build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires auth)

### User
- `POST /api/user/onboarding` - Complete onboarding with team/league preferences
- `GET /api/user/preferences` - Get user's favorite teams and leagues

### Feed
- `GET /api/feed/personalized` - Get personalized news feed
- `GET /api/feed/team/:team` - Get articles for specific team
- `GET /api/feed/latest` - Get latest articles (all sources)

## Database Schema

### Key Tables
- **users**: User accounts and authentication
- **teams**: Football teams (Premier League)
- **leagues**: Football leagues
- **news_sources**: RSS feed sources with reliability scores
- **articles**: News articles
- **article_tags**: Team/player tags for articles
- **user_favorite_teams**: User's favorite teams (many-to-many)
- **user_favorite_leagues**: User's favorite leagues (many-to-many)

## Docker Services

### PostgreSQL
- Port: 5432
- Database: pitchpulse
- User: pitchpulse
- Password: pitchpulse_dev (change in production!)

### Redis
- Port: 6379
- Used for caching (future implementation)

### Docker Commands
```bash
pnpm docker:up         # Start services
pnpm docker:down       # Stop services
pnpm docker:logs       # View logs
```

## Development Workflow

1. **Start databases**: `pnpm docker:up`
2. **Start dev servers**: `pnpm dev`
3. **Ingest RSS feeds**: `cd apps/backend && pnpm tsx src/scripts/ingest-feeds.ts`
4. **Register account**: Visit http://localhost:3000/register
5. **Complete onboarding**: Select your favorite teams
6. **View feed**: Browse personalized news

## Code Quality

### Linting
```bash
pnpm lint
```

### Type Checking
TypeScript is configured with strict mode for both frontend and backend.

## Future Enhancements (Phase 2+)

- NLP-powered auto-tagging
- Story de-duplication
- Push notifications
- Advanced filtering options
- Match center integration
- Live scores
- More leagues and competitions

## Contributing

This is a learning/portfolio project. The codebase follows:
- Feature-based architecture
- TypeScript strict mode
- Comprehensive testing
- Component-driven development (Storybook)

## License

MIT

## Acknowledgments

- Uses RSS feeds from reputable football news sources
- Designed for football fans worldwide
