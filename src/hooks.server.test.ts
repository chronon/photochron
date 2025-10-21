import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAdminAuth, handleFavicon } from './hooks.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('hooks.server', () => {
  describe('admin authentication', () => {
    const baseUrl = 'https://johndoe.com/admin/dashboard';

    const createKV = (authorizedClientIds: string[] = ['client-123']): KVNamespace =>
      ({
        get: vi.fn((key: string) => {
          if (key === 'domain:johndoe.com') {
            return Promise.resolve('johndoe');
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                authorized_client_ids: authorizedClientIds
              })
            );
          }
          return Promise.resolve(null);
        })
      }) as unknown as KVNamespace;

    const createEvent = (overrides: Partial<RequestEvent> = {}): RequestEvent => {
      const event = {
        request: new Request(baseUrl, {
          headers: {
            'Cf-Access-Client-Id': 'client-123'
          }
        }),
        url: new URL(baseUrl),
        platform: {
          env: {
            PCHRON_KV: createKV(),
            CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com'
          }
        },
        locals: {}
      } as unknown as RequestEvent;

      return Object.assign(event, overrides);
    };

    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('authenticates admin request and populates locals', async () => {
      const event = createEvent();

      const resolve = vi.fn(async () => new Response('OK'));

      const response = await handleAdminAuth({
        event,
        resolve
      } as Parameters<typeof handleAdminAuth>[0]);

      expect(resolve).toHaveBeenCalledWith(event);
      expect(response).toBeInstanceOf(Response);
      expect(event.locals.adminAuth).toEqual({
        username: 'johndoe',
        identity: {
          type: 'service_token',
          clientId: 'client-123'
        }
      });
    });

    it('throws 500 when CF_ACCESS_TEAM_DOMAIN is missing', async () => {
      const event = createEvent({
        platform: {
          env: {
            PCHRON_KV: createKV()
          }
        } as unknown as RequestEvent['platform']
      });

      const resolve = vi.fn();

      await expect(
        handleAdminAuth({
          event,
          resolve
        } as Parameters<typeof handleAdminAuth>[0])
      ).rejects.toMatchObject({ status: 500 });
      expect(resolve).not.toHaveBeenCalled();
    });

    it('throws 404 when domain is not configured', async () => {
      const kv = {
        get: vi.fn(() => Promise.resolve(null))
      } as unknown as KVNamespace;

      const event = createEvent({
        platform: {
          env: {
            PCHRON_KV: kv,
            CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com'
          }
        } as unknown as RequestEvent['platform']
      });

      const resolve = vi.fn();

      await expect(
        handleAdminAuth({
          event,
          resolve
        } as Parameters<typeof handleAdminAuth>[0])
      ).rejects.toMatchObject({ status: 404 });
      expect(resolve).not.toHaveBeenCalled();
    });

    it('throws 401 when authentication headers are missing', async () => {
      const event = createEvent({
        request: new Request(baseUrl),
        platform: {
          env: {
            PCHRON_KV: createKV(),
            CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com'
          }
        } as unknown as RequestEvent['platform']
      });

      const resolve = vi.fn();

      await expect(
        handleAdminAuth({
          event,
          resolve
        } as Parameters<typeof handleAdminAuth>[0])
      ).rejects.toMatchObject({ status: 401 });
      expect(resolve).not.toHaveBeenCalled();
    });

    it('throws 403 when client ID is not authorized', async () => {
      const unauthorizedKV = createKV(['other-client']);
      const event = createEvent({
        platform: {
          env: {
            PCHRON_KV: unauthorizedKV,
            CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com'
          }
        } as unknown as RequestEvent['platform']
      });

      const resolve = vi.fn();

      await expect(
        handleAdminAuth({
          event,
          resolve
        } as Parameters<typeof handleAdminAuth>[0])
      ).rejects.toMatchObject({ status: 403 });
      expect(resolve).not.toHaveBeenCalled();
    });

    it('supports development bypass when issuer is dev', async () => {
      const kv = createKV();
      const event = createEvent({
        request: new Request(baseUrl, {
          headers: {
            'X-Dev-Client-Id': 'dev-client'
          }
        }),
        platform: {
          env: {
            PCHRON_KV: kv,
            CF_ACCESS_TEAM_DOMAIN: 'dev',
            DEV_CLIENT_ID: 'dev-client'
          }
        } as unknown as RequestEvent['platform']
      });

      const resolve = vi.fn(async () => new Response('OK'));

      const response = await handleAdminAuth({
        event,
        resolve
      } as Parameters<typeof handleAdminAuth>[0]);

      expect(response).toBeInstanceOf(Response);
      expect(resolve).toHaveBeenCalledWith(event);
      expect(kv.get).toHaveBeenCalledWith('domain:johndoe.com');
      expect(event.locals.adminAuth?.identity.clientId).toBe('dev-client');
    });
  });

  describe('favicon handling', () => {
    it('redirects to user avatar for /favicon.ico', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(
              JSON.stringify({
                imageBase: 'https://cdn.example.com',
                imageVariant: 'gallery'
              })
            );
          }
          if (key === 'domain:johndoe.com') {
            return Promise.resolve('johndoe');
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domains: ['johndoe.com'],
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com/favicon.ico'),
        platform: {
          env: {
            PCHRON_KV: mockKV
          }
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://cdn.example.com/avatar-123/favicon32');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('redirects to user avatar for /favicon-16x16.png', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(
              JSON.stringify({
                imageBase: 'https://cdn.example.com',
                imageVariant: 'gallery'
              })
            );
          }
          if (key === 'domain:johndoe.com') {
            return Promise.resolve('johndoe');
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domains: ['johndoe.com'],
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com/favicon-16x16.png'),
        platform: {
          env: {
            PCHRON_KV: mockKV
          }
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://cdn.example.com/avatar-123/favicon16');
    });

    it('redirects to user avatar for /favicon-32x32.png', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(
              JSON.stringify({
                imageBase: 'https://cdn.example.com',
                imageVariant: 'gallery'
              })
            );
          }
          if (key === 'domain:johndoe.com') {
            return Promise.resolve('johndoe');
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domains: ['johndoe.com'],
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com/favicon-32x32.png'),
        platform: {
          env: {
            PCHRON_KV: mockKV
          }
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://cdn.example.com/avatar-123/favicon32');
    });

    it('redirects to user avatar for /apple-touch-icon.png', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(
              JSON.stringify({
                imageBase: 'https://cdn.example.com',
                imageVariant: 'gallery'
              })
            );
          }
          if (key === 'domain:johndoe.com') {
            return Promise.resolve('johndoe');
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domains: ['johndoe.com'],
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com/apple-touch-icon.png'),
        platform: {
          env: {
            PCHRON_KV: mockKV
          }
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('https://cdn.example.com/avatar-123/apple180');
    });

    it('falls back to static file when KV is unavailable', async () => {
      const event = {
        url: new URL('https://johndoe.com/favicon.ico'),
        platform: {
          env: {}
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/fallback-favicon-32x32.png');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('falls back to static file when config fetch fails', async () => {
      const mockKV = {
        get: vi.fn(() => Promise.reject(new Error('KV error')))
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com/apple-touch-icon.png'),
        platform: {
          env: {
            PCHRON_KV: mockKV
          }
        }
      } as RequestEvent;

      const resolve = vi.fn();
      const response = await handleFavicon({ event, resolve });

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/fallback-apple-touch-icon.png');
    });

    it('does not intercept non-favicon requests', async () => {
      const event = {
        url: new URL('https://johndoe.com/some-page'),
        platform: { env: {} }
      } as RequestEvent;

      const mockResponse = new Response('OK');
      const resolve = vi.fn(() => Promise.resolve(mockResponse));

      const response = await handleFavicon({ event, resolve });

      expect(resolve).toHaveBeenCalledWith(event);
      expect(response).toBe(mockResponse);
    });
  });
});
