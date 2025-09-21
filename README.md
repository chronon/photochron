# Chrononagram

A multi-user, domain-based photo gallery application built with SvelteKit and deployed on Cloudflare Workers. Each domain automatically displays a different user's photos and avatar based on convention-over-configuration principles.

## Features

- **Multi-user support** - One deployment serves unlimited domains/users
- **Domain-based routing** - `example.com` shows example's photos, `jane.com` shows jane's photos
- **Subdomain support** - `admin.example.com` also shows example's photos
- **Infinite scroll** - Smooth loading of photo galleries
- **Cloudflare Images integration** - Optimized image delivery
- **Zero configuration** - Add new users by just adding their domain

## How It Works

The application extracts the username from the domain name and dynamically generates configuration:

- **example.com** → username: `example` → API: `/data/example/images.json`
- **photos.jane-doe.com** → username: `jane-doe` → API: `/data/jane-doe/images.json`
- **admin.mysite.com** → username: `mysite` → API: `/data/mysite/images.json`

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
# Cloudflare Images CDN configuration
PUBLIC_IMG_BASE="https://imagedelivery.net/YOUR_ACCOUNT_HASH"
PUBLIC_IMG_VARIANT="default"

# API configuration
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

### API Requirements

Each user needs their images available at:

```
https://api.yourdomain.com/data/USERNAME/images.json
```

Expected JSON format:

```json
[
	{
		"id": "cloudflare-image-id",
		"caption": "Photo caption",
		"uploaded": "2024-01-01T00:00:00Z"
	}
]
```

## Avatar Configuration

### Using Custom Avatars

Each user can have a custom avatar by setting a Cloudflare secret:

1. **Via Dashboard**:
   - Go to Workers & Pages → Your Worker → Settings → Variables and Secrets
   - Add **Secret**: Name: `USERNAME_AVATAR`, Value: `image-id/variant`
   - Example: Name: `EXAMPLE_AVATAR`, Value: `ad285229-8231-4dac-e7d4-86e361718f00/default`

2. **Via Wrangler**:
   ```bash
   echo "ad285229-8231-4dac-e7d4-86e361718f00/default" | npx wrangler secret put EXAMPLE_AVATAR
   echo "585ca822-8827-4504-78c5-b76b377fdd00/default" | npx wrangler secret put JANE_AVATAR
   ```

### Avatar Fallback

If no `USERNAME_AVATAR` secret is set, the system falls back to:

```
https://imagedelivery.net/ACCOUNT_HASH/username-avatar/default
```

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
│   ├── +layout.server.ts   # Layout-level config loading
│   ├── +layout.svelte      # Site header with user info
│   ├── +page.server.ts     # Image data loading
│   └── +page.svelte        # Main photo gallery
└── app.html                # HTML template
```

### Key Components

- **Domain Extraction** (`src/lib/config.ts`): Parses hostname to determine user
- **Dynamic Configuration**: Generates API endpoints and image URLs per user
- **Server-Side Loading**: Fetches user-specific data based on request domain
- **Infinite Scroll**: Lazy loads images with IntersectionObserver

## Deployment

### Cloudflare Workers

The application deploys as a single Cloudflare Worker that handles all domains:

```jsonc
{
	"name": "chrononagram-web",
	"main": ".svelte-kit/cloudflare/_worker.js",
	"compatibility_date": "2025-09-06",
	"compatibility_flags": ["nodejs_als"]
}
```

### Environment Variables

Set these in your Cloudflare Worker dashboard:

- **Production**: Set via Cloudflare Dashboard → Variables and Secrets
- **Development**: Use `.env` file (not committed to git)

## Adding New Users

1. **Ensure API endpoint exists**: `https://api.yourdomain.com/data/newuser/images.json`
2. **Add domain routing**: Cloudflare Dashboard → Add routes for `newuser.com/*`
3. **Optional avatar**: Add `NEWUSER_AVATAR` secret with Cloudflare image ID
4. **Done!** - No code changes or redeployment needed

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
- **Documentation**: This README and code comments
- **Examples**: See `.env-example` for configuration reference
