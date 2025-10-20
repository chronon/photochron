# Photochron

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos using Cloudflare KV for configuration and Cloudflare D1 for image metadata.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **KV-based configuration** - All user config (CDN, avatars) stored in Cloudflare KV
- **D1 database** - Image metadata stored in Cloudflare D1 for fast querying
- **Photo upload** - Upload photos via authenticated API endpoint at `domain.com/admin/api/images`
- **Photo deletion** - Delete photos via authenticated API endpoint at `domain.com/admin/api/images/{imageId}`
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery and storage
- **Cloudflare Access** - Service token authentication for secure uploads

## How It Works

The application extracts the username from the domain name, loads configuration from Cloudflare KV, and fetches images from D1:

1. **Domain** → **Username** → **KV Config** → **D1 Images**
2. **example.com** → `example` → KV: `user:example` → D1: `SELECT * FROM images WHERE username = 'example'`
3. **jane.com/admin/api/images** → Authenticated upload → Cloudflare Images + D1 insert

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
- Add your users with their domains, avatars, and authorized client IDs

Edit `.dev.vars` with your local development secrets

### 3. Set up Database

Create and migrate your D1 database:

```bash
# Create D1 database
pnpm wrangler d1 create photochron

# Run migrations
pnpm wrangler d1 migrations apply photochron --local  # For local dev
pnpm wrangler d1 migrations apply photochron          # For production
```

### 4. Development

```bash
pnpm dev  # http://localhost:5173
```

### 5. Deploy

```bash
pnpm run deploy
```

## Configuration

### KV Storage Structure

Configuration is stored in Cloudflare KV with these keys:

- **`global`**: Global config (image CDN settings)
- **`user:USERNAME`**: Per-user config (domain, avatar, authorized client IDs)

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

Response: `{ success: true, id, message }`

## Admin Authentication

All `/admin/*` routes use two-layer security: Cloudflare Access validates credentials at the edge, then SvelteKit hooks verify JWT claims and check client IDs against authorized lists in KV.

### Setup

1. **Configure Cloudflare Access:** Create application for `/admin` path in Cloudflare Zero Trust dashboard
2. **Create Service Token:** Generate token in Access → Service Auth → Service Tokens
3. **Add to config:** Update `config/app.jsonc` with team domain and authorized client IDs
4. **Deploy:** Run `pnpm run deploy`

### Local Development

Copy `.dev.vars.example` to `.dev.vars` and fill in your values. When `CF_ACCESS_TEAM_DOMAIN=dev`, authentication is bypassed. This only activates locally (`.dev.vars` is not deployed).

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

- Extract username from domain → Fetch config from KV → Query D1 for images
- Admin routes validate via Cloudflare Access at edge → Check authorization in KV → Process operation

## User Management

### Adding a User

1. **Set up Cloudflare Access** (one-time): Configure Access application for `/admin` path if not already done
2. **Create Service Token**: Generate Cloudflare Access service token for upload authentication
3. **Edit `config/app.jsonc`**: Add user entry with domain, avatar, and authorized client IDs (include service token client ID)
4. **Deploy**: Run `pnpm run deploy` to generate config, upload to KV, and deploy
5. **Create favicon variants** (optional): Add `favicon16` (16x16), `favicon32` (32x32), `apple180` (180x180) variants for the user's avatar in Cloudflare Images. Falls back to static files if not present.
6. **Configure upload client**: Provide user with service token credentials and upload endpoint URL

### Updating a User

1. **Edit `config/app.jsonc`**: Update user properties
2. **Deploy**: Run `pnpm run deploy` to regenerate and sync changes to KV
3. Changes take effect immediately after deployment

## License

MIT License - see LICENSE file for details.
