# Chrononagram Web

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos and configuration based on convention-over-configuration principles.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **Dynamic configuration** - All user config (CDN, avatars, images) comes from API
- **Infinite scroll** - Smooth loading of photo galleries
- **Dynamic favicons** - User-specific favicons and touch icons per domain
- **Cloudflare Images integration** - Optimized image delivery
- **Zero configuration** - Add new users by just adding their domain

## How It Works

The application extracts the username from the domain name and fetches all configuration dynamically from your API:

- **example.com** → username: `example` → API: `/data/example/content.json`
- **photos.jane-doe.com** → username: `jane-doe` → API: `/data/jane-doe/content.json`
- **admin.mysite.com** → username: `mysite` → API: `/data/mysite/content.json`

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/chronon/chrononagram-web.git
cd chrononagram-web
pnpm install
```

### 2. Configure Environment

Copy `.env-example` to `.env` and update:

```bash
# API configuration - your API endpoint base URL
PUBLIC_API_BASE="https://api.yourdomain.com"

# Development configuration (for localhost testing only)
PUBLIC_USER_NAME="your-username"
```

### 3. Configure Deployment

Copy `wrangler.jsonc.example` to `wrangler.jsonc` and update with your domains and API configuration:

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

Edit `wrangler.jsonc` to include your custom domains and environment variables:

```jsonc
{
	"routes": [
		{
			"pattern": "yourdomain.com",
			"custom_domain": true
		},
		{
			"pattern": "admin.yourdomain.com",
			"custom_domain": true
		}
	],
	"vars": {
		"PUBLIC_API_BASE": "https://api.yourdomain.com"
	}
}
```

### 4. Development

```bash
pnpm dev  # http://localhost:5173
```

### 5. Deploy

```bash
pnpm build
pnpm deploy
```

## Domain Setup

### Add New Domains

1. **Edit `wrangler.jsonc`**: Add your domain to the routes array (see setup section for config format)
2. **Deploy**: Run `pnpm deploy` to apply changes

That's it! The new domain will automatically work.

## API Requirements

Each user needs their data available at:

```
https://api.yourdomain.com/data/USERNAME/content.json
```

### Expected API Response Structure

Your API must return this exact JSON structure:

```json
{
	"user": {
		"name": "example",
		"avatar": {
			"id": "example-avatar-image-id",
			"variant": "default"
		}
	},
	"config": {
		"imageBase": "https://imagedelivery.net/YOUR-ACCOUNT-HASH",
		"imageVariant": "default"
	},
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

### API Response Fields

- **`user.name`**: Display name for the user
- **`user.avatar.id`**: Cloudflare Images ID for user's avatar (also used for favicons)
- **`user.avatar.variant`**: Image variant for avatar (e.g., "default")
- **`config.imageBase`**: Base URL for your CDN (e.g., Cloudflare Images delivery URL)
- **`config.imageVariant`**: Default variant for gallery images
- **`images[]`**: Array of image objects with id, name, optional caption, and timestamps

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
- **API Integration**: Single API call fetches all user data and configuration
- **Dynamic Configuration**: No hardcoded CDN URLs or user-specific data
- **Dynamic Favicons** (`src/hooks.server.ts`): User-specific favicon redirects
- **Server-Side Loading**: Fetches user-specific data based on request domain
- **Infinite Scroll**: Lazy loads images with IntersectionObserver

### Configuration Flow

1. **Request arrives** with domain (e.g., `example.com`)
2. **Extract username** from domain (`example`)
3. **Build API URL** (`/data/example/content.json`)
4. **Fetch API data** (user info, config, images)
5. **Generate config** (avatar URL, CDN settings)
6. **Render page** with user-specific data

## Deployment

### Cloudflare Workers

The application deploys as a single Cloudflare Worker. See the setup section for full `wrangler.jsonc` configuration including routes and environment variables.

### Environment Variables

Only two environment variables are needed:

- **`PUBLIC_API_BASE`**: Your API base URL (production)
- **`PUBLIC_USER_NAME`**: Username for localhost development only

Set these in your `wrangler.jsonc` file or in the Cloudflare Worker dashboard under Variables and Secrets.

## Adding New Users

1. **Create API endpoint**: Ensure `https://api.yourdomain.com/data/newuser/content.json` returns proper structure
2. **Add domain routing**: Edit `wrangler.jsonc` to add routes for `newuser.com` and `admin.newuser.com`, then deploy
3. **Create favicon variants** (optional): Add `favicon16`, `favicon32`, `apple180` variants for the user's avatar in Cloudflare Images
4. **Done!** - No code changes or secrets needed

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
