import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAPIEndpoint, getConfigFromAPIResponse, type APIResponse } from './config';

// Mock the environment module
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_API_BASE: 'https://api.example.com',
    PUBLIC_USER_NAME: 'test-user'
  }
}));

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAPIEndpoint', () => {
    it('extracts username from simple domain', () => {
      const result = getAPIEndpoint('johndoe.com');
      expect(result).toBe('https://api.example.com/data/johndoe/content.json');
    });

    it('extracts username from subdomain', () => {
      const result = getAPIEndpoint('www.johndoe.com');
      expect(result).toBe('https://api.example.com/data/johndoe/content.json');
    });

    it('extracts username from deep subdomain', () => {
      const result = getAPIEndpoint('app.photos.johndoe.com');
      expect(result).toBe('https://api.example.com/data/johndoe/content.json');
    });

    it('uses env variable for localhost', () => {
      const result = getAPIEndpoint('localhost:3000');
      expect(result).toBe('https://api.example.com/data/test-user/content.json');
    });

    it('uses env variable for 127.0.0.1', () => {
      const result = getAPIEndpoint('127.0.0.1:5173');
      expect(result).toBe('https://api.example.com/data/test-user/content.json');
    });

    it('handles single part domains', () => {
      const result = getAPIEndpoint('localhost');
      expect(result).toBe('https://api.example.com/data/test-user/content.json');
    });

    it('throws error when PUBLIC_API_BASE is missing', async () => {
      // Reset modules and mock with undefined API_BASE
      vi.resetModules();
      vi.doMock('$env/dynamic/public', () => ({
        env: {
          PUBLIC_API_BASE: undefined,
          PUBLIC_USER_NAME: 'test-user'
        }
      }));

      // Dynamically import to get the mocked version
      const { getAPIEndpoint: mockedGetAPIEndpoint } = await import('./config');

      expect(() => mockedGetAPIEndpoint('example.com')).toThrow(
        'PUBLIC_API_BASE environment variable is required'
      );
    });
  });

  describe('getConfigFromAPIResponse', () => {
    const mockAPIResponse: APIResponse = {
      user: {
        name: 'John Doe',
        avatar: {
          id: 'avatar-123',
          variant: 'profile'
        }
      },
      config: {
        imageBase: 'https://cdn.example.com',
        imageVariant: 'gallery'
      },
      images: [
        {
          id: 'img-1',
          name: 'Photo 1',
          caption: 'A beautiful sunset',
          taken: '2024-01-15T18:30:00Z',
          uploaded: '2024-01-16T09:00:00Z'
        }
      ]
    };

    it('transforms API response to UserConfig correctly', () => {
      const result = getConfigFromAPIResponse(mockAPIResponse);

      expect(result).toEqual({
        imgBase: 'https://cdn.example.com',
        imgVariant: 'gallery',
        userAvatar: 'https://cdn.example.com/avatar-123/profile',
        userName: 'John Doe'
      });
    });

    it('constructs avatar URL correctly', () => {
      const response = {
        ...mockAPIResponse,
        user: {
          ...mockAPIResponse.user,
          avatar: {
            id: 'different-avatar',
            variant: 'thumbnail'
          }
        },
        config: {
          ...mockAPIResponse.config,
          imageBase: 'https://images.cloudflare.com'
        }
      };

      const result = getConfigFromAPIResponse(response);

      expect(result.userAvatar).toBe('https://images.cloudflare.com/different-avatar/thumbnail');
    });

    it('handles minimal API response', () => {
      const minimalResponse: APIResponse = {
        user: {
          name: '',
          avatar: {
            id: '',
            variant: 'default'
          }
        },
        config: {
          imageBase: 'https://cdn.com',
          imageVariant: 'default'
        },
        images: []
      };

      const result = getConfigFromAPIResponse(minimalResponse);

      expect(result).toEqual({
        imgBase: 'https://cdn.com',
        imgVariant: 'default',
        userAvatar: 'https://cdn.com//default',
        userName: ''
      });
    });
  });
});
