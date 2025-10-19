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

This is a multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos using Cloudflare KV for configuration and Cloudflare D1 for image metadata storage.

### Key Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - Extracts username from domain (example.com → example user)
- **KV-based configuration** - Global and user config stored in Cloudflare KV
- **D1 database** - Image metadata stored in Cloudflare D1 for fast querying
- **Authenticated uploads** - Upload photos via API endpoint with Cloudflare Access authentication
- **Authenticated deletion** - Delete photos via API endpoint with ownership verification
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Infinite scroll** - Smooth loading with IntersectionObserver
- **Cloudflare Images integration** - Optimized image delivery and storage

### Key Components

- **Layout Server Load** (`src/routes/+layout.server.ts`) - Extracts username from domain, loads config from KV, fetches images from D1
- **Page Server Load** (`src/routes/+page.server.ts`) - Passes images data from parent layout
- **Main Gallery** (`src/routes/+page.svelte`) - Displays images with user info and infinite scroll
- **Upload Endpoint** (`src/routes/admin/api/upload/+server.ts`) - Handles authenticated photo uploads, validates via Cloudflare Access, uploads to Cloudflare Images, inserts to D1
- **Lookup Endpoint** (`src/routes/admin/api/images/by-name/[photoName]/+server.ts`) - Finds image ID by photo name with case-insensitive matching, returns most recent if duplicates exist
- **Delete Endpoint** (`src/routes/admin/api/delete/[imageId]/+server.ts`) - Handles authenticated photo deletion, verifies ownership, deletes from D1 and Cloudflare Images
- **Images API** (`src/routes/api/images/+server.ts`) - Returns paginated images from D1 for infinite scroll
- **InfiniteScroll Component** (`src/lib/InfiniteScroll.svelte`) - Reusable component using IntersectionObserver API
- **Config Module** (`src/lib/config.ts`) - Domain parsing, KV config fetching, and TypeScript interfaces
- **Hooks Server** (`src/hooks.server.ts`) - Intercepts favicon requests and redirects using KV config

### Configuration System

- **Cloudflare KV Storage** - Stores global and per-user configuration at deployment time
- **KV Keys**:
  - `global` - Image CDN settings
  - `user:USERNAME` - Domain, avatar, authorized client IDs per user
- **Environment secrets** - `CF_IMAGES_TOKEN` (Cloudflare Images API token), `CF_ACCESS_TEAM_DOMAIN` (Cloudflare Access team domain), `DEV_USER` (localhost development username), `DEV_CLIENT_ID` (local development auth bypass)
- **Deploy-time configuration** - `config/app.jsonc` (JSONC format with comments support) → Build scripts → KV upload → deployment
- **Build scripts** - Automated scripts transform `app.jsonc` into `wrangler.jsonc` and `app.kv.json`

### D1 Database

The app stores image metadata in Cloudflare D1:

- **Table**: `images` - Contains id, username, name, caption, captured, uploaded, created_at
- **Indexes**:
  - `idx_username_captured` - Optimizes gallery queries by username and captured date
  - `idx_username_name_uploaded` - Optimizes lookup-by-name queries
- **Queries**:
  - Gallery: `SELECT * FROM images WHERE username = ? ORDER BY captured DESC LIMIT ? OFFSET ?`
  - Lookup: `SELECT id, name, captured, uploaded FROM images WHERE username = ? AND name = ? COLLATE NOCASE ORDER BY uploaded DESC LIMIT 1`

### Authentication & Authorization

The app uses a centralized authentication system for all `/admin/*` routes:

**Architecture:**

- **Cloudflare Access (Edge)** - Primary security boundary, blocks unauthenticated requests
- **SvelteKit Hooks** - Application-level validation and authorization
- **KV Authorization** - Per-user authorized client ID lists

**Authentication Flow:**

1. Request hits `/admin/*` route
2. `handleAdminAuth` hook in `src/hooks.server.ts` intercepts request
3. Extracts identity from Cloudflare Access headers (`Cf-Access-Client-Id` or `Cf-Access-Jwt-Assertion`)
4. Validates JWT claims (expiration, issuer) for defense-in-depth
5. Checks client ID against user's `authorized_client_ids` in KV
6. Sets authenticated context in `event.locals.adminAuth` for downstream handlers

**Supported Authentication Types:**

- **Service Tokens** - For automated clients (client ID from `common_name` JWT claim or header)
- **IdP Users** - For browser-based access (client ID from `email` JWT claim)

**Local Development:**

- Uses development bypass when `CF_ACCESS_TEAM_DOMAIN=dev` (from `.dev.vars`)
- `DEV_CLIENT_ID` env var provides local authorization without KV lookup
- Never activates in production (wrangler.jsonc has real team domain)

**Configuration:**

- `CF_ACCESS_TEAM_DOMAIN` - Cloudflare Access team domain (e.g., `https://yourteam.cloudflareaccess.com`)
- `authorized_client_ids` - Array of allowed client IDs per user in KV config
- Service token secrets stored securely, never committed to git

**Key Files:**

- `src/lib/auth.ts` - Authentication/authorization functions
- `src/hooks.server.ts` - Request interception and auth enforcement
- `src/app.d.ts` - Type definitions for `event.locals.adminAuth`

### Admin API Endpoints

The app provides authenticated admin endpoints for managing photos:

**Upload API** (`/admin/api/upload`):

- **Authentication**: Handled by hooks layer (see Authentication & Authorization above)
- **Flow**: Multipart form data → Validate → Upload to Cloudflare Images → Insert to D1 → Return response
- **Metadata**: name, caption, captured date provided by client; uploaded date added by server

**Lookup API** (`/admin/api/images/by-name/[photoName]`):

- **Authentication**: Handled by hooks layer (see Authentication & Authorization above)
- **Flow**: Extract photoName from URL → Query D1 with case-insensitive match → Return most recent if duplicates → Return image metadata with ID
- **Use case**: Enables automation tools (like Apple Shortcuts) to find image ID by photo name for deletion
- **Behavior**: Returns most recent photo if multiple photos have same name

**Delete API** (`/admin/api/delete/[imageId]`):

- **Authentication**: Handled by hooks layer (see Authentication & Authorization above)
- **Flow**: Extract imageId from URL → Verify ownership → Delete from D1 → Delete from Cloudflare Images → Return response
- **Ownership**: Ensures users can only delete their own images based on domain-derived username
- **Workflow with Lookup**: For automation tools with only photo names, use lookup endpoint first to get ID, then use delete endpoint

### Technology Stack

- SvelteKit 2.x with TypeScript and Svelte 5
- Tailwind CSS 4.x with Vite plugin
- Vitest for unit testing
- Cloudflare Workers deployment target with adapter-cloudflare

### File Structure

- `src/routes/+layout.server.ts` - Domain-based user detection, KV config loading, D1 image fetching
- `src/routes/+page.server.ts` - Image data passing from layout
- `src/routes/+page.svelte` - Main gallery display with infinite scroll
- `src/routes/admin/api/upload/+server.ts` - Authenticated upload endpoint (Cloudflare Access + D1 + Images)
- `src/routes/admin/api/images/by-name/[photoName]/+server.ts` - Authenticated lookup endpoint (finds image ID by photo name)
- `src/routes/admin/api/delete/[imageId]/+server.ts` - Authenticated delete endpoint (Cloudflare Access + ownership verification)
- `src/routes/api/images/+server.ts` - Paginated image data API (D1 queries)
- `src/lib/InfiniteScroll.svelte` - Reusable infinite scroll component
- `src/lib/config.ts` - Configuration types, domain parsing, and KV utilities
- `src/hooks.server.ts` - Dynamic favicon handling using KV config
- `migrations/0001_initial_schema.sql` - D1 database schema and indexes
- `migrations/0002_change_sort_to_captured.sql` - Change primary sort order from uploaded to captured date
- `migrations/0003_add_name_index.sql` - Add composite index for lookup-by-name queries
- `config/app.jsonc` - Source of truth for all configuration (JSONC format, gitignored)
- `config/app-example.json` - Example configuration template
- `scripts/build-config.ts` - Master build script that runs wrangler and KV generators
- `scripts/build-wrangler.ts` - Generates `wrangler.jsonc` from `app.jsonc`
- `scripts/build-kv.ts` - Generates `app.kv.json` from `app.jsonc`
- `scripts/deploy-kv.ts` - Uploads KV data to Cloudflare (local and remote)
- `wrangler.jsonc` - Auto-generated at deploy time from config/app.jsonc
- `config/app.kv.json` - Auto-generated KV data for upload
- `.dev.vars` - Local development secrets (CF_IMAGES_TOKEN, DEV_USER)

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
