import { describe, it, expect, vi } from 'vitest';
import { handleFavicon } from './hooks.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('hooks.server', () => {
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
