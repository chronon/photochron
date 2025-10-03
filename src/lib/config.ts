export interface GlobalKVConfig {
  apiBase: string;
  imageBase: string;
  imageVariant: string;
}

export interface UserKVConfig {
  domain: string;
  avatar: {
    id: string;
    variant: string;
  };
}

/**
 * Expected API response structure for the content endpoint.
 *
 * The API returns only image data. All configuration (user info, CDN settings)
 * comes from Cloudflare KV storage and is configured at deployment time.
 *
 * API endpoint: `${apiBase}/data/${username}/content.json`
 *
 * @example
 * ```json
 * {
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

export function extractUserFromDomain(hostname: string): string {
  if (
    hostname.startsWith('localhost') ||
    hostname.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)
  ) {
    return 'unknown-user';
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

export async function getConfigFromKV(
  kv: KVNamespace,
  hostname: string
): Promise<{ global: GlobalKVConfig; user: UserKVConfig; username: string }> {
  const username = extractUserFromDomain(hostname);

  const [globalJson, userJson] = await Promise.all([kv.get('global'), kv.get(`user:${username}`)]);

  if (!globalJson) {
    throw new Error('Global config not found in KV');
  }
  if (!userJson) {
    throw new Error(`User config not found for: ${username}`);
  }

  const global = JSON.parse(globalJson) as GlobalKVConfig;
  const user = JSON.parse(userJson) as UserKVConfig;

  return { global, user, username };
}
