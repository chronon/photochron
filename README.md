# Photochron

An anti-social media photo gallery, featuring NO friends, likes, follows, or shares. Built with SvelteKit and deployed on Cloudflare Workers.

My instance as an example: [silklag.com](https://silklag.com/)

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - Explicit domain-to-username mappings in KV (supports multiple domains per user and arbitrary mappings)
- **KV-based configuration** - All config (global settings, domain mappings, user config) stored in Cloudflare KV
- **D1 database** - Image metadata stored in Cloudflare D1 for fast querying
- **Photo upload** - Upload photos via authenticated API endpoint at `/admin/api/images`
- **Photo deletion** - Delete photos via authenticated API endpoint at `/admin/api/images/{imageId}`
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery and storage
- **Cloudflare Access** - Service token authentication for secure uploads

## How It Works

The application looks up the username from the domain via KV, loads user configuration, and fetches images from D1:

1. **Domain** → **KV Lookup** → **Username** → **User Config** → **D1 Images**
2. **example.com** → KV: `domain:example.com` → `"alice"` → KV: `user:alice` → D1: `SELECT * FROM images WHERE username = 'alice'`
3. **example.com/admin/api/images** → Domain lookup → Authenticated upload → Cloudflare Images + D1 insert

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/chronon/photochron.git
cd photochron
pnpm install
```

### 2. Configure Your Deployment

Copy the example files and customize them:

```bash
cp config/app-example.json config/app.jsonc
cp .dev.vars.example .dev.vars
```

Edit `config/app.jsonc` with your settings:

- Update Cloudflare resource IDs (KV namespace, D1 database, Images delivery URL)
- Add your users with their domains array (one or more domains per user), avatars, and authorized client IDs

Edit `.dev.vars` with your local development secrets

### 3. Enable Cloudflare Images Flexible Variants

**Required:** Enable "Flexible variants" in your Cloudflare Images settings to allow responsive image delivery with dynamic URL parameters.

Also create three named variants for the dynamic favicon system — `favicon16` (16x16), `favicon32` (32x32), and `apple180` (180x180), all PNG. Variants are account-level, so this is a one-time setup that applies to every user's avatar. Without them, favicons fall back to the static files in `/static/`.

### 4. Set up Database

Create and migrate your D1 database:

```bash
# Create D1 database
pnpm wrangler d1 create photochron

# Run migrations
pnpm wrangler d1 migrations apply photochron --local  # For local dev
pnpm wrangler d1 migrations apply photochron          # For production
```

### 5. Development

```bash
pnpm dev  # http://localhost:5173
```

### 6. Deploy

Deploy from your machine:

```bash
pnpm run deploy
```

Wrangler handles authentication. On an interactive machine this uses `wrangler login` (OAuth in a browser). For headless environments (CI, or a VM without a browser), set a scoped API token instead — Wrangler picks it up automatically, no OAuth prompt:

```bash
export CLOUDFLARE_API_TOKEN="<token>"   # scopes: Workers Scripts: Edit, Workers KV Storage: Edit
```

#### Automated deploys (GitHub Actions)

Pushes to `main` deploy automatically via `.github/workflows/ci-deploy.yml` (also runnable on demand from the Actions tab). Because `config/app.jsonc` is gitignored, it is injected from a repository secret at deploy time. Configure two secrets once:

```bash
gh secret set CLOUDFLARE_API_TOKEN          # scoped token (Workers Scripts + KV Storage: Edit)
gh secret set APP_JSONC < config/app.jsonc  # your app config, kept out of git
```

The workflow writes `APP_JSONC` to `config/app.jsonc`, then runs `pnpm run deploy`. Whenever you change `config/app.jsonc`, re-run the `APP_JSONC` command so the secret stays in sync.

## Backups

D1's built-in [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) provides point-in-time recovery for the last 30 days, which covers most operational mistakes. For protection against longer-horizon issues (corruption discovered late, an accidentally deleted database, or lost account access), `.github/workflows/backup-d1.yml` exports the database to a SQL dump on a daily schedule (and on demand from the Actions tab).

Each run stores the dump as a **GitHub artifact** (off-Cloudflare, 90-day retention) and, optionally, in an **R2 bucket** for long retention. The workflow is generic — configure it per deployment via repository variables and secrets (Settings → Secrets and variables → Actions):

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID   # target account id
gh variable set D1_DATABASE_NAME        # e.g. photochron
gh variable set BACKUP_R2_BUCKET        # optional; R2 step is skipped if unset
```

The backup workflow uses its own secret, `BACKUP_CLOUDFLARE_API_TOKEN`, kept separate from the deploy token so backups and deploys have isolated scopes. Create a dedicated token scoped to **D1 (edit)** and, if using R2, **Workers R2 Storage (edit)**. Note `d1 export` creates an export job (a write operation), so it requires **Edit**, not just Read:

```bash
gh secret set BACKUP_CLOUDFLARE_API_TOKEN   # scopes: D1 (edit) + Workers R2 Storage (edit)
```

Create the R2 bucket once with `pnpm wrangler r2 bucket create <your-bucket>`.

> **Note:** Backups cover image _metadata_ only. The photos themselves live in Cloudflare Images; if that's your sole copy of the originals, back them up separately.

### Restoring from a dump

Download a dump (from the workflow run's artifacts, or `pnpm wrangler r2 object get <bucket>/<file> --file=backup.sql`), then apply it:

```bash
pnpm wrangler d1 execute <database> --remote --file=backup.sql
```

Test a restore against a scratch database periodically so you know the dump imports cleanly.

## Configuration

### KV Storage Structure

Configuration is stored in Cloudflare KV with these keys:

- **`global`**: Global config (image CDN settings)
- **`domain:HOSTNAME`**: Domain-to-username mapping (e.g., `domain:example.com` → `"alice"`)
- **`user:USERNAME`**: Per-user config (domains array, avatar, authorized client IDs)

These are automatically generated from `config/app.jsonc` during deployment via build scripts.

### D1 Database Schema

Image metadata is stored in Cloudflare D1. See `migrations/` for the complete schema including tables and indexes.

### Admin API

All admin endpoints use Cloudflare Access authentication with service tokens:

```
Headers:
  CF-Access-Client-Id: your-service-token-client-id
  CF-Access-Client-Secret: your-service-token-client-secret
```

**Upload** - `POST /admin/api/images`

Upload a photo with metadata. Requires `Content-Type: multipart/form-data`.

Request body: `file` (image file), `metadata` (JSON with name, caption, captured date)

Response: `{ success: true, id, filename, uploaded }`

**Lookup** - `GET /admin/api/images/by-name/{photoName}`

Find image ID by photo name (case-insensitive). Returns most recent if multiple matches exist.

Response: `{ success: true, id, name, captured, uploaded }`

**Delete** - `DELETE /admin/api/images/{imageId}`

Delete a photo. Verifies ownership before deletion.

Response: `{ success: true, id, message, warning? }` — `warning` is present when the D1 row was removed but the Cloudflare Images delete did not succeed.

All endpoints return errors as `{ success: false, error: string }`.

## Clients

There is no admin interface, just API endpoints for add, find, and delete. For Apple devices these two shortcuts make adding and deleting photos from share sheets fast and seamless.

- Add: https://www.icloud.com/shortcuts/d44f9cce647f4acd837f346fddeefe2f
- Delete: https://www.icloud.com/shortcuts/ad0dc21dbab84deebbba42fe72507453

## Admin Authentication

All `/admin/*` routes use two-layer security: Cloudflare Access validates credentials at the edge, then SvelteKit hooks verify JWT claims and check client IDs against authorized lists in KV.

### Local Development

Copy `.dev.vars.example` to `.dev.vars` and fill in your values: `CF_IMAGES_TOKEN` (Cloudflare Images API token), `CF_ACCESS_TEAM_DOMAIN` (Access team domain), `DEV_USER` (username served on localhost), and `DEV_CLIENT_ID` (local authorization bypass).

When `CF_ACCESS_TEAM_DOMAIN=dev`, authentication is bypassed. This only activates locally (`.dev.vars` is not deployed).

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Quality Assurance
pnpm check                  # Type check with svelte-check
pnpm check:all              # Run all checks (check + lint + test)
pnpm lint                   # Check formatting and linting
pnpm format                 # Format code with Prettier

# Testing
pnpm test                   # Run unit tests with Vitest

# Configuration & Deployment
pnpm config:build           # Generate wrangler.jsonc and KV data
pnpm config:deploy          # Build config and upload to KV
pnpm run deploy             # Full deployment (config + build + deploy)
pnpm run deploy:preview     # Preview deployment (dry run)
```

## Architecture

The application uses Cloudflare KV (configuration), D1 (image metadata), Images (photo storage), and Access (authentication).

**Request Flow:**

- Look up username from domain in KV (`domain:*`) → Fetch user config from KV (`user:*`) → Query D1 for images
- Admin routes determine username from domain → Validate via Cloudflare Access at edge → Check authorization in KV → Process operation

## User Management

### Adding a User

1. **Set up Cloudflare Access** (one-time): Configure Access application for `/admin/*` path if not already done
2. **Create service token**: Zero Trust dashboard → Access controls → Service credentials. Copy the Client ID and Client Secret immediately — the secret is shown only once. The duration field defaults to 1 year; set a longer duration to match the other tokens unless you intend to rotate annually.
3. **Add the domain to the Access application**: Add `NEWDOMAIN/admin/*` to the application's self-hosted domains. Without this, the domain's admin routes never pass through Access, and every admin request is rejected.
4. **Add the token to the Access policy**: The policy admits specific service tokens by ID rather than "any Access service token", so a new token is refused until it is added to the policy's include list.
5. **Upload avatar**: Add the user's avatar to Cloudflare Images and note its ID. The `favicon16`, `favicon32`, and `apple180` variants are account-level and apply to every image automatically — no per-user variant setup is needed. Missing variants fall back to the static files in `/static/`.
6. **Edit `config/app.jsonc`**: Add user entry with `domains` array (one or more domains), the avatar ID, and the service token client ID in `authorized_client_ids`
7. **Deploy**: Run `pnpm run deploy` to generate config (including domain mappings), upload to KV, and deploy. If the domain's zone is in the same Cloudflare account, the `custom_domain` route provisions its DNS record automatically.
8. **Update the `APP_JSONC` secret**: Run `gh secret set APP_JSONC < config/app.jsonc`. Since `app.jsonc` is gitignored, the next push to `main` rebuilds KV from this secret — a stale secret silently removes the new user.
9. **Configure upload client**: Provide user with service token credentials and upload endpoint URL

**How the two authorization layers differ:** the Access policy admits every listed service token on every listed domain. Per-user isolation comes from `authorized_client_ids` in KV, enforced by `handleAdminAuth` — that is what stops one user's token from managing another user's photos.

### Updating a User

1. **Edit `config/app.jsonc`**: Update user properties
2. **Deploy**: Run `pnpm run deploy` to regenerate and sync changes to KV
3. Changes take effect immediately after deployment

## License

MIT License - see LICENSE file for details.
