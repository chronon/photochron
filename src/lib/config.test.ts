import { describe, it, expect, vi } from 'vitest';
import { extractUserFromDomain, getConfigFromKV } from './config';

describe('config', () => {
  describe('extractUserFromDomain', () => {
    it('extracts username from simple domain', () => {
      const result = extractUserFromDomain('johndoe.com');
      expect(result).toBe('johndoe');
    });

    it('extracts username from subdomain', () => {
      const result = extractUserFromDomain('www.johndoe.com');
      expect(result).toBe('johndoe');
    });

    it('extracts username from deep subdomain', () => {
      const result = extractUserFromDomain('app.photos.johndoe.com');
      expect(result).toBe('johndoe');
    });

    it('handles localhost', () => {
      const result = extractUserFromDomain('localhost:3000');
      expect(result).toBe('unknown-user');
    });

    it('handles single part domains', () => {
      const result = extractUserFromDomain('localhost');
      expect(result).toBe('unknown-user');
    });
  });

  describe('getConfigFromKV', () => {
    it('fetches and parses global and user config from KV', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(
              JSON.stringify({
                apiBase: 'https://api.example.com',
                imageBase: 'https://cdn.example.com',
                imageVariant: 'gallery'
              })
            );
          }
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                avatar: {
                  id: 'avatar-123',
                  variant: 'profile'
                }
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const result = await getConfigFromKV(mockKV, 'johndoe.com');

      expect(result).toEqual({
        global: {
          apiBase: 'https://api.example.com',
          imageBase: 'https://cdn.example.com',
          imageVariant: 'gallery'
        },
        user: {
          domain: 'johndoe.com',
          avatar: {
            id: 'avatar-123',
            variant: 'profile'
          }
        },
        username: 'johndoe'
      });

      expect(mockKV.get).toHaveBeenCalledWith('global');
      expect(mockKV.get).toHaveBeenCalledWith('user:johndoe');
    });

    it('throws error when global config is missing', async () => {
      const mockKV = {
        get: vi.fn(() => Promise.resolve(null))
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'johndoe.com')).rejects.toThrow(
        'Global config not found in KV'
      );
    });

    it('throws error when user config is missing', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'global') {
            return Promise.resolve(JSON.stringify({ apiBase: 'https://api.example.com' }));
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'johndoe.com')).rejects.toThrow(
        'User config not found for: johndoe'
      );
    });
  });
});
