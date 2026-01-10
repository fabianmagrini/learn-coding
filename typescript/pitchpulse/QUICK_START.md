# PitchPulse - Quick Start Guide

Get PitchPulse up and running in 5 minutes!

## Prerequisites

Make sure you have installed:
- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Docker and Docker Compose

## Step-by-Step Setup

### 1. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for both frontend and backend.

### 2. Start Database Services

```bash
pnpm docker:up
```

This starts PostgreSQL and Redis in Docker containers. The database will automatically initialize with the schema and seed data (Premier League teams, leagues, and news sources).

### 3. Start the Application

```bash
pnpm dev
```

This starts both the frontend and backend in development mode:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### 4. Ingest Some News Articles

In a new terminal:

```bash
cd apps/backend
pnpm ingest
```

This fetches the latest articles from RSS feeds and stores them in the database.

### 5. Use the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign up" to create a new account
3. Complete the onboarding by selecting your favorite teams (e.g., Arsenal, Liverpool)
4. View your personalized news feed!

## What's Next?

### Explore the Features

- **Login/Register**: Create an account and secure authentication
- **Onboarding**: Select your favorite Premier League teams and leagues
- **Feed**: View personalized news articles for your teams
- **Filtering**: Articles are automatically filtered based on your preferences

### Development Tools

#### Run Tests
```bash
# All tests
pnpm test

# Frontend only
cd apps/frontend && pnpm test

# Backend only
cd apps/backend && pnpm test
```

#### Storybook (Component Library)
```bash
cd apps/frontend
pnpm storybook
```

Visit http://localhost:6006 to see the UI component library.

#### Database Access

Connect to PostgreSQL:
```bash
docker exec -it pitchpulse-postgres psql -U pitchpulse -d pitchpulse
```

Useful queries:
```sql
-- Check users
SELECT * FROM users;

-- Check articles
SELECT COUNT(*) FROM articles;

-- Check teams
SELECT * FROM teams;

-- Check article tags
SELECT * FROM article_tags LIMIT 10;
```

### Scheduled RSS Ingestion

For production, you'd want to schedule RSS ingestion. You can use cron:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/pitchpulse/apps/backend && pnpm ingest
```

Or use a task scheduler like node-cron in the backend.

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Make sure Docker is running: `docker ps`
2. Check if containers are up: `pnpm docker:up`
3. Verify `.env` file has correct DATABASE_URL

### Port Already in Use

If port 3000 or 4000 is already in use:
1. Stop the conflicting process
2. Or change the port in `.env` files

### RSS Feeds Not Loading

If no articles appear after ingestion:
1. Check internet connection
2. Some RSS feeds may be temporarily unavailable
3. Check backend logs for errors

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   React     │────────▶│   Express   │────────▶│  PostgreSQL  │
│  Frontend   │  HTTP   │   Backend   │   SQL   │   Database   │
│             │◀────────│             │◀────────│              │
└─────────────┘         └─────────────┘         └──────────────┘
                              │
                              │ Fetch
                              ▼
                        ┌──────────┐
                        │   RSS    │
                        │  Feeds   │
                        └──────────┘
```

## Useful Commands

```bash
# Root level
pnpm install          # Install all dependencies
pnpm dev              # Start both apps
pnpm build            # Build both apps
pnpm test             # Run all tests
pnpm docker:up        # Start databases
pnpm docker:down      # Stop databases
pnpm docker:logs      # View database logs

# Frontend (apps/frontend)
pnpm dev              # Start dev server
pnpm test             # Run tests
pnpm storybook        # Start Storybook
pnpm build            # Build for production

# Backend (apps/backend)
pnpm dev              # Start dev server
pnpm test             # Run tests
pnpm ingest           # Fetch RSS feeds
pnpm build            # Build for production
```

## Next Steps

1. Explore the codebase structure (see main README.md)
2. Add more RSS sources in the database
3. Customize the UI theme for your favorite team
4. Implement Phase 2 features (NLP, de-duplication)
5. Add more leagues and competitions

Happy coding! ⚽
