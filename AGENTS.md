# AGENTS.md: Repository Guidelines and Information

This file provides guidance to AI assistants when working with code in this repository.

**[README.md](README.md) is canonical for operating Photochron** — setup, commands, deployment, backups, KV configuration, the admin API contract, and user management. This file covers changing it: conventions, where code lives, and implementation details that have no place in user-facing docs.

## Documentation

The two files divide by audience, and their content must not overlap:

- `README.md` — how to **operate** the app
- `AGENTS.md` — how to **change** the app

When asked to "update docs", update whichever file owns the topic rather than both. If something needs saying here that the README already covers, link to its section instead of restating it.

## Coding Standards

### Style & Formatting

- Use Prettier with 2-space indent and single quotes (enforced via `pnpm lint` and `pnpm format`)
- Use ESLint configuration from `eslint.config.js`
- Always run `pnpm check` and `pnpm lint` before committing changes (see README → Development Commands for the full list)

### Naming Conventions

- **Svelte components**: PascalCase (e.g., `InfiniteScroll.svelte`)
- **Helper functions**: camelCase (e.g., `getUsernameFromDomain()`)
- **KV keys**: Use existing prefixes `domain:hostname`, `user:username`, `global`
- **TypeScript**: Use throughout `.ts` and `.svelte` files; export shared utilities via `src/lib/index.ts`

### Testing

- Write Vitest tests next to source files as `*.test.ts`
- Use `describe/it` structure for test organization
- Test both happy paths and error cases, especially for domain routing, auth, and config helpers
- Mock Cloudflare bindings using helpers in `vitest-setup-client.ts`
- New handlers should have request/response coverage before committing

### Security

- Never commit `.dev.vars` or credentials to git
- Store secrets only in `.dev.vars` (local) and Cloudflare environment variables (production)
- Never hard-code tokens in source files

## Project Structure

- `src/` - SvelteKit application (routes as `+server.ts`, components and utilities in `lib/`)
- `config/` - JSONC deployment configuration (`app.jsonc` is source of truth, gitignored)
- `scripts/` - Config automation tools (build and deployment scripts)
- `migrations/` - Cloudflare D1 schema files (run via Wrangler)
- `static/` - Public assets and favicon fallbacks
- `.dev.vars` - Local development secrets (gitignored)

## Key Components

- **Layout Server Load** (`src/routes/+layout.server.ts`) - Looks up username from domain mapping in KV, loads user config from KV, fetches images from D1
- **Page Server Load** (`src/routes/+page.server.ts`) - Passes images data from parent layout
- **Main Gallery** (`src/routes/+page.svelte`) - Displays images with user info and infinite scroll
- **Upload Endpoint** (`src/routes/admin/api/images/+server.ts`) - Validates, uploads to Cloudflare Images, inserts to D1
- **Lookup Endpoint** (`src/routes/admin/api/images/by-name/[photoName]/+server.ts`) - Finds image ID by photo name, case-insensitive
- **Delete Endpoint** (`src/routes/admin/api/images/[imageId]/+server.ts`) - Verifies ownership, deletes from D1 and Cloudflare Images
- **Images API** (`src/routes/api/images/+server.ts`) - Paginated images from D1 for infinite scroll
- **InfiniteScroll Component** (`src/lib/InfiniteScroll.svelte`) - Reusable component using IntersectionObserver API
- **Config Module** (`src/lib/config.ts`) - Domain-to-username lookup, KV config fetching, and TypeScript interfaces
- **Admin Utils Module** (`src/lib/admin-utils.ts`) - Shared validation and error handling for admin endpoints
- **Hooks Server** (`src/hooks.server.ts`) - Admin authentication with domain lookup; intercepts favicon requests
- **Auth Module** (`src/lib/auth.ts`) - Authentication and authorization functions
- **Types** (`src/app.d.ts`) - Type definitions for `event.locals.adminAuth`

## Implementation Notes

### Configuration Pipeline

`config/app.jsonc` → `scripts/build-config.ts` → `build-wrangler.ts` + `build-kv.ts` → `wrangler.jsonc` and `config/app.kv.json` → `deploy-kv.ts` uploads to KV.

- **`wrangler.jsonc` is generated** — never edit it directly. Its `routes` are derived from each user's `domains` array as `custom_domain` entries, merged over `wrangler.jsonc.example`.
- **KV uploads do not prune.** Keys for users or domains removed from `app.jsonc` persist in KV until deleted manually, and a stale `user:*` key still resolves if a route reaches it.
- `config/app.jsonc` and the generated files are gitignored; CI reconstructs `app.jsonc` from the `APP_JSONC` secret.

### Authentication Flow

All `/admin/*` routes pass through `handleAdminAuth` in `src/hooks.server.ts`:

1. Determine username via domain lookup in KV (`domain:HOSTNAME` → username)
2. Extract identity from Cloudflare Access headers (`Cf-Access-Client-Id` or `Cf-Access-Jwt-Assertion`)
3. Validate JWT claims (expiration, issuer) for defense-in-depth
4. Check the client ID against the user's `authorized_client_ids` in KV
5. Set `event.locals.adminAuth` with username and identity for downstream handlers

Only service tokens are supported (client ID from the `common_name` JWT claim or header).

The Cloudflare Access policy is the edge boundary but admits every listed service token on every listed domain. **Per-user isolation comes from step 4** — the KV check is what prevents one user's token from managing another user's photos.

**Local development bypass:** active only when `CF_ACCESS_TEAM_DOMAIN=dev` (from `.dev.vars`), where `DEV_CLIENT_ID` authorizes without a KV lookup. Production sets a real team domain, so the bypass cannot trigger there.

### D1 Queries

Table `images` (id, username, name, caption, captured, uploaded, created_at) with two indexes:

- `idx_username_captured` — gallery queries by username and captured date
- `idx_username_name_uploaded` — lookup-by-name, using `COLLATE NOCASE` for case-insensitive matching

```sql
-- Gallery, first page
SELECT * FROM images WHERE username = ? ORDER BY captured DESC, id DESC LIMIT ?;

-- Gallery, next page (keyset pagination)
SELECT * FROM images WHERE username = ?
  AND (captured < ? OR (captured = ? AND id < ?))
  ORDER BY captured DESC, id DESC LIMIT ?;

-- Lookup by name
SELECT id, name, captured, uploaded FROM images
  WHERE username = ? AND name = ? COLLATE NOCASE
  ORDER BY uploaded DESC LIMIT 1;
```

The client passes the last image's `captured` and `id` as the cursor, so the index seeks directly instead of skipping rows with `OFFSET`. Preserve this when changing pagination.

### Dynamic Favicons

`src/hooks.server.ts` intercepts `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`, and `/apple-touch-icon.png`, loads the user's avatar ID from KV, and issues a 302 to the corresponding Cloudflare Images variant (`favicon16`, `favicon32`, `apple180`) with a 1-hour cache header. If the KV fetch fails it falls back to the `fallback-*` files in `/static/`.

Variants are account-level in Cloudflare Images, so they apply to every avatar automatically — there is no per-user variant setup.

## Technology Stack

- SvelteKit 2.x with TypeScript and Svelte 5
- Tailwind CSS 4.x with Vite plugin
- Vitest for unit testing
- Cloudflare Workers deployment target with adapter-cloudflare

## Platform Considerations

- This app runs on Cloudflare Workers - always write and suggest code optimized for this platform
- Consider other Cloudflare products (R2, Durable Objects, Queues, etc.) when they make sense for the solution
