import { describe, it, expect, vi } from 'vitest';
import { getConfigFromKV, getUsernameFromDomain } from './config';

describe('config', () => {
  describe('getUsernameFromDomain', () => {
    it('looks up username from domain mapping in KV', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'domain:example.com') {
            return Promise.resolve('alice');
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const result = await getUsernameFromDomain(mockKV, 'example.com', 'dev-user');

      expect(result).toBe('alice');
      expect(mockKV.get).toHaveBeenCalledWith('domain:example.com');
    });

    it('strips port from hostname before lookup', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'domain:example.com') {
            return Promise.resolve('alice');
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const result = await getUsernameFromDomain(mockKV, 'example.com:8080', 'dev-user');

      expect(result).toBe('alice');
      expect(mockKV.get).toHaveBeenCalledWith('domain:example.com');
    });

    it('returns DEV_USER for localhost', async () => {
      const mockKV = {
        get: vi.fn()
      } as unknown as KVNamespace;

      const result = await getUsernameFromDomain(mockKV, 'localhost', 'dev-user');

      expect(result).toBe('dev-user');
      expect(mockKV.get).not.toHaveBeenCalled();
    });

    it('returns DEV_USER for localhost with port', async () => {
      const mockKV = {
        get: vi.fn()
      } as unknown as KVNamespace;

      const result = await getUsernameFromDomain(mockKV, 'localhost:3000', 'dev-user');

      expect(result).toBe('dev-user');
      expect(mockKV.get).not.toHaveBeenCalled();
    });

    it('throws error when DEV_USER is missing for localhost', async () => {
      const mockKV = {
        get: vi.fn()
      } as unknown as KVNamespace;

      await expect(getUsernameFromDomain(mockKV, 'localhost', undefined)).rejects.toThrow(
        'DEV_USER environment variable must be set for localhost development'
      );
    });

    it('throws error when domain is not configured in KV', async () => {
      const mockKV = {
        get: vi.fn(() => Promise.resolve(null))
      } as unknown as KVNamespace;

      await expect(getUsernameFromDomain(mockKV, 'unknown.com', 'dev-user')).rejects.toThrow(
        'Domain not configured: unknown.com'
      );
    });
  });

  describe('getConfigFromKV', () => {
    it('fetches and parses global and user config from KV using domain lookup', async () => {
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
                profile: {
                  name: 'John Doe'
                },
                avatar: {
                  id: 'avatar-123',
                  variant: 'profile'
                },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const result = await getConfigFromKV(mockKV, 'johndoe.com', 'dev-user');

      expect(result).toEqual({
        global: {
          imageBase: 'https://cdn.example.com',
          imageVariant: 'gallery'
        },
        user: {
          domains: ['johndoe.com'],
          profile: {
            name: 'John Doe'
          },
          avatar: {
            id: 'avatar-123',
            variant: 'profile'
          },
          authorized_client_ids: []
        },
        username: 'johndoe'
      });

      expect(mockKV.get).toHaveBeenCalledWith('global');
      expect(mockKV.get).toHaveBeenCalledWith('domain:johndoe.com');
      expect(mockKV.get).toHaveBeenCalledWith('user:johndoe');
    });

    it('handles localhost with DEV_USER bypass', async () => {
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
          if (key === 'user:dev-user') {
            return Promise.resolve(
              JSON.stringify({
                domains: ['localhost'],
                profile: {
                  name: 'Dev User'
                },
                avatar: {
                  id: 'avatar-123',
                  variant: 'profile'
                },
                authorized_client_ids: []
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const result = await getConfigFromKV(mockKV, 'localhost:3000', 'dev-user');

      expect(result.username).toBe('dev-user');
      expect(mockKV.get).toHaveBeenCalledWith('global');
      expect(mockKV.get).toHaveBeenCalledWith('user:dev-user');
      expect(mockKV.get).not.toHaveBeenCalledWith('domain:localhost');
    });

    it('throws error when global config is missing', async () => {
      const mockKV = {
        get: vi.fn(() => Promise.resolve(null))
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'johndoe.com', 'dev-user')).rejects.toThrow(
        'Global config not found in KV'
      );
    });

    it('throws error when domain is not configured', async () => {
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
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'unknown.com', 'dev-user')).rejects.toThrow(
        'Domain not configured: unknown.com'
      );
    });

    it('throws error when user config is missing', async () => {
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
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'johndoe.com', 'dev-user')).rejects.toThrow(
        'User config not found for: johndoe'
      );
    });

    it('throws error when DEV_USER is missing for localhost', async () => {
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
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      await expect(getConfigFromKV(mockKV, 'localhost', undefined)).rejects.toThrow(
        'DEV_USER environment variable must be set for localhost development'
      );
    });
  });
});
