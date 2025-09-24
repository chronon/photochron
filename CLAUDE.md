# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### Testing & Quality

- `pnpm test` - Run all tests (unit + e2e)
- `pnpm test:unit` - Run unit tests with Vitest
- `pnpm test:e2e` - Run e2e tests with Playwright
- `pnpm check` - Type check with svelte-check
- `pnpm lint` - Check formatting and linting with Prettier + ESLint
- `pnpm format` - Format code with Prettier

### Deployment

- `pnpm deploy` - Build and deploy to Cloudflare Workers
- `pnpm deploy:preview` - Build and preview deployment (dry run)

### Development Workflow

- Use `pnpm check` and `pnpm lint` before committing changes
- E2E tests build and preview the app on port 4173 before running

## Architecture

This is a multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos based on dynamic API configuration.

### Key Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - Extracts username from domain (example.com → example user)
- **Dynamic configuration** - All user config fetched from API endpoints
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Infinite scroll** - Smooth loading with IntersectionObserver
- **Cloudflare Images integration** - Optimized image delivery

### Key Components

- **Layout Server Load** (`src/routes/+layout.server.ts`) - Extracts username from domain and fetches user configuration from API
- **Page Server Load** (`src/routes/+page.server.ts`) - Passes images data from parent layout
- **Main Gallery** (`src/routes/+page.svelte`) - Displays images with user info and infinite scroll
- **InfiniteScroll Component** (`src/lib/InfiniteScroll.svelte`) - Reusable component using IntersectionObserver API
- **Config Module** (`src/lib/config.ts`) - Domain parsing and API response handling with full TypeScript interfaces
- **Hooks Server** (`src/hooks.server.ts`) - Intercepts favicon requests and redirects to user-specific Cloudflare Images variants

### API Integration

The app fetches all configuration from `${PUBLIC_API_BASE}/data/${username}/content.json` with this expected structure:

- `user.name` and `user.avatar` - Profile information
- `config.imageBase` and `config.imageVariant` - CDN configuration
- `images[]` - Array of photos with id, caption, taken/uploaded dates

### Environment Configuration

- Uses Cloudflare Workers deployment (configured in wrangler.jsonc)
- Environment variables: `PUBLIC_API_BASE` (API endpoint) and `PUBLIC_USER_NAME` (dev only)
- Images served from configurable CDN (typically Cloudflare Images)

### Technology Stack

- SvelteKit 2.x with TypeScript and Svelte 5
- Tailwind CSS 4.x with Vite plugin
- Vitest for unit testing
- Playwright for e2e testing
- Cloudflare Workers deployment target with adapter-cloudflare

### File Structure

- `src/routes/+layout.server.ts` - Domain-based user detection and API config loading
- `src/routes/+page.server.ts` - Image data passing from layout
- `src/routes/+page.svelte` - Main gallery display with infinite scroll
- `src/lib/InfiniteScroll.svelte` - Reusable infinite scroll component
- `src/lib/config.ts` - Configuration types and domain/API utilities
- `src/hooks.server.ts` - Dynamic favicon handling with user-specific redirects
- `wrangler.jsonc` - Cloudflare Workers deployment configuration

### Dynamic Favicon System

The application implements user-specific favicons that change per domain:

- **Favicon interception** - SvelteKit hooks intercept `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`, and `/apple-touch-icon.png` requests
- **User avatar variants** - Redirects to Cloudflare Images variants: `favicon16`, `favicon32`, `apple180`
- **Fallback system** - Falls back to static files (`fallback-*` in `/static/`) if API fails
- **Edge caching** - HTTP 302 redirects with 1-hour cache headers for performance

**Required Cloudflare Images variants:**

- `favicon16` (16x16, PNG)
- `favicon32` (32x32, PNG)
- `apple180` (180x180, PNG)

### Misc

- When planning or writing code, always remember and consider that this app runs in Cloudflare Workers. Don't write or suggest code that isn't optimal for that platform.
- Remember that other Cloudflare products that work with Cloudflare Workers are available to suggest if it makes the most sense.
