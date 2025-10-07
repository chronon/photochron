# Photochron - Copilot Instructions

## Repository Overview

**Photochron** is a multi-user, domain-based photo gallery application built with SvelteKit 2.x and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos based on dynamic API configuration using convention-over-configuration principles.

### Key Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **KV-based configuration** - All user config (CDN, avatars, authorized client IDs) stored in Cloudflare KV
- **D1 database** - Image metadata stored in Cloudflare D1 for fast querying
- **Authenticated uploads** - Upload photos via API endpoint with Cloudflare Access authentication
- **Infinite scroll** - Smooth loading of photo galleries with API pagination
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery and storage

### Key Information

- **Type**: SvelteKit web application for Cloudflare Workers
- **Size**: ~50 source files, TypeScript/Svelte codebase
- **Languages**: TypeScript, Svelte, CSS (Tailwind)
- **Runtime**: Cloudflare Workers (Edge runtime)
- **Package Manager**: pnpm (required, not npm/yarn)
- **Node Version**: 22.x+ (CI uses 22.x)

## Build and Validation Commands

### Prerequisites

1. **Always install pnpm first**: `npm install -g pnpm`
2. **Install dependencies**: `pnpm install`
3. **Approve build scripts when prompted**: Select all packages with `a` then confirm with `y`

### Core Development Workflow

```bash
# Setup (MUST be run first)
pnpm install
# When prompted, approve all build scripts (@tailwindcss/oxide, esbuild, sharp, workerd)

# Development
pnpm dev                    # Start dev server on http://localhost:5173

# Quality Assurance (ALWAYS run before committing)
pnpm check                  # Type check with svelte-check (~10s)
pnpm lint                   # Prettier + ESLint check (~5s)
pnpm format                 # Auto-format code

# Build & Test
pnpm build                  # Production build (~6s)
pnpm preview                # Preview production build
pnpm test                   # Run unit tests with Vitest

# Configuration & Deployment
pnpm config:build           # Generate wrangler.jsonc and KV data from config/app.jsonc
pnpm config:deploy          # Build config and upload KV data to Cloudflare
pnpm deploy                 # Full deployment (config + build + deploy)
pnpm deploy:preview         # Dry run deployment
```

### Configuration Setup

**Required**: Copy `config/app-example.json` to `config/app.jsonc` and configure:

```jsonc
{
  "global": {
    "imageBase": "https://imagedelivery.net/YOUR-ACCOUNT-HASH",
    "imageVariant": "default"
  },
  "wrangler": {
    "kv_namespaces": [
      {
        "binding": "PCHRON_KV",
        "id": "your-kv-namespace-id"
      }
    ],
    "d1_databases": [
      {
        "binding": "PCHRON_DB",
        "database_name": "chrononagram",
        "database_id": "your-d1-database-id"
      }
    ]
  },
  "users": {
    "username": {
      "domain": "example.com",
      "avatar": { "id": "image-id", "variant": "default" },
      "authorized_client_ids": ["cloudflare-access-service-token-client-id"]
    }
  }
}
```

- Configuration stored in Cloudflare KV (not environment variables)
- JSONC format supports comments
- Build scripts automatically generate `wrangler.jsonc` and KV data
- Create `.dev.vars` with `CF_IMAGES_TOKEN` and `DEV_USER` for local development

### Common Issues and Workarounds

1. **ESLint Warning**: Ignore `.eslintignore` deprecation warning - configuration works correctly
2. **pnpm build scripts**: ALWAYS approve all packages when prompted or build will fail
3. **Configuration file**: Must create `config/app.jsonc` from example before deployment
4. **KV namespace**: Must create Cloudflare KV namespace and add ID to config

## Project Architecture and Layout

### Technology Stack

- **SvelteKit 2.x** with TypeScript and Svelte 5
- **Tailwind CSS 4.x** with Vite plugin
- **Vitest** for unit testing
- **Cloudflare Workers** deployment with adapter-cloudflare
- **Cloudflare KV** for configuration storage

### Key Directories and Files

#### Configuration Files (Root)

- `package.json` - Scripts and dependencies
- `wrangler.jsonc` - Auto-generated Cloudflare Workers deployment config
- `svelte.config.js` - SvelteKit configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules (flat config format)
- `.prettierrc` - Prettier formatting rules

#### Configuration Directory (`config/`)

- `app.jsonc` - Source of truth for all configuration (JSONC format, gitignored)
- `app-example.json` - Example configuration template
- `app.kv.json` - Auto-generated KV data for upload

#### Build Scripts (`scripts/`)

- `build-config.ts` - Master build script that runs wrangler and KV generators
- `build-wrangler.ts` - Generates `wrangler.jsonc` from `app.jsonc`
- `build-kv.ts` - Generates `app.kv.json` from `app.jsonc`
- `deploy-kv.ts` - Uploads KV data to Cloudflare (local and remote)

#### Source Structure (`src/`)

```
src/
├── lib/
│   ├── config.ts              # Domain parsing, KV config fetching, TypeScript interfaces
│   └── InfiniteScroll.svelte # Reusable infinite scroll component
├── routes/
│   ├── admin/api/upload/
│   │   └── +server.ts        # Authenticated upload endpoint (Cloudflare Access + Images + D1)
│   ├── api/images/
│   │   └── +server.ts        # Paginated image data API (D1 queries)
│   ├── +layout.server.ts     # Domain-to-user detection, KV config loading, D1 image fetching
│   ├── +layout.svelte        # Site header with user info
│   ├── +page.server.ts       # Image data passing with validation
│   └── +page.svelte          # Main photo gallery with infinite scroll
├── hooks.server.ts           # Dynamic favicon handling using KV config
├── app.html                  # HTML template with favicon links
├── app.d.ts                  # TypeScript ambient declarations (Cloudflare KV, D1, env vars)
└── app.css                   # Global styles
```

#### Static Assets (`static/`)

- `fallback-*.png` - Fallback favicons when API fails

#### Test Structure

- `src/lib/config.test.ts` - Unit tests for config module (Vitest)
- `src/lib/InfiniteScroll.svelte.test.ts` - Component tests (Vitest + vitest-browser-svelte)

### Configuration & Data Storage

**Configuration (from Cloudflare KV):**

- **Global config** (`global` key): Image CDN settings
- **User config** (`user:USERNAME` key): Domain, avatar, authorized client IDs per user

**Image Metadata (from Cloudflare D1):**

The application stores image metadata in D1 database:

```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY NOT NULL,     -- Cloudflare Images ID
  username TEXT NOT NULL,           -- Owner username
  name TEXT NOT NULL,               -- Display name
  caption TEXT,                     -- Optional caption
  captured TEXT NOT NULL,           -- ISO8601 date when photo was captured
  uploaded TEXT NOT NULL,           -- ISO8601 date when uploaded
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Upload API:**

Authenticated endpoint at `admin.example.com/admin/api/upload`:

- Validates via Cloudflare Access (service tokens)
- Authorizes client ID against user's `authorized_client_ids` in KV
- Uploads photo to Cloudflare Images
- Inserts metadata to D1
- Returns success response

### Domain-Based Routing

- **example.com** → username: `example` → D1: `SELECT * FROM images WHERE username = 'example'`
- **photos.jane-doe.com** → username: `jane-doe` → D1: `SELECT * FROM images WHERE username = 'jane-doe'`
- **admin.example.com/admin/api/upload** → Authenticated upload → Cloudflare Images + D1 insert

### Dynamic Favicon System

SvelteKit hooks (`src/hooks.server.ts`) intercept favicon requests, load avatar ID from KV, and redirect to user-specific Cloudflare Images variants (`favicon16`, `favicon32`, `apple180`). Falls back to static files if KV fetch fails.

## Continuous Integration

### GitHub Actions (`.github/workflows/ci.yml`)

- **Triggers**: All branches except `main`
- **Environment**: Node.js 22.x
- **Steps**: Install pnpm → Install deps → Type check → Run tests
- **Note**: Deployment requires Cloudflare KV configuration

### Pre-commit Requirements

**CRITICAL**: Always run before committing:

```bash
pnpm check && pnpm lint
```

Both commands MUST pass or CI will fail.

## Key Dependencies and Constraints

### Runtime Requirements

- **Node.js**: 22.x+ (engine-strict=true in .npmrc)
- **pnpm**: Required package manager
- **Cloudflare Workers**: Deployment target

### Build-time Dependencies

- **SvelteKit**: Framework
- **TypeScript**: Type checking
- **Tailwind CSS**: Styling
- **ESLint + Prettier**: Code quality

### Development Notes

1. **Always use pnpm** - npm/yarn will not work correctly
2. **Configuration file required** - Create `config/app.jsonc` from example before deployment
3. **KV bindings** - App runs in Cloudflare Workers with KV namespace bindings
4. **Type checking is strict** - All TypeScript errors must be resolved
5. **Formatting is enforced** - Code must pass Prettier checks
6. **Auto-generated files** - Never manually edit `wrangler.jsonc` or `config/app.kv.json`
7. **Deploy process** - Always use `pnpm deploy` which handles config generation and KV upload

## Instructions for Agents

**Trust these instructions** - They are validated and comprehensive. Only search for additional information if:

1. These instructions are incomplete for your specific task
2. You encounter errors not documented here
3. You need to understand specific business logic in the code

**Before making changes:**

1. Run `pnpm check && pnpm lint` to establish baseline
2. Make minimal, focused changes
3. Test changes with `pnpm check && pnpm lint && pnpm build`
4. For UI changes, also test with `pnpm dev`

**Common tasks:**

- **Adding features**: Follow existing patterns in `src/routes/` and `src/lib/`
- **Styling changes**: Use Tailwind CSS classes, follow existing component patterns
- **Database changes**: Create new migration in `migrations/`, apply with `wrangler d1 migrations apply`
- **API changes**: Update TypeScript interfaces in `src/lib/config.ts`
- **Adding users**: Create Cloudflare Access service token, edit `config/app.jsonc` with authorized client IDs, then run `pnpm deploy`
- **Configuration changes**: Edit `config/app.jsonc` (never edit auto-generated files)
- **Build script changes**: Modify files in `scripts/`, test with `pnpm config:build`
- **Upload endpoint changes**: Modify `src/routes/admin/api/upload/+server.ts`, ensure tests pass

**Platform considerations:**

- **Cloudflare Workers runtime**: Always consider that this app runs in Cloudflare Workers - don't write or suggest code that isn't optimal for that platform
- **Cloudflare ecosystem**: Remember that other Cloudflare products that work with Cloudflare Workers are available to suggest if it makes the most sense
