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

This is a multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos using Cloudflare KV for configuration storage.

### Key Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - Extracts username from domain (example.com → example user)
- **KV-based configuration** - Global and user config stored in Cloudflare KV
- **Dynamic content** - Images fetched from API at runtime
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Infinite scroll** - Smooth loading with IntersectionObserver
- **Cloudflare Images integration** - Optimized image delivery

### Key Components

- **Layout Server Load** (`src/routes/+layout.server.ts`) - Extracts username from domain, loads config from KV, fetches images from API
- **Page Server Load** (`src/routes/+page.server.ts`) - Passes images data from parent layout
- **Main Gallery** (`src/routes/+page.svelte`) - Displays images with user info and infinite scroll
- **InfiniteScroll Component** (`src/lib/InfiniteScroll.svelte`) - Reusable component using IntersectionObserver API
- **Config Module** (`src/lib/config.ts`) - Domain parsing, KV config fetching, and TypeScript interfaces
- **Hooks Server** (`src/hooks.server.ts`) - Intercepts favicon requests and redirects using KV config

### Configuration System

- **Cloudflare KV Storage** - Stores global and per-user configuration at deployment time
- **KV Keys**:
  - `global` - API base URL, image CDN settings
  - `user:USERNAME` - Domain, name, avatar per user
- **No environment variables** - All config in KV
- **Deploy-time configuration** - `config/app.json` → KV upload → deployment

### API Integration

The app fetches only image data from `${apiBase}/data/${username}/content.json`:

- `images[]` - Array of photos with id, name, caption, taken/uploaded dates

Configuration (CDN URLs, avatars, user info) comes from KV, not the API.

### Technology Stack

- SvelteKit 2.x with TypeScript and Svelte 5
- Tailwind CSS 4.x with Vite plugin
- Vitest for unit testing
- Playwright for e2e testing
- Cloudflare Workers deployment target with adapter-cloudflare

### File Structure

- `src/routes/+layout.server.ts` - Domain-based user detection, KV config loading, API image fetching
- `src/routes/+page.server.ts` - Image data passing from layout
- `src/routes/+page.svelte` - Main gallery display with infinite scroll
- `src/lib/InfiniteScroll.svelte` - Reusable infinite scroll component
- `src/lib/config.ts` - Configuration types, domain parsing, and KV utilities
- `src/hooks.server.ts` - Dynamic favicon handling using KV config
- `wrangler.jsonc` - Auto-generated from config/app.json at deploy time
- `config/app.json` - Source of truth for all configuration (gitignored)

### Dynamic Favicon System

The application implements user-specific favicons that change per domain:

- **Favicon interception** - SvelteKit hooks intercept `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`, and `/apple-touch-icon.png` requests
- **User avatar variants** - Loads avatar ID from KV, redirects to Cloudflare Images variants: `favicon16`, `favicon32`, `apple180`
- **Fallback system** - Falls back to static files (`fallback-*` in `/static/`) if KV fetch fails
- **Edge caching** - HTTP 302 redirects with 1-hour cache headers for performance

**Required Cloudflare Images variants:**

- `favicon16` (16x16, PNG)
- `favicon32` (32x32, PNG)
- `apple180` (180x180, PNG)

### Misc

- When planning or writing code, always remember and consider that this app runs in Cloudflare Workers. Don't write or suggest code that isn't optimal for that platform.
- Remember that other Cloudflare products that work with Cloudflare Workers are available to suggest if it makes the most sense.
