# Chrononagram Web

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos and configuration based on convention-over-configuration principles.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **Dynamic configuration** - All user config (CDN, avatars, images) comes from API
- **Infinite scroll** - Smooth loading of photo galleries
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

### 3. Development

```bash
pnpm dev  # http://localhost:5173
```

### 4. Deploy

```bash
pnpm build
wrangler deploy
```

## Domain Setup

### Add New Domains

1. **Cloudflare Dashboard**: Go to Workers & Pages → Your Worker → Settings → Triggers
2. **Add Route**: `newdomain.com/*` → point to your worker
3. **Add Subdomain Route**: `*.newdomain.com/*` → point to your worker

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
    "name": "silklag",
    "avatar": {
      "id": "ad285229-8231-4dac-e7d4-86e361718f00",
      "variant": "default"
    }
  },
  "config": {
    "imageBase": "https://imagedelivery.net/DvVl0mheSGO8iloS0s-G0g",
    "imageVariant": "default"
  },
  "images": [
    {
      "id": "5866f3f0-69f4-447b-11b2-c960d3e3dc00",
      "name": "IMG_3818",
      "caption": "GY!BE @ Pisgah Brewing",
      "taken": "2025-09-06T21:25:40-04:00",
      "uploaded": "2025-09-07T12:33:04-04:00"
    }
  ]
}
```

### API Response Fields

- **`user.name`**: Display name for the user
- **`user.avatar.id`**: Cloudflare Images ID for user's avatar
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
└── app.html                # HTML template
```

### Key Components

- **Domain Extraction** (`src/lib/config.ts`): Parses hostname to determine user
- **API Integration**: Single API call fetches all user data and configuration
- **Dynamic Configuration**: No hardcoded CDN URLs or user-specific data
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

The application deploys as a single Cloudflare Worker with no domain-specific configuration:

```jsonc
{
  "name": "chrononagram-web",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2025-09-06",
  "compatibility_flags": ["nodejs_als"],
  "workers_dev": false
}
```

### Environment Variables

Only two environment variables are needed:

- **`PUBLIC_API_BASE`**: Your API base URL (production)
- **`PUBLIC_USER_NAME`**: Username for localhost development only

Set these in your Cloudflare Worker dashboard under Variables and Secrets.

## Adding New Users

1. **Create API endpoint**: Ensure `https://api.yourdomain.com/data/newuser/content.json` returns proper structure
2. **Add domain routing**: Cloudflare Dashboard → Add routes for `newuser.com/*` and `*.newuser.com/*`
3. **Done!** - No code changes, secrets, or redeployment needed

## Open Source Ready

This codebase contains:
- ✅ Zero hardcoded domains or user specifics
- ✅ Generic configuration system
- ✅ Complete API documentation
- ✅ Example environment setup
- ✅ Comprehensive TypeScript types

Perfect for forking and customizing for your own multi-user gallery platform.

## Contributing

1. **Install dependencies**: `pnpm install`
2. **Make changes**: Follow existing patterns and conventions
3. **Test locally**: `pnpm dev` and verify functionality
4. **Quality check**: `pnpm check && pnpm lint` must pass
5. **Submit PR**: Include description of changes

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- **GitHub Issues**: https://github.com/chronon/chrononagram-web/issues
- **Documentation**: This README and JSDoc comments in code
- **Examples**: See `.env-example` for configuration reference