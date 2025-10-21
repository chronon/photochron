# Repository Guidelines

## Project Structure & Module Organization

- `src/` hosts the SvelteKit app; group HTTP handlers under `routes/**/+server.ts` and colocate Svelte components and utilities in `lib/`. Keep related tests alongside sources as `*.test.ts`.
- `config/` contains JSONC deployment inputs; update `app.jsonc` for domain-to-user mappings and Cloudflare resource IDs.
- `scripts/` provides the config automation (`build-config.ts`, `deploy-kv.ts`); `migrations/` stores Cloudflare D1 schema files run via Wrangler.
- `static/` exposes public assets and favicon fallbacks; `docs/` holds extended architecture notes; `.dev.vars.example` documents local secrets.

## Build, Test, and Development Commands

- `pnpm dev` starts the Vite dev server at `http://localhost:5173` using `.dev.vars`.
- `pnpm build` emits the production worker bundle; `pnpm preview` runs Wrangler against the build.
- `pnpm lint`, `pnpm format`, and `pnpm check` enforce Prettier, ESLint, and Svelte type checks.
- `pnpm test` runs Vitest suites; `pnpm check:all` composes lint, type check, and tests for pre-PR validation.
- `pnpm config:build` regenerates `wrangler.jsonc` and KV payloads from `config/app.jsonc`; follow with `pnpm config:deploy` or `pnpm run deploy` when syncing Cloudflare.

## Coding Style & Naming Conventions

- Use Prettier (2-space indent, single quotes) and ESLint (`eslint.config.js`) before committing; avoid manual formatting.
- Prefer TypeScript across `.ts` and `.svelte` files; export shared utilities via `src/lib/index.ts`.
- Name Svelte components in `PascalCase`, helpers in `camelCase`, and Cloudflare KV keys with the existing `domain:hostname` / `user:username` prefixes.
- Keep JSONC config sorted by domain and use descriptive KV metadata keys to ease diff review.

## Testing Guidelines

- Write Vitest suites next to the code under test (`*.test.ts`) using the existing `describe/it` structure.
- Exercise both happy-path and error branches for domain routing, auth, and config helpers; mock Cloudflare bindings via helpers in `vitest-setup-client.ts`.
- Run `pnpm test` locally and ensure new handlers have request + response coverage before opening a PR.

## Commit & Pull Request Guidelines

- Follow the repo’s short, imperative commit style (`Refactor username/domain lookups`); scope commits narrowly.
- Before pushing, run `pnpm check:all` and `pnpm config:build` to confirm generated artifacts stay in sync.
- PRs should describe the feature or fix, note config or migration changes, link any tracking issue, and include screenshots or sample API payloads when altering UX.
- Never commit `.dev.vars` or Cloudflare credentials; coordinate secret rotation through KV and Access service tokens.

## Security & Configuration Tips

- Store environment secrets only in `.dev.vars` locally and Cloudflare Access in production; never hard-code tokens in `src/`.
- When adding domains, update `config/app.jsonc`, rerun `pnpm config:deploy`, and verify KV values via Wrangler before deploying globally.
- Review Access client IDs and D1 migrations for least-privilege access during code review.
