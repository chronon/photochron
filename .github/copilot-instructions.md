# Chrononagram Web - Copilot Instructions

## Repository Overview

**Chrononagram Web** is a multi-user, domain-based photo gallery application built with SvelteKit 2.x and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos based on dynamic API configuration using convention-over-configuration principles.

### Key Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **KV-based configuration** - All user config (CDN, avatars) stored in Cloudflare KV
- **Dynamic content** - Images fetched from API per user
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery
- **Zero secrets** - No environment variables or API keys needed

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
    "apiBase": "https://api.yourdomain.com",
    "imageBase": "https://imagedelivery.net/YOUR-ACCOUNT-HASH",
    "imageVariant": "default"
  },
  "wrangler": {
    "kv_namespaces": [
      {
        "binding": "CHRONONAGRAM",
        "id": "your-kv-namespace-id"
      }
    ]
  },
  "users": {
    "username": {
      "domain": "example.com",
      "avatar": { "id": "image-id", "variant": "default" }
    }
  }
}
```

- Configuration stored in Cloudflare KV (not environment variables)
- JSONC format supports comments
- Build scripts automatically generate `wrangler.jsonc` and KV data

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
│   ├── +layout.server.ts     # Domain-to-user detection, KV config loading, API image fetching
│   ├── +layout.svelte        # Site header with user info
│   ├── +page.server.ts       # Image data passing with validation
│   └── +page.svelte          # Main photo gallery with infinite scroll
├── hooks.server.ts           # Dynamic favicon handling using KV config
├── app.html                  # HTML template with favicon links
├── app.d.ts                  # TypeScript ambient declarations (Cloudflare KV bindings)
└── app.css                   # Global styles
```

#### Static Assets (`static/`)

- `fallback-*.png` - Fallback favicons when API fails

#### Test Structure

- `src/lib/config.test.ts` - Unit tests for config module (Vitest)
- `src/lib/InfiniteScroll.svelte.test.ts` - Component tests (Vitest + vitest-browser-svelte)

### Configuration & API Integration

**Configuration (from Cloudflare KV):**
- **Global config** (`global` key): API base URL, image CDN settings
- **User config** (`user:USERNAME` key): Domain, avatar per user

**API Integration:**

The application fetches only image data from: `${apiBase}/data/${username}/content.json`

Expected API response structure:

```json
{
  "images": [
    {
      "id": "example-image-id",
      "name": "Sample Photo",
      "caption": "A beautiful sunset photo",
      "taken": "2025-01-15T18:30:00-05:00",
      "uploaded": "2025-01-15T20:15:00-05:00"
    }
  ]
}
```

Configuration (CDN URLs, avatars, user info) comes from KV, not the API.

### Domain-Based Routing

- **example.com** → username: `example` → API: `/data/example/content.json`
- **photos.jane-doe.com** → username: `jane-doe` → API: `/data/jane-doe/content.json`

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
- **API changes**: Update TypeScript interfaces in `src/lib/config.ts`
- **Adding users**: Edit `config/app.jsonc`, then run `pnpm deploy`
- **Configuration changes**: Edit `config/app.jsonc` (never edit auto-generated files)
- **Build script changes**: Modify files in `scripts/`, test with `pnpm config:build`

**Platform considerations:**

- **Cloudflare Workers runtime**: Always consider that this app runs in Cloudflare Workers - don't write or suggest code that isn't optimal for that platform
- **Cloudflare ecosystem**: Remember that other Cloudflare products that work with Cloudflare Workers are available to suggest if it makes the most sense
