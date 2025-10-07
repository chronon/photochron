# Photochron

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos using Cloudflare KV for configuration and Cloudflare D1 for image metadata.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **KV-based configuration** - All user config (CDN, avatars) stored in Cloudflare KV
- **D1 database** - Image metadata stored in Cloudflare D1 for fast querying
- **Photo upload** - Upload photos via authenticated API endpoint at `admin.domain.com/admin/api/upload`
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery and storage
- **Cloudflare Access** - Service token authentication for secure uploads

## How It Works

The application extracts the username from the domain name, loads configuration from Cloudflare KV, and fetches images from D1:

1. **Domain** → **Username** → **KV Config** → **D1 Images**
2. **example.com** → `example` → KV: `user:example` → D1: `SELECT * FROM images WHERE username = 'example'`
3. **admin.jane.com/admin/api/upload** → Authenticated upload → Cloudflare Images + D1 insert

**Configuration** (CDN URLs, avatars, authorized client IDs) is stored in KV at deployment time.
**Content** (image metadata) is stored in D1 database and queried at runtime.
**Images** (photo files) are stored in and delivered by Cloudflare Images.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/chronon/photochron.git
cd photochron
pnpm install
```

### 2. Configure Your Deployment

Copy the example configuration and customize it:

```bash
cp config/app-example.json config/app.jsonc
cp .dev.vars.example .dev.vars
```

Edit `config/app.jsonc` with your settings (JSONC format supports comments):

- Update `global.imageBase` with your Cloudflare Images delivery URL
- Update `wrangler.kv_namespaces[0].id` with your KV namespace ID
- Update `wrangler.d1_databases[0].database_id` with your D1 database ID
- Add your users with their domains, avatar IDs, and authorized client IDs

Edit `.dev.vars` with local development secrets:

- Set `CF_IMAGES_TOKEN` with your Cloudflare Images API token
- Set `DEV_USER` with your username for localhost development

### 3. Set up Database

Create and migrate your D1 database:

```bash
# Create D1 database
wrangler d1 create photochron

# Run migrations
wrangler d1 migrations apply photochron --local  # For local dev
wrangler d1 migrations apply photochron          # For production
```

### 4. Development

```bash
pnpm dev  # http://localhost:5173
```

### 5. Deploy

```bash
pnpm deploy
```

This will:

1. Run build scripts to transform `config/app.jsonc`
2. Generate `wrangler.jsonc` with routes for all user domains
3. Generate `config/app.kv.json` with KV entries
4. Upload configuration to Cloudflare KV (local and remote)
5. Build SvelteKit application
6. Deploy to Cloudflare Workers

## Adding New Users

1. **Edit `config/app.jsonc`**: Add new user to the `users` object
2. **Deploy**: Run `pnpm deploy` to generate config, upload to KV, and deploy
3. **Done!** - The new domain will automatically work

## Configuration

### KV Storage Structure

Configuration is stored in Cloudflare KV with these keys:

- **`global`**: Global config (image CDN settings)
- **`user:USERNAME`**: Per-user config (domain, avatar, authorized client IDs)

These are automatically generated from `config/app.jsonc` during deployment via build scripts.

### D1 Database Schema

Image metadata is stored in Cloudflare D1:

```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY NOT NULL,     -- Cloudflare Images ID
  username TEXT NOT NULL,           -- Owner username
  name TEXT NOT NULL,               -- Display name (e.g., "IMG_3818")
  caption TEXT,                     -- Optional caption
  captured TEXT NOT NULL,           -- ISO8601 date when photo was captured
  uploaded TEXT NOT NULL,           -- ISO8601 date when uploaded
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_username_uploaded ON images(username, uploaded DESC);
```

### Upload API

Upload photos to your gallery via the authenticated API endpoint:

**Endpoint:** `POST https://admin.example.com/admin/api/upload`

**Authentication:** Cloudflare Access with Service Tokens

**Request:**

```
Headers:
  CF-Access-Client-Id: your-service-token-client-id
  CF-Access-Client-Secret: your-service-token-client-secret
  Content-Type: multipart/form-data

Body (multipart/form-data):
  file: <image file>
  metadata: {"name":"IMG_1234","caption":"Optional caption","captured":"2025-01-15T18:30:00-05:00"}
```

**Response:**

```json
{
  "success": true,
  "id": "cloudflare-images-id",
  "uploaded": "2025-01-15T20:15:00Z"
}
```

The upload endpoint:

1. Validates authentication via Cloudflare Access
2. Checks authorization (client ID must be in user's `authorized_client_ids`)
3. Uploads photo to Cloudflare Images
4. Inserts metadata to D1 database
5. Photo immediately appears in gallery

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Quality Assurance
pnpm check                  # Type check with svelte-check
pnpm lint                   # Check formatting and linting
pnpm format                 # Format code with Prettier

# Testing
pnpm test                   # Run unit tests with Vitest

# Configuration & Deployment
pnpm config:build           # Generate wrangler.jsonc and KV data
pnpm config:deploy          # Build config and upload to KV
pnpm deploy                 # Full deployment (config + build + deploy)
pnpm deploy:preview         # Preview deployment (dry run)
```

## Architecture

### File Structure

```
config/
├── app.jsonc               # Source configuration (JSONC with comments)
├── app-example.json        # Example configuration template
├── app.kv.json             # Auto-generated KV data for upload
migrations/
└── 0001_initial_schema.sql # D1 database schema
scripts/
├── build-config.ts         # Master build script
├── build-wrangler.ts       # Generates wrangler.jsonc
├── build-kv.ts             # Generates app.kv.json
└── deploy-kv.ts            # Uploads KV data to Cloudflare
src/
├── lib/
│   ├── config.ts           # Domain-to-user configuration logic
│   └── InfiniteScroll.svelte # Reusable infinite scroll component
├── routes/
│   ├── admin/api/upload/
│   │   └── +server.ts      # Upload endpoint with Cloudflare Access auth
│   ├── api/images/
│   │   └── +server.ts      # Image data API endpoint (D1 query)
│   ├── +layout.server.ts   # D1 data fetching and config extraction
│   ├── +layout.svelte      # Site header with user info
│   ├── +page.server.ts     # Image data passing with validation
│   └── +page.svelte        # Main photo gallery with infinite scroll
├── hooks.server.ts         # Dynamic favicon handling
└── app.html                # HTML template with favicon links
wrangler.jsonc              # Auto-generated Cloudflare Workers config
.dev.vars                   # Local development secrets (gitignored)
```

### Key Components

- **Domain Extraction** (`src/lib/config.ts`): Parses hostname to determine user
- **KV Configuration** (`src/lib/config.ts`): Fetches global and user config from Cloudflare KV
- **D1 Database**: Stores image metadata with username-indexed queries
- **Upload Endpoint** (`src/routes/admin/api/upload/+server.ts`): Handles authenticated photo uploads
- **Images API** (`src/routes/api/images/+server.ts`): Returns paginated images from D1
- **Dynamic Favicons** (`src/hooks.server.ts`): User-specific favicon redirects using KV config
- **Server-Side Loading**: Fetches user-specific data based on request domain
- **Infinite Scroll**: Lazy loads images with IntersectionObserver

### Configuration Flow

**At Deployment:**

1. **Edit `config/app.jsonc`** with user configuration
2. **Run build scripts** (`scripts/build-*.ts`) to transform config
3. **Generate `wrangler.jsonc`** with routes and KV bindings
4. **Generate `app.kv.json`** with KV entries
5. **Upload to KV** using wrangler CLI

**At Runtime (Gallery):**

1. **Request arrives** with domain (e.g., `example.com`)
2. **Extract username** from domain (`example`)
3. **Fetch KV config** (`global` + `user:example`)
4. **Query D1** for images: `SELECT * FROM images WHERE username = 'example' ORDER BY uploaded DESC`
5. **Render page** with KV config + D1 images

**At Runtime (Upload):**

1. **Request arrives** at `admin.example.com/admin/api/upload`
2. **Cloudflare Access** validates service token at edge
3. **Extract username** from domain (`example`)
4. **Verify authorization** (client ID in `user:example` authorized list)
5. **Upload to Cloudflare Images**
6. **Insert to D1** with metadata
7. **Return success** response

## Deployment

### Cloudflare Workers

The application deploys as a single Cloudflare Worker with:

- **Cloudflare KV**: Stores all configuration (global, user, authorized client IDs)
- **Cloudflare D1**: Stores image metadata with indexed queries
- **Cloudflare Images**: Stores and delivers photo files
- **Cloudflare Access**: Authenticates upload requests with service tokens
- **Environment secrets**: `CF_IMAGES_TOKEN`, `DEV_USER` (via wrangler secrets and .dev.vars)
- **Auto-generated routes**: Based on `config/app.jsonc`, includes both primary domain and `admin.` subdomain per user
- **TypeScript build scripts**: Automated config transformation and KV upload

The `pnpm deploy` command orchestrates the entire process: config generation → KV upload → app build → worker deployment.

## User Management

### Adding a User

1. **Create Cloudflare Access Service Token**: Generate service token for the user's upload authentication
2. **Edit `config/app.jsonc`**: Add user entry with domain, avatar, and authorized client IDs
3. **Deploy**: Run `pnpm deploy` to generate config, upload to KV, and deploy
4. **Create favicon variants** (optional): Add `favicon16`, `favicon32`, `apple180` variants for the user's avatar in Cloudflare Images
5. **Configure upload client**: Provide user with service token credentials and upload endpoint URL
6. **Done!** - No code changes needed; routes are auto-generated, D1 stores their images

### Updating a User

1. **Edit `config/app.jsonc`**: Update user properties
2. **Deploy**: Run `pnpm deploy` to regenerate and sync changes to KV
3. Changes take effect immediately after deployment

### Cloudflare Images Favicon Variants

For dynamic favicons to work, create these variants for each user's avatar image:

- **`favicon16`**: 16x16 pixels, PNG format
- **`favicon32`**: 32x32 pixels, PNG format
- **`apple180`**: 180x180 pixels, PNG format

If variants don't exist, the system falls back to static favicon files.

## Contributing

1. **Install dependencies**: `pnpm install`
2. **Make changes**: Follow existing patterns and conventions
3. **Test locally**: `pnpm dev` and verify functionality
4. **Quality check**: `pnpm check && pnpm lint` must pass
5. **Submit PR**: Include description of changes

## License

MIT License - see LICENSE file for details.
