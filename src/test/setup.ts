import { beforeEach } from 'vitest';
import { env } from 'cloudflare:workers';

beforeEach(() => {
  for (const key of Object.keys(env)) {
    delete (env as unknown as Record<string, unknown>)[key];
  }
});
