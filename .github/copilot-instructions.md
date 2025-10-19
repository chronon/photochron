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
- **Authenticated deletion** - Delete photos via API endpoint with ownership verification
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
    "vars": {
      "CF_ACCOUNT_ID": "your-cloudflare-account-id",
      "CF_ACCESS_TEAM_DOMAIN": "https://your-team.cloudflareaccess.com"
    },
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
- Create `.dev.vars` with `CF_IMAGES_TOKEN`, `CF_ACCESS_TEAM_DOMAIN=dev`, `DEV_USER`, and `DEV_CLIENT_ID` for local development

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
│   ├── admin-utils.ts         # Shared validation and error handling utilities for admin endpoints
│   ├── auth.ts                # Authentication and authorization logic
│   ├── config.ts              # Domain parsing, KV config fetching, TypeScript interfaces
│   └── InfiniteScroll.svelte # Reusable infinite scroll component
├── routes/
│   ├── admin/api/
│   │   └── images/
│   │       ├── +server.ts    # Authenticated upload endpoint (POST, Cloudflare Access + Images + D1)
│   │       ├── [imageId]/
│   │       │   └── +server.ts    # Authenticated delete endpoint (DELETE, Cloudflare Access + ownership verification)
│   │       └── by-name/[photoName]/
│   │           └── +server.ts    # Authenticated lookup endpoint (GET, finds image ID by photo name)
│   ├── api/images/
│   │   └── +server.ts        # Paginated image data API (D1 queries)
│   ├── +layout.server.ts     # Domain-to-user detection, KV config loading, D1 image fetching
│   ├── +layout.svelte        # Site header with user info
│   ├── +page.server.ts       # Image data passing with validation
│   └── +page.svelte          # Main photo gallery with infinite scroll
├── hooks.server.ts           # Admin authentication + dynamic favicon handling
├── app.html                  # HTML template with favicon links
├── app.d.ts                  # TypeScript ambient declarations (Cloudflare KV, D1, env vars)
└── app.css                   # Global styles
```

#### Static Assets (`static/`)

- `fallback-*.png` - Fallback favicons when API fails

#### Test Structure

- `src/lib/auth.test.ts` - Unit tests for authentication module (Vitest)
- `src/lib/config.test.ts` - Unit tests for config module (Vitest)
- `src/routes/admin/api/upload/server.test.ts` - Upload endpoint tests (Vitest)
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

CREATE INDEX idx_username_captured ON images(username, captured DESC);
CREATE INDEX idx_username_name_uploaded ON images(username, name COLLATE NOCASE, uploaded DESC);
```

**Admin API Endpoints:**

Authenticated endpoints for managing photos. All admin endpoints use shared utilities from `src/lib/admin-utils.ts` for consistent validation and error handling:

- **Shared Utilities** (`src/lib/admin-utils.ts`):
  - `validateAuth()` - Type-safe authentication validation from request locals
  - `validatePlatformEnv()` - Platform and database validation with optional required bindings
  - `createErrorResponse()` - Standardized error responses with consistent logging
  - Pattern: All admin endpoints use discriminated unions for validation results

- **Upload** (`POST /admin/api/images`):
  - Validates via Cloudflare Access (service tokens or IdP users)
  - Authorizes client ID against user's `authorized_client_ids` in KV
  - Uploads photo to Cloudflare Images
  - Inserts metadata to D1
  - Returns `{ success: true, id: string, filename: string, uploaded: string }`

- **Lookup** (`GET /admin/api/images/by-name/[photoName]`):
  - Validates via Cloudflare Access (service tokens or IdP users)
  - Authorizes client ID against user's `authorized_client_ids` in KV
  - Searches for photo by name (case-insensitive)
  - Returns most recent photo if multiple matches exist
  - Returns `{ success: true, id: string, name: string, captured: string, uploaded: string }`
  - Use case: Enables automation tools (like Apple Shortcuts) to find image ID by photo name

- **Delete** (`DELETE /admin/api/images/[imageId]`):
  - Validates via Cloudflare Access (service tokens or IdP users)
  - Authorizes client ID against user's `authorized_client_ids` in KV
  - Verifies ownership (prevents cross-user deletion)
  - Deletes metadata from D1
  - Deletes photo from Cloudflare Images (graceful degradation)
  - Returns `{ success: true, id: string, message: string, warning?: string }`
  - Workflow with Lookup: For automation tools with only photo names, use lookup endpoint first to get ID

**Error Responses**: All endpoints return `{ success: false, error: string }`

## Authentication & Authorization Patterns

### Architecture

All `/admin/*` routes use centralized authentication via SvelteKit hooks:

**Two-Layer Security:**

1. **Cloudflare Access (Edge)** - Primary security boundary enforced at edge
2. **Application Validation (Hooks)** - SvelteKit hooks validate JWT claims and check authorization

**Key Files:**

- `src/lib/auth.ts` - Authentication and authorization functions
- `src/hooks.server.ts` - `handleAdminAuth` hook intercepts all `/admin/*` requests
- `src/app.d.ts` - TypeScript types for authenticated context

### Authentication Flow

1. Request hits `/admin/*` route
2. Cloudflare Access validates at edge (enforced on path)
3. `handleAdminAuth` hook intercepts request in application
4. Extracts identity from Cloudflare Access headers
5. Validates JWT claims (expiration, issuer)
6. Checks client ID against user's `authorized_client_ids` in KV
7. Sets `event.locals.adminAuth` with authenticated context
8. Request proceeds to handler with authenticated user info

### Supported Authentication Types

**Service Tokens** (Machine-to-machine):

```
Headers:
  CF-Access-Client-Id: abc123.access
  CF-Access-Client-Secret: secret-key
```

- Used for automated uploads from scripts/applications
- Client ID validated against `authorized_client_ids` in KV

**IdP Users** (Browser-based):

```
Headers:
  CF-Access-Jwt-Assertion: eyJhbGc...
```

- Authenticated via identity providers (Google, GitHub, etc.)
- Email address extracted from JWT
- Email can be added to `authorized_client_ids` for authorization

### Local Development Bypass

Development uses authentication bypass that **only** activates when `CF_ACCESS_TEAM_DOMAIN=dev`:

**Setup `.dev.vars`:**

```bash
DEV_USER=your-username
DEV_CLIENT_ID=dev-client-id
CF_IMAGES_TOKEN=your-images-token
CF_ACCESS_TEAM_DOMAIN=dev
```

**How it works:**

- When `CF_ACCESS_TEAM_DOMAIN=dev`, authentication validation is skipped
- `DEV_CLIENT_ID` is used for authorization bypass
- Only activates in local development (not deployed)

**Security guarantees:**

- `.dev.vars` is gitignored and never deployed
- Production uses real team domain from `wrangler.jsonc`
- Conditional logic requires exact match of `"dev"` string
- Impossible to accidentally activate in production

### Working with Authentication

**Using authenticated context in handlers:**

```typescript
export const POST: RequestHandler = async ({ locals }) => {
  // Get authenticated context from hooks
  if (!locals.adminAuth) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, identity } = locals.adminAuth;
  // identity.type: 'service_token' | 'idp_user'
  // identity.clientId: string
  // identity.email?: string (for IdP users)

  // Your handler logic here...
};
```

**Testing authentication in unit tests:**

```typescript
const event = {
  request: mockRequest,
  platform: {
    env: {
      /* ... */
    }
  },
  locals: {
    adminAuth: {
      username: 'testuser',
      identity: {
        type: 'service_token' as const,
        clientId: 'test-client.access'
      }
    }
  }
} as unknown as Parameters<RequestHandler>[0];
```

### Best Practices

1. **Never bypass hooks** - Don't create admin endpoints outside `/admin/*` path
2. **Always use locals.adminAuth** - Don't parse headers directly in handlers
3. **Test with real service tokens** - Use `pnpm preview` for realistic testing
4. **Never commit secrets** - Keep `.dev.vars` gitignored
5. **Update authorized_client_ids** - Add client IDs to KV config for authorization
6. **Use appropriate auth type** - Service tokens for automation, IdP for browsers

### Domain-Based Routing

- **example.com** → username: `example` → D1: `SELECT * FROM images WHERE username = 'example'`
- **photos.jane-doe.com** → username: `jane-doe` → D1: `SELECT * FROM images WHERE username = 'jane-doe'`
- **admin.example.com/admin/api/images** → Authenticated upload → Cloudflare Images + D1 insert

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
- **Adding users**: Create Cloudflare Access service token, edit `config/app.jsonc` with domain and authorized client IDs, then run `pnpm deploy`
- **Adding admin endpoints**: Place under `/admin/*` path to use centralized authentication, access user info via `locals.adminAuth`, use shared utilities from `src/lib/admin-utils.ts` for validation and error handling
- **Authentication changes**: Modify `src/lib/auth.ts` and ensure all tests in `src/lib/auth.test.ts` pass
- **Authorization changes**: Update user's `authorized_client_ids` in `config/app.jsonc`, then run `pnpm deploy`
- **Configuration changes**: Edit `config/app.jsonc` (never edit auto-generated files)
- **Build script changes**: Modify files in `scripts/`, test with `pnpm config:build`
- **Upload endpoint changes**: Modify `src/routes/admin/api/images/+server.ts`, ensure tests pass
- **Lookup endpoint changes**: Modify `src/routes/admin/api/images/by-name/[photoName]/+server.ts`, ensure tests pass
- **Delete endpoint changes**: Modify `src/routes/admin/api/images/[imageId]/+server.ts`, ensure tests pass

**Platform considerations:**

- **Cloudflare Workers runtime**: Always consider that this app runs in Cloudflare Workers - don't write or suggest code that isn't optimal for that platform
- **Cloudflare ecosystem**: Remember that other Cloudflare products that work with Cloudflare Workers are available to suggest if it makes the most sense
