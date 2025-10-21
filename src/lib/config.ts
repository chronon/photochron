export interface GlobalKVConfig {
  imageBase: string;
  imageVariant: string;
}

export interface UserKVConfig {
  domains: string[];
  profile: {
    name: string;
  };
  avatar: {
    id: string;
    variant: string;
  };
  authorized_client_ids: string[];
}

/**
 * Determines username from hostname via domain lookup in KV.
 * Handles localhost bypass for development.
 */
export async function getUsernameFromDomain(
  kv: KVNamespace,
  hostname: string,
  devUser?: string
): Promise<string> {
  const hostWithoutPort = hostname.split(':')[0];

  if (hostWithoutPort.startsWith('localhost')) {
    if (!devUser) {
      throw new Error('DEV_USER environment variable must be set for localhost development');
    }
    return devUser;
  }

  const usernameFromKV = await kv.get(`domain:${hostWithoutPort}`);
  if (!usernameFromKV) {
    throw new Error(`Domain not configured: ${hostWithoutPort}`);
  }

  return usernameFromKV;
}

export async function getConfigFromKV(
  kv: KVNamespace,
  hostname: string,
  devUser?: string
): Promise<{ global: GlobalKVConfig; user: UserKVConfig; username: string }> {
  const globalJson = await kv.get('global');
  if (!globalJson) {
    throw new Error('Global config not found in KV');
  }

  const global = JSON.parse(globalJson) as GlobalKVConfig;

  // Determine username from domain
  const username = await getUsernameFromDomain(kv, hostname, devUser);

  const userJson = await kv.get(`user:${username}`);
  if (!userJson) {
    throw new Error(`User config not found for: ${username}`);
  }

  const user = JSON.parse(userJson) as UserKVConfig;

  return { global, user, username };
}
