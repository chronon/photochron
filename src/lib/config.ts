import { env } from '$env/dynamic/public';

export interface UserConfig {
  imgBase: string;
  imgVariant: string;
  userAvatar: string;
  userName: string;
}

/**
 * Expected API response structure for the content endpoint.
 *
 * Your API should respond with this structure when called at:
 * `${PUBLIC_API_BASE}/data/${username}/content.json`
 *
 * @example
 * ```json
 * {
 *   "user": {
 *     "name": "silklag",
 *     "avatar": {
 *       "id": "ad285229-8231-4dac-e7d4-86e361718f00",
 *       "variant": "default"
 *     }
 *   },
 *   "config": {
 *     "imageBase": "https://imagedelivery.net/DvVl0mheSGO8iloS0s-G0g",
 *     "imageVariant": "default"
 *   },
 *   "images": [
 *     {
 *       "id": "5866f3f0-69f4-447b-11b2-c960d3e3dc00",
 *       "name": "IMG_3818",
 *       "caption": "Photo caption",
 *       "taken": "2025-09-06T21:25:40-04:00",
 *       "uploaded": "2025-09-07T12:33:04-04:00"
 *     }
 *   ]
 * }
 * ```
 */
export interface APIResponse {
  /** User information and profile data */
  user: {
    /** Display name for the user */
    name: string;
    /** User's profile avatar configuration */
    avatar: {
      /** Cloudflare Images ID or CDN identifier for avatar image */
      id: string;
      /** Image variant to use (e.g., "default", "thumbnail") */
      variant: string;
    };
  };
  /** CDN and image serving configuration */
  config: {
    /** Base URL for image CDN (e.g., Cloudflare Images delivery URL) */
    imageBase: string;
    /** Default variant to use for gallery images */
    imageVariant: string;
  };
  /** Array of images to display in the gallery */
  images: Array<{
    /** Unique identifier for the image (used in CDN URL) */
    id: string;
    /** Original filename or display name */
    name: string;
    /** Optional caption text to display */
    caption?: string;
    /** ISO date string when photo was taken */
    taken: string;
    /** ISO date string when photo was uploaded */
    uploaded: string;
  }>;
}

function extractUserFromDomain(hostname: string): string {
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return env.PUBLIC_USER_NAME || 'dev-user';
  }

  const parts = hostname.split('.');
  if (parts.length === 2) {
    return parts[0];
  }

  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }

  return 'unknown-user';
}

export function getAPIEndpoint(hostname: string): string {
  const userName = extractUserFromDomain(hostname);
  const apiBase = env.PUBLIC_API_BASE;

  if (!apiBase) {
    throw new Error('PUBLIC_API_BASE environment variable is required');
  }

  return `${apiBase}/data/${userName}/content.json`;
}

export function getConfigFromAPIResponse(apiResponse: APIResponse): UserConfig {
  const { user, config } = apiResponse;

  return {
    imgBase: config.imageBase,
    imgVariant: config.imageVariant,
    userAvatar: `${config.imageBase}/${user.avatar.id}/${user.avatar.variant}`,
    userName: user.name
  };
}
