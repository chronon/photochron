export interface GlobalKVConfig {
  imageBase: string;
  imageVariant: string;
}

export interface UserKVConfig {
  domain: string;
  profile: {
    name: string;
  };
  avatar: {
    id: string;
    variant: string;
  };
  authorized_client_ids: string[];
}

export function extractUserFromDomain(hostname: string, devUser?: string): string {
  const hostWithoutPort = hostname.split(':')[0];

  if (hostWithoutPort.startsWith('localhost')) {
    if (!devUser) {
      throw new Error('DEV_USER environment variable must be set for localhost development');
    }
    return devUser;
  }

  const parts = hostWithoutPort.split('.');
  if (parts.length === 2) {
    return parts[0];
  }

  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }

  throw new Error(`Cannot extract username from domain: ${hostname}`);
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
  const username = extractUserFromDomain(hostname, devUser);
  const userJson = await kv.get(`user:${username}`);

  if (!userJson) {
    throw new Error(`User config not found for: ${username}`);
  }

  const user = JSON.parse(userJson) as UserKVConfig;

  return { global, user, username };
}
