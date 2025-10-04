# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### Testing & Quality

- `pnpm test` - Run unit tests with Vitest
- `pnpm check` - Type check with svelte-check
- `pnpm lint` - Check formatting and linting with Prettier + ESLint
- `pnpm format` - Format code with Prettier

### Configuration & Deployment

- `pnpm config:build` - Generate wrangler.jsonc and KV data from config/app.jsonc
- `pnpm config:deploy` - Build config and upload KV data to Cloudflare
- `pnpm deploy` - Full deployment (build config, upload KV, build app, deploy to Workers)
- `pnpm deploy:preview` - Preview deployment (dry run)

### Development Workflow

- Use `pnpm check` and `pnpm lint` before committing changes

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
  - `user:USERNAME` - Domain, avatar per user
- **No environment variables** - All config in KV
- **Deploy-time configuration** - `config/app.jsonc` (JSONC format with comments support) → Build scripts → KV upload → deployment
- **Build scripts** - Automated scripts transform `app.jsonc` into `wrangler.jsonc` and `app.kv.json`

### API Integration

The app fetches only image data from `${apiBase}/data/${username}/content.json`:

- `images[]` - Array of photos with id, name, caption, taken/uploaded dates

Configuration (CDN URLs, avatars, user info) comes from KV, not the API.

### Technology Stack

- SvelteKit 2.x with TypeScript and Svelte 5
- Tailwind CSS 4.x with Vite plugin
- Vitest for unit testing
- Cloudflare Workers deployment target with adapter-cloudflare

### File Structure

- `src/routes/+layout.server.ts` - Domain-based user detection, KV config loading, API image fetching
- `src/routes/+page.server.ts` - Image data passing from layout
- `src/routes/+page.svelte` - Main gallery display with infinite scroll
- `src/lib/InfiniteScroll.svelte` - Reusable infinite scroll component
- `src/lib/config.ts` - Configuration types, domain parsing, and KV utilities
- `src/hooks.server.ts` - Dynamic favicon handling using KV config
- `config/app.jsonc` - Source of truth for all configuration (JSONC format, gitignored)
- `config/app-example.json` - Example configuration template
- `scripts/build-config.ts` - Master build script that runs wrangler and KV generators
- `scripts/build-wrangler.ts` - Generates `wrangler.jsonc` from `app.jsonc`
- `scripts/build-kv.ts` - Generates `app.kv.json` from `app.jsonc`
- `scripts/deploy-kv.ts` - Uploads KV data to Cloudflare (local and remote)
- `wrangler.jsonc` - Auto-generated at deploy time from config/app.jsonc
- `config/app.kv.json` - Auto-generated KV data for upload

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
