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

### Development Workflow

- Use `pnpm check` and `pnpm lint` before committing changes
- E2E tests build and preview the app on port 4173 before running

## Architecture

This is a SvelteKit application for displaying images in an Instagram-like interface with infinite scroll.

### Key Components

- **Image Gallery**: Main page loads images from external API and displays them with infinite scroll
- **InfiniteScroll Component**: Reusable component using IntersectionObserver API for lazy loading
- **Server-side Data Loading**: Images fetched server-side from external JSON API

### Environment Configuration

- Uses Cloudflare Pages deployment (configured in wrangler.toml)
- Public environment variables define image CDN, user info, and API endpoints
- Images served from Cloudflare Images CDN with configurable variants

### Technology Stack

- SvelteKit with TypeScript
- Tailwind CSS for styling
- Vitest for unit testing
- Playwright for e2e testing
- Cloudflare Pages deployment target

### File Structure

- `src/routes/+page.server.ts` - Server-side image data loading
- `src/routes/+page.svelte` - Main gallery component
- `src/lib/InfiniteScroll.svelte` - Reusable infinite scroll component
- `wrangler.toml` - Cloudflare deployment and environment configuration
