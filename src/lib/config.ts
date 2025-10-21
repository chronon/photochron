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

  // Extract hostname without port for lookup
  const hostWithoutPort = hostname.split(':')[0];

  // Localhost bypass for development
  let username: string;
  if (hostWithoutPort.startsWith('localhost')) {
    if (!devUser) {
      throw new Error('DEV_USER environment variable must be set for localhost development');
    }
    username = devUser;
  } else {
    // Look up username from domain mapping in KV
    const usernameFromKV = await kv.get(`domain:${hostWithoutPort}`);
    if (!usernameFromKV) {
      throw new Error(`Domain not configured: ${hostWithoutPort}`);
    }
    username = usernameFromKV;
  }

  const userJson = await kv.get(`user:${username}`);
  if (!userJson) {
    throw new Error(`User config not found for: ${username}`);
  }

  const user = JSON.parse(userJson) as UserKVConfig;

  return { global, user, username };
}
