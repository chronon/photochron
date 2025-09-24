# Chrononagram Web - Copilot Instructions

## Repository Overview

**Chrononagram Web** is a multi-user, domain-based photo gallery application built with SvelteKit 2.x and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos based on dynamic API configuration using convention-over-configuration principles.

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
pnpm test:unit              # Vitest unit tests (~1s)
pnpm test:e2e               # Playwright e2e tests (requires: pnpm exec playwright install)
pnpm test                   # Run all tests

# Deployment
pnpm deploy                 # Build and deploy to Cloudflare Workers
pnpm deploy:preview         # Dry run deployment
```

### Environment Setup

**Required**: Copy `.env-example` to `.env` and configure:

```bash
# MUST be set for development
PUBLIC_API_BASE="https://api.yourdomain.com"     # Your API endpoint
PUBLIC_USER_NAME="test-user"                     # For localhost testing only
```

### Common Issues and Workarounds

1. **ESLint Warning**: Ignore `.eslintignore` deprecation warning - configuration works correctly
2. **pnpm build scripts**: ALWAYS approve all packages when prompted or build will fail
3. **Playwright tests**: Require `pnpm exec playwright install` before first run
4. **Environment variables**: Build fails without proper `.env` file
5. **E2E tests timeout**: Normal when API endpoint is unreachable

## Project Architecture and Layout

### Technology Stack

- **SvelteKit 2.x** with TypeScript and Svelte 5
- **Tailwind CSS 4.x** with Vite plugin
- **Vitest** for unit testing
- **Playwright** for e2e testing
- **Cloudflare Workers** deployment with adapter-cloudflare

### Key Directories and Files

#### Configuration Files (Root)

- `package.json` - Scripts and dependencies
- `wrangler.jsonc` - Cloudflare Workers deployment config
- `svelte.config.js` - SvelteKit configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules (flat config format)
- `.prettierrc` - Prettier formatting rules
- `playwright.config.ts` - E2E test configuration

#### Source Structure (`src/`)

```
src/
├── lib/
│   ├── config.ts              # Domain parsing & API response handling
│   ├── apiCache.ts           # API response caching
│   └── InfiniteScroll.svelte # Reusable infinite scroll component
├── routes/
│   ├── +layout.server.ts     # Domain-to-user detection & API config loading
│   ├── +layout.svelte        # Site header with user info
│   ├── +layout.ts            # Client-side layout configuration
│   ├── +page.server.ts       # Image data passing with validation
│   └── +page.svelte          # Main photo gallery with infinite scroll
├── hooks.server.ts           # Dynamic favicon handling (intercepts favicon requests)
├── app.html                  # HTML template with favicon links
└── app.css                   # Global styles
```

#### Static Assets (`static/`)

- `fallback-*.png` - Fallback favicons when API fails
- `loading.gif` - Loading animation

#### Test Structure

- `src/index.test.ts` - Unit test example (Vitest)
- `e2e/home.test.ts` - E2E test (Playwright)

### API Integration Pattern

The application fetches configuration from: `${PUBLIC_API_BASE}/data/${username}/content.json`

Expected API response structure:

```json
{
  "user": { "name": "username", "avatar": { "id": "image-id", "variant": "default" } },
  "config": { "imageBase": "https://cdn.domain", "imageVariant": "default" },
  "images": [...]
}
```

### Domain-Based Routing

- **example.com** → username: `example` → API: `/data/example/content.json`
- **photos.jane-doe.com** → username: `jane-doe` → API: `/data/jane-doe/content.json`

### Dynamic Favicon System

SvelteKit hooks (`src/hooks.server.ts`) intercept favicon requests and redirect to user-specific Cloudflare Images variants (`favicon16`, `favicon32`, `apple180`).

## Continuous Integration

### GitHub Actions (`.github/workflows/ci.yml`)

- **Triggers**: All branches except `main`
- **Environment**: Uses Playwright container with Node.js 22.x
- **Steps**: Install pnpm → Install deps → Type check
- **Note**: Tests are currently commented out in CI

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
2. **Environment variables are required** - App will not build without `.env`
3. **Type checking is strict** - All TypeScript errors must be resolved
4. **Formatting is enforced** - Code must pass Prettier checks
5. **E2E tests build the app** - They run `pnpm build && pnpm preview` first

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
- **Configuration**: Modify files in project root, always test build process
