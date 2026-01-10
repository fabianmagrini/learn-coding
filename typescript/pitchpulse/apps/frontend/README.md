# PitchPulse Frontend

React-based frontend application for PitchPulse football news aggregator.

## Tech Stack

- React 18 + TypeScript
- rsbuild (build tool)
- Tailwind CSS + shadcn/ui
- TanStack Query (server state)
- Zustand (client state)
- React Router
- Vitest + React Testing Library
- Storybook

## Features

- **Authentication Pages**: Login and registration
- **Onboarding Flow**: Team and league selection
- **News Feed**: Personalized article cards
- **Responsive Design**: Mobile-first approach
- **Component Library**: shadcn/ui components

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test
pnpm test:ui
pnpm test:coverage

# Start Storybook
pnpm storybook

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── auth/          # Authentication
│   ├── feed/          # News feed
│   └── onboarding/    # User onboarding
├── shared/            # Shared code
│   └── components/    # UI components
│       └── ui/        # shadcn components
├── lib/               # Utilities
│   ├── api.ts         # Axios instance
│   └── utils.ts       # Helper functions
├── test/              # Test setup
├── App.tsx            # Root component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:4000
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm test:coverage` - Generate coverage report
- `pnpm storybook` - Start Storybook
- `pnpm build-storybook` - Build Storybook
- `pnpm lint` - Run ESLint
