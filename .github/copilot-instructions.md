# Copilot Instructions for silklag.com

## Repository Overview

This is **chrononagram-web**, a SvelteKit application that displays images in an Instagram-like interface with infinite scroll functionality. The app fetches images from an external JSON API and displays them using Cloudflare Images CDN. It's deployed on Cloudflare Pages.

**Repository Size:** Small-medium (~10 source files, 292 npm dependencies)  
**Primary Languages:** TypeScript (95%), Svelte, CSS  
**Target Runtime:** Cloudflare Pages/Workers

## Technology Stack

- **Framework:** SvelteKit with TypeScript
- **Styling:** Tailwind CSS v4 (using new @tailwindcss/vite plugin)
- **Package Manager:** PNPM (required, version 10+)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Deployment:** Cloudflare Pages via Wrangler
- **Node Version:** 22.x (as specified in CI)

## Build & Development Commands

**CRITICAL: Always run commands in the exact order specified below.**

### Initial Setup

```bash
# REQUIRED: Install pnpm globally if not available
npm install -g pnpm

# REQUIRED: Install dependencies (takes ~20 seconds, installs 292 packages)
pnpm install

# REQUIRED: Copy environment variables for local development
cp .env-example .env
```

### Development Workflow

```bash
# Start development server (requires environment setup first)
pnpm dev

# Build for production (takes ~5 seconds)
pnpm build

# Preview production build locally (requires build first)
pnpm preview
```

### Validation Commands (Run before committing)

```bash
# Type checking (ALWAYS run this first)
pnpm check

# Linting and formatting (run after check)
pnpm lint

# Format code
pnpm format

# Unit tests (fast, using Vitest)
pnpm test:unit

# E2E tests (requires browser installation first - see below)
pnpm test:e2e

# Run all tests
pnpm test
```

### E2E Testing Setup

**WARNING:** E2E tests will fail on first run. Required setup:

```bash
# MUST run this before first e2e test execution
pnpm exec playwright install

# Then run e2e tests
pnpm test:e2e
```

### Known Issues & Workarounds

1. **ESLint Warning:** `.eslintignore` is deprecated but still works. Warning is expected.
2. **PNPM Build Scripts:** Some dependencies show "ignored build scripts" warning - this is intentional.
3. **E2E Test Port:** Tests automatically build and serve on port 4173 via playwright.config.ts.

### Deployment

```bash
# Deploy to Cloudflare Pages
pnpm deploy

# Dry run deployment
pnpm deploy:preview
```

## Project Architecture

### Core Components

- **`src/routes/+page.server.ts`** - Server-side image data loading from external JSON API
- **`src/routes/+page.svelte`** - Main gallery component with infinite scroll logic
- **`src/lib/InfiniteScroll.svelte`** - Reusable component using IntersectionObserver API
- **`src/routes/+layout.svelte`** - App layout with header and user info

### Configuration Files

- **`wrangler.jsonc`** - Cloudflare Pages deployment configuration
- **`svelte.config.js`** - SvelteKit config with Cloudflare adapter
- **`vite.config.ts`** - Vite config with SvelteKit and Tailwind plugins
- **`eslint.config.js`** - Modern flat config format (ignores .eslintignore deprecation)
- **`playwright.config.ts`** - E2E test config (builds and serves on port 4173)
- **`tsconfig.json`** - Extends SvelteKit's generated TypeScript config

### Environment Variables

Required environment variables (defined in `.env-example`):

- `PUBLIC_IMG_BASE` - Cloudflare Images CDN base URL
- `PUBLIC_IMG_SOURCE` - External JSON API endpoint for image data
- `PUBLIC_IMG_VARIANT` - Image variant name for CDN
- `PUBLIC_USER_AVATAR` - User avatar URL
- `PUBLIC_USER_NAME` - Display name

### File Structure

```
/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte       # App layout
│   │   ├── +layout.ts           # Layout load function
│   │   ├── +page.server.ts      # Server-side data loading
│   │   └── +page.svelte         # Main gallery page
│   ├── lib/
│   │   ├── InfiniteScroll.svelte # Reusable scroll component
│   │   └── index.ts             # Library exports
│   ├── app.html                 # HTML template
│   ├── app.css                  # Tailwind import
│   └── index.test.ts            # Sample unit test
├── e2e/
│   └── home.test.ts             # Playwright e2e tests
├── static/                      # Static assets (favicons, loading.gif)
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
└── [config files]
```

## CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

- Triggers on all branches except `main`
- Uses Node.js 22.x in Playwright container
- Environment variables configured for CI
- Currently runs: `pnpm install` → `pnpm check`
- **Note:** Tests are commented out in CI (line 47-48)

## Validation Steps

Before any code changes:

1. **Always run `pnpm check`** - catches TypeScript errors
2. **Run `pnpm lint`** - ensures code formatting consistency
3. **Run `pnpm test:unit`** - validates logic changes
4. **Run `pnpm build`** - ensures production build works

For UI changes:

1. Test with `pnpm dev` locally
2. Run `pnpm test:e2e` if browser interactions affected
3. Verify responsive design (Tailwind CSS classes)

## Dependencies & Constraints

- **PNPM Required:** Project uses PNPM-specific features, npm/yarn will not work
- **Node 22.x:** Match CI environment for consistency
- **Environment Variables:** App will not function without proper `.env` setup
- **Cloudflare Compatibility:** Code must be compatible with Cloudflare Workers runtime

## Key Implementation Notes

- **Infinite Scroll:** Uses modern IntersectionObserver API, not scroll events
- **Image Loading:** Lazy loading with Cloudflare Images optimization
- **State Management:** Uses Svelte 5 runes (`$state`, `$props`)
- **Server-Side Rendering:** Image data fetched server-side for SEO
- **TypeScript:** Strict mode enabled, all files must pass type checking

## Common Pitfalls

1. **Don't modify** `pnpm-lock.yaml` manually
2. **Don't ignore** TypeScript errors (use `pnpm check` frequently)
3. **Always test** image loading with proper environment variables
4. **Remember** Playwright browser installation for e2e tests
5. **Maintain** Tailwind CSS class consistency for responsive design

---

**Trust these instructions.** Only search/explore if information is incomplete or incorrect. This covers 95% of development scenarios.
