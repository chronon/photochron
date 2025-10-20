import { describe, it, expect, vi } from 'vitest';
import { extractAndValidateIdentity, checkAuthorization } from './auth';

describe('auth', () => {
  describe('extractAndValidateIdentity', () => {
    describe('development bypass', () => {
      it('activates when expectedIssuer is "dev"', () => {
        const request = new Request('https://example.com/admin/api/upload');
        const result = extractAndValidateIdentity(request, 'dev');

        expect(result).toEqual({
          type: 'service_token',
          clientId: 'dev-client-id'
        });
      });

      it('uses X-Dev-Client-Id header if provided', () => {
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'X-Dev-Client-Id': 'custom-dev-id' }
        });
        const result = extractAndValidateIdentity(request, 'dev');

        expect(result.clientId).toBe('custom-dev-id');
      });

      it('does not activate for production issuer', () => {
        const request = new Request('https://example.com/admin/api/upload');

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Missing Access authentication headers');
      });
    });

    describe('service token authentication', () => {
      it('extracts client ID from Cf-Access-Client-Id header', () => {
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Client-Id': 'test-client-id.access' }
        });
        const result = extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com');

        expect(result).toEqual({
          type: 'service_token',
          clientId: 'test-client-id.access'
        });
      });

      it('extracts client ID from JWT common_name', () => {
        const payload = {
          common_name: 'jwt-client-id.access',
          iss: 'https://team.cloudflareaccess.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        const jwt = `header.${btoa(JSON.stringify(payload))}.signature`;
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt }
        });
        const result = extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com');

        expect(result).toEqual({
          type: 'service_token',
          clientId: 'jwt-client-id.access'
        });
      });

      it('throws error when service token JWT missing common_name', () => {
        const payload = {
          iss: 'https://team.cloudflareaccess.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        const jwt = `header.${btoa(JSON.stringify(payload))}.signature`;
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt }
        });

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Service token missing common_name');
      });
    });

    describe('JWT validation', () => {
      it('rejects expired JWT', () => {
        const payload = {
          common_name: 'test-client-id.access',
          iss: 'https://team.cloudflareaccess.com',
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        };
        const jwt = `header.${btoa(JSON.stringify(payload))}.signature`;
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt }
        });

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Token expired');
      });

      it('rejects JWT with wrong issuer', () => {
        const payload = {
          common_name: 'test-client-id.access',
          iss: 'https://wrong-team.cloudflareaccess.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        const jwt = `header.${btoa(JSON.stringify(payload))}.signature`;
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt }
        });

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Invalid issuer');
      });

      it('rejects malformed JWT', () => {
        const request = new Request('https://example.com/admin/api/upload', {
          headers: { 'Cf-Access-Jwt-Assertion': 'invalid-jwt' }
        });

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Invalid JWT format');
      });

      it('throws error when no authentication headers present', () => {
        const request = new Request('https://example.com/admin/api/upload');

        expect(() =>
          extractAndValidateIdentity(request, 'https://team.cloudflareaccess.com')
        ).toThrow('Missing Access authentication headers');
      });
    });
  });

  describe('checkAuthorization', () => {
    it('allows access when client ID is in authorized list', async () => {
      const mockKV = {
        get: vi.fn(() =>
          Promise.resolve(
            JSON.stringify({
              domain: 'example.com',
              profile: { name: 'Test User' },
              avatar: { id: 'avatar-id', variant: 'default' },
              authorized_client_ids: ['allowed-client.access', 'another-client.access']
            })
          )
        )
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'allowed-client.access'
      };

      await expect(checkAuthorization(identity, 'testuser', mockKV)).resolves.toBeUndefined();
      expect(mockKV.get).toHaveBeenCalledWith('user:testuser');
    });

    it('throws error when client ID not in authorized list', async () => {
      const mockKV = {
        get: vi.fn(() =>
          Promise.resolve(
            JSON.stringify({
              domain: 'example.com',
              profile: { name: 'Test User' },
              avatar: { id: 'avatar-id', variant: 'default' },
              authorized_client_ids: ['allowed-client.access']
            })
          )
        )
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'unauthorized-client.access'
      };

      await expect(checkAuthorization(identity, 'testuser', mockKV)).rejects.toThrow(
        'Client unauthorized-client.access not authorized for user testuser'
      );
    });

    it('throws error when user not found in KV', async () => {
      const mockKV = {
        get: vi.fn(() => Promise.resolve(null))
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'test-client.access'
      };

      await expect(checkAuthorization(identity, 'nonexistent', mockKV)).rejects.toThrow(
        'User not found: nonexistent'
      );
    });

    it('allows access when dev client ID matches', async () => {
      const mockKV = {
        get: vi.fn()
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'dev-client-id'
      };

      // Should bypass KV check when devClientId matches
      await expect(
        checkAuthorization(identity, 'testuser', mockKV, 'dev-client-id')
      ).resolves.toBeUndefined();
      expect(mockKV.get).not.toHaveBeenCalled();
    });

    it('does not bypass when devClientId does not match', async () => {
      const mockKV = {
        get: vi.fn(() =>
          Promise.resolve(
            JSON.stringify({
              domain: 'example.com',
              profile: { name: 'Test User' },
              avatar: { id: 'avatar-id', variant: 'default' },
              authorized_client_ids: ['allowed-client.access']
            })
          )
        )
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'different-client-id'
      };

      // Should check KV when devClientId doesn't match
      await expect(
        checkAuthorization(identity, 'testuser', mockKV, 'dev-client-id')
      ).rejects.toThrow('Client different-client-id not authorized for user testuser');
      expect(mockKV.get).toHaveBeenCalled();
    });

    it('does not bypass when devClientId is undefined', async () => {
      const mockKV = {
        get: vi.fn(() =>
          Promise.resolve(
            JSON.stringify({
              domain: 'example.com',
              profile: { name: 'Test User' },
              avatar: { id: 'avatar-id', variant: 'default' },
              authorized_client_ids: ['allowed-client.access']
            })
          )
        )
      } as unknown as KVNamespace;

      const identity = {
        type: 'service_token' as const,
        clientId: 'allowed-client.access'
      };

      // Should check KV when devClientId is undefined (production)
      await expect(
        checkAuthorization(identity, 'testuser', mockKV, undefined)
      ).resolves.toBeUndefined();
      expect(mockKV.get).toHaveBeenCalled();
    });
  });
});
