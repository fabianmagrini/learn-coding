# BunnyWallet Frontend Setup Guide

This guide covers setting up and running the BunnyWallet React frontend dashboard.

## Technology Stack

- **React 19** - Latest React with concurrent features
- **TypeScript 5.9** - Full type safety
- **Vite 7** - Lightning-fast build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible component library
- **React Router 7** - Client-side routing
- **Lucide React** - Beautiful icon library

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Running AQS backend (see main README.md)

## Quick Start

### 1. Install Dependencies

```bash
cd frontend/react-app
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will start at **http://localhost:3000** with hot module replacement.

### 3. Access the Application

Open your browser to http://localhost:3000

## Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Type-check with TypeScript
```

## Project Structure

```
frontend/react-app/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # shadcn/ui base components
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   └── AccountCard.tsx  # Account display card
│   ├── pages/           # Page components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── AccountDetails.tsx  # Individual account view
│   │   └── Admin.tsx        # Admin control panel
│   ├── services/        # API integration
│   │   └── api.ts       # AQS API client
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── lib/             # Utilities
│   │   └── utils.ts     # Helper functions
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Features

### Dashboard Page (/)

The main dashboard displays all accounts in a responsive grid:

- **Account Cards** showing:
  - Account type badge (color-coded)
  - Display name and account ID
  - Available balance
  - Account status (active, suspended, closed)
  - Backend source
  - Last updated timestamp
  - Stale cache indicator
  - Request latency (color-coded: green <100ms, yellow <500ms, red >500ms)

- **Controls**:
  - Refresh All button
  - Force refresh checkbox (bypasses cache)
  - Request ID and overall status display

- **Real-time Updates**:
  - Loading states with skeleton screens
  - Partial success visualization
  - Error handling with clear messages

### Account Details Page (/account/:accountId)

Click any account card to view detailed information:

- **Account Information Card**:
  - Account type and status
  - Backend source
  - Last updated timestamp
  - Cache status (fresh/stale)

- **Balances Card**:
  - Available balance
  - Ledger balance (if available)
  - Currency formatting

- **Owner Information Card** (if available):
  - Owner name
  - Customer ID

- **Raw Metadata Card**:
  - Full JSON response from backend
  - Syntax-highlighted display

- **Actions**:
  - Refresh account data
  - Clear cache for this account
  - Back to dashboard

### Admin Page (/admin)

Control panel for backend simulation:

- **Backend Simulation Controls**:
  - Toggle each backend between modes:
    - Healthy - Normal operation
    - Slow (2s) - Simulated latency
    - Error - Return 500 errors
    - Flaky - 50% chance of error

- **Cache Management**:
  - Invalidate all cache button
  - Useful for testing cache behavior

- **Feedback Messages**:
  - Success/error notifications for all actions

## Configuration

### API Proxy

The Vite dev server proxies `/v1/*` requests to the AQS backend at `http://localhost:8080`.

This is configured in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/v1': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

### Environment Variables

No environment variables are required for local development. The proxy configuration handles API routing.

For production builds, set the API base URL via:

```typescript
// src/services/api.ts
const API_BASE_URL = process.env.VITE_API_URL || '/v1';
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS 4 with a custom configuration:

- **Design System Variables** defined in `index.css`
- **Dark Mode Support** (class-based)
- **Responsive Breakpoints**: `sm`, `md`, `lg`, `xl`, `2xl`
- **Custom Colors**: Using CSS variables for theming

### shadcn/ui Components

Components follow the shadcn/ui pattern:

- Located in `src/components/ui/`
- Fully customizable and composable
- Built on Radix UI primitives (for accessibility)
- Styled with Tailwind utilities

### Adding New Components

```bash
# Example: Add a dialog component (if using shadcn CLI)
npx shadcn-ui@latest add dialog
```

Or manually create components in `src/components/ui/`.

## API Integration

### API Service

The `apiService` class in `src/services/api.ts` provides methods for:

```typescript
// Get single account
await apiService.getAccount('bank-001');

// Get multiple accounts
await apiService.getAccounts(['bank-001', 'credit-001']);

// Simulate backend behavior
await apiService.simulateBackend('bank-service', {
  mode: 'slow',
  latencyMs: 2000
});

// Cache management
await apiService.invalidateCache('bank-001');
await apiService.invalidateAllCache();
```

### Authentication

JWT token support is built-in:

```typescript
// Set token (e.g., from login)
apiService.setToken('your-jwt-token');

// Token is automatically included in requests
// and persisted to localStorage
```

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR for:
- React components
- CSS changes
- TypeScript files

Changes appear in the browser without full page reload.

### TypeScript Checking

Run type checking without building:

```bash
npm run lint
```

### Browser DevTools

- **React DevTools** - Inspect component tree
- **Redux DevTools** - (if you add state management)
- **Network Tab** - Monitor API calls to AQS

## Demo Accounts

The dashboard loads these demo accounts by default:

- `bank-001` - Bank Account #1
- `bank-002` - Bank Account #2
- `credit-001` - Credit Card Account
- `loan-001` - Loan Account
- `invest-001` - Investment Account
- `legacy-001` - Legacy System Account
- `crypto-001` - Cryptocurrency Wallet (NEW!)

## Testing Scenarios

### Cache Behavior

1. Load dashboard (cold request - cache miss)
2. Click refresh (warm request - cache hit, <10ms)
3. Enable "Force Refresh" checkbox
4. Click refresh (bypasses cache)

### Backend Failure Handling

1. Go to Admin page
2. Set a backend to "Error" mode
3. Return to Dashboard
4. Observe:
   - Account shows stale data (if cached)
   - Or shows error message (if no cache)
   - Circuit breaker may trigger

### Partial Results

1. Set multiple backends to different modes (slow, error, healthy)
2. Refresh dashboard
3. Observe:
   - Some accounts load quickly
   - Some show stale data
   - Some show errors
   - Overall status shows "partial"

### Latency Visualization

1. Set backend to "slow" mode (2000ms)
2. Refresh account
3. Observe red latency indicator (>500ms)

## Production Build

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Serves the production build at http://localhost:4173

### Deploy

The `dist/` directory contains:
- `index.html` - Entry point
- `assets/` - Bundled JS and CSS files

Deploy to any static hosting:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `dist/` folder
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **NGINX**: Copy to web root

### Environment Configuration

For production, configure the API URL:

```bash
VITE_API_URL=https://api.yourdomain.com/v1 npm run build
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
# Change port in vite.config.ts or use environment variable
PORT=3001 npm run dev
```

### API Connection Issues

1. Ensure AQS service is running on port 8080
2. Check browser console for CORS errors
3. Verify proxy configuration in `vite.config.ts`

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Type Errors

```bash
# Ensure TypeScript version matches
npm install -D typescript@^5.9.3

# Check tsconfig.json settings
npm run lint
```

## Accessibility

The frontend is built with accessibility in mind:

- **Keyboard Navigation**: All interactive elements are keyboard-accessible
- **ARIA Labels**: Proper labeling for screen readers
- **Color Contrast**: Meets WCAG AA standards
- **Focus Indicators**: Clear focus states on all controls
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Performance

- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Optimized Bundle**: Tree-shaking and minification
- **Fast Refresh**: HMR for instant updates

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Contributing

When adding new features:

1. Follow existing component patterns
2. Use TypeScript for all new code
3. Add proper types for API responses
4. Update this documentation
5. Test in all browsers

## Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Need Help?** Check the main [README.md](../README.md) or [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)
