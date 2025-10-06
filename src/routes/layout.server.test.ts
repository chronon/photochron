import { describe, it, expect, vi } from 'vitest';
import { load } from './+layout.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('+layout.server', () => {
  describe('load', () => {
    it('loads config and images from KV and D1', async () => {
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
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() =>
              Promise.resolve({
                results: [
                  {
                    id: 'img1',
                    name: 'photo1',
                    caption: 'A photo',
                    captured: '2025-01-01T00:00:00Z',
                    uploaded: '2025-01-02T00:00:00Z'
                  },
                  {
                    id: 'img2',
                    name: 'photo2',
                    caption: null,
                    captured: '2025-01-03T00:00:00Z',
                    uploaded: '2025-01-04T00:00:00Z'
                  }
                ]
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com'),
        platform: {
          env: {
            CHRONONAGRAM: mockKV,
            chrononagram: mockD1
          }
        }
      } as RequestEvent;

      const result = await load(event);

      expect(result.config).toEqual({
        imgBase: 'https://cdn.example.com',
        imgVariant: 'gallery',
        userAvatar: 'https://cdn.example.com/avatar-123/profile',
        userName: 'John Doe'
      });

      expect(result.images).toHaveLength(2);
      expect(result.images[0]).toEqual({
        id: 'img1',
        name: 'photo1',
        caption: 'A photo',
        captured: '2025-01-01T00:00:00Z',
        uploaded: '2025-01-02T00:00:00Z'
      });

      expect(result.username).toBe('johndoe');
    });

    it('throws error when KV namespace is unavailable', async () => {
      const event = {
        url: new URL('https://johndoe.com'),
        platform: {
          env: {}
        }
      } as RequestEvent;

      await expect(load(event)).rejects.toThrow(
        'KV namespace not available. Please run with `wrangler dev` or `pnpm dev`.'
      );
    });

    it('throws error when D1 database is unavailable', async () => {
      const mockKV = {
        get: vi.fn()
      } as unknown as KVNamespace;

      const event = {
        url: new URL('https://johndoe.com'),
        platform: {
          env: {
            CHRONONAGRAM: mockKV
          }
        }
      } as RequestEvent;

      await expect(load(event)).rejects.toThrow(
        'D1 database not available. Please run with `wrangler dev` or `pnpm dev`.'
      );
    });

    it('throws error when D1 query fails', async () => {
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
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() => Promise.reject(new Error('D1 query failed')))
          }))
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com'),
        platform: {
          env: {
            CHRONONAGRAM: mockKV,
            chrononagram: mockD1
          }
        }
      } as RequestEvent;

      await expect(load(event)).rejects.toThrow('D1 query failed');
    });

    it('handles localhost with DEV_USER', async () => {
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
          if (key === 'user:devuser') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'localhost',
                profile: { name: 'Dev User' },
                avatar: { id: 'dev-avatar', variant: 'profile' },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() =>
              Promise.resolve({
                results: []
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('http://localhost:5173'),
        platform: {
          env: {
            CHRONONAGRAM: mockKV,
            chrononagram: mockD1,
            DEV_USER: 'devuser'
          }
        }
      } as RequestEvent;

      const result = await load(event);

      expect(result.username).toBe('devuser');
      expect(result.config.userName).toBe('Dev User');
    });
  });
});
