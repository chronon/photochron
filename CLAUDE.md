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
- **Infinite scroll** - Smooth loading with IntersectionObserver
- **Cloudflare Images integration** - Optimized image delivery

### Key Components

- **Layout Server Load** (`src/routes/+layout.server.ts`) - Extracts username from domain and fetches user configuration from API
- **Page Server Load** (`src/routes/+page.server.ts`) - Passes images data from parent layout
- **Main Gallery** (`src/routes/+page.svelte`) - Displays images with user info and infinite scroll
- **InfiniteScroll Component** (`src/lib/InfiniteScroll.svelte`) - Reusable component using IntersectionObserver API
- **Config Module** (`src/lib/config.ts`) - Domain parsing and API response handling with full TypeScript interfaces

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
- `wrangler.jsonc` - Cloudflare Workers deployment configuration
