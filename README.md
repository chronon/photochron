# Chrononagram Web

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos using Cloudflare KV for configuration storage.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **KV-based configuration** - All user config (CDN, avatars) stored in Cloudflare KV
- **Dynamic content** - Images fetched from API per user
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery
- **Zero secrets** - No environment variables or API keys needed

## How It Works

The application extracts the username from the domain name, loads configuration from Cloudflare KV, and fetches images from your API:

1. **Domain** → **Username** → **KV Config** → **API Images**
2. **example.com** → `example` → KV: `user:example` → API: `/data/example/content.json`
3. **admin.jane.com** → `jane` → KV: `user:jane` → API: `/data/jane/content.json`

**Configuration** (CDN URLs, avatars) is stored in KV at deployment time.
**Content** (images) is fetched from API at runtime.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/chronon/chrononagram-web.git
cd chrononagram-web
pnpm install
```

### 2. Configure Your Deployment

Copy the example configuration and customize it:

```bash
cp config/app-example.json config/app.json
```

Edit `config/app.json` with your settings:

- Update `global.apiBase` with your API endpoint
- Update `global.imageBase` with your Cloudflare Images delivery URL
- Update `wrangler.kv_namespaces[0].id` with your KV namespace ID
- Add your users with their domains and avatar IDs

### 3. Development

```bash
pnpm dev  # http://localhost:5173
```

### 4. Deploy

```bash
pnpm deploy
```

This will:

1. Generate KV data from `config/app.json`
2. Upload configuration to Cloudflare KV
3. Generate `wrangler.jsonc` with routes
4. Build and deploy to Cloudflare Workers

## Adding New Users

1. **Edit `config/app.json`**: Add new user to the `users` object
2. **Deploy**: Run `pnpm deploy` to upload config and deploy
3. **Done!** - The new domain will automatically work

## Configuration

### KV Storage Structure

Configuration is stored in Cloudflare KV with these keys:

- **`global`**: Global config (API base, image CDN settings)
- **`user:USERNAME`**: Per-user config (domain, name, avatar)

These are automatically generated from `config/app.json` during deployment.

### API Requirements

Your API must return images at: `https://api.yourdomain.com/data/USERNAME/content.json`

**Expected API Response:**

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

**API Response Fields:**

- **`images[]`**: Array of image objects
- **`id`**: Cloudflare Images ID or CDN identifier
- **`name`**: Original filename or display name
- **`caption`**: Optional caption text
- **`taken`**: ISO date string when photo was taken
- **`uploaded`**: ISO date string when photo was uploaded

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
pnpm test                   # Run all tests
pnpm test:unit              # Run unit tests
pnpm test:e2e               # Run end-to-end tests

# Deployment
pnpm deploy                 # Build and deploy to Cloudflare
```

## Architecture

### File Structure

```
src/
├── lib/
│   ├── config.ts           # Domain-to-user configuration logic
│   └── InfiniteScroll.svelte # Reusable infinite scroll component
├── routes/
│   ├── +layout.server.ts   # API data fetching and config extraction
│   ├── +layout.svelte      # Site header with user info
│   ├── +page.server.ts     # Image data passing with validation
│   └── +page.svelte        # Main photo gallery
├── hooks.server.ts         # Dynamic favicon handling
└── app.html                # HTML template with favicon links
```

### Key Components

- **Domain Extraction** (`src/lib/config.ts`): Parses hostname to determine user
- **KV Configuration** (`src/lib/config.ts`): Fetches global and user config from Cloudflare KV
- **API Integration**: Single API call fetches only image data
- **Dynamic Favicons** (`src/hooks.server.ts`): User-specific favicon redirects using KV config
- **Server-Side Loading**: Fetches user-specific data based on request domain
- **Infinite Scroll**: Lazy loads images with IntersectionObserver

### Configuration Flow

1. **Request arrives** with domain (e.g., `example.com`)
2. **Extract username** from domain (`example`)
3. **Fetch KV config** (`global` + `user:example`)
4. **Build API URL** from KV config
5. **Fetch images** from API
6. **Render page** with KV config + API images

## Deployment

### Cloudflare Workers

The application deploys as a single Cloudflare Worker with:

- **Cloudflare KV**: Stores all configuration (no secrets)
- **No environment variables**: Everything in KV
- **Auto-generated routes**: Based on `config/app.json`

The `pnpm deploy` command handles KV upload and wrangler config generation.

## User Management

### Adding a User

1. **Edit `config/app.json`**: Add user entry with domain, name, and avatar
2. **Create API endpoint**: Ensure `/data/USERNAME/content.json` returns images array
3. **Deploy**: Run `pnpm deploy` to upload config to KV and deploy
4. **Create favicon variants** (optional): Add `favicon16`, `favicon32`, `apple180` variants for the user's avatar in Cloudflare Images
5. **Done!** - No code changes needed

### Updating a User

1. **Edit `config/app.json`**: Update user properties
2. **Deploy**: Run `pnpm deploy` to sync changes to KV
3. Changes take effect immediately

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
