import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

interface Image {
  id: string;
  name: string;
  caption: string | null;
  captured: string;
  uploaded: string;
}

interface ImagesResponse {
  images: Image[];
  hasMore: boolean;
  error?: string;
}

describe('api/images/+server', () => {
  describe('GET', () => {
    it('returns images for user with hasMore=false when less than 6 results', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() =>
              Promise.resolve({
                results: [
                  {
                    id: 'img1',
                    name: 'photo1',
                    caption: 'Caption 1',
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
        url: new URL('https://johndoe.com/api/images?offset=0'),
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      const response = await GET(event);
      const json = (await response.json()) as ImagesResponse;

      expect(json.images).toHaveLength(2);
      expect(json.hasMore).toBe(false);
      expect(json.images[0].id).toBe('img1');
      expect(json.images[1].id).toBe('img2');
    });

    it('returns 5 images with hasMore=true when 6 results returned', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() =>
              Promise.resolve({
                results: [
                  {
                    id: 'img1',
                    name: 'photo1',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  },
                  {
                    id: 'img2',
                    name: 'photo2',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  },
                  {
                    id: 'img3',
                    name: 'photo3',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  },
                  {
                    id: 'img4',
                    name: 'photo4',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  },
                  {
                    id: 'img5',
                    name: 'photo5',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  },
                  {
                    id: 'img6',
                    name: 'photo6',
                    caption: null,
                    captured: '2025-01-01',
                    uploaded: '2025-01-02'
                  }
                ]
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com/api/images?offset=0'),
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      const response = await GET(event);
      const json = (await response.json()) as ImagesResponse;

      expect(json.images).toHaveLength(5);
      expect(json.hasMore).toBe(true);
      expect(json.images.map((img) => img.id)).toEqual(['img1', 'img2', 'img3', 'img4', 'img5']);
    });

    it('uses offset parameter from query string', async () => {
      const bindMock = vi.fn(() => ({
        all: vi.fn(() =>
          Promise.resolve({
            results: []
          })
        )
      }));

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: bindMock
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com/api/images?offset=10'),
        platform: {
          env: {
            PCHRON_DB: mockD1,
            DEV_USER: 'johndoe'
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      await GET(event);

      expect(bindMock).toHaveBeenCalledWith('johndoe', 6, 10);
    });

    it('defaults offset to 0 when not provided', async () => {
      const bindMock = vi.fn(() => ({
        all: vi.fn(() =>
          Promise.resolve({
            results: []
          })
        )
      }));

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: bindMock
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com/api/images'),
        platform: {
          env: {
            PCHRON_DB: mockD1,
            DEV_USER: 'johndoe'
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      await GET(event);

      expect(bindMock).toHaveBeenCalledWith('johndoe', 6, 0);
    });

    it('extracts username from domain', async () => {
      const bindMock = vi.fn(() => ({
        all: vi.fn(() =>
          Promise.resolve({
            results: []
          })
        )
      }));

      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: bindMock
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://alice.com/api/images'),
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      await GET(event);

      expect(bindMock).toHaveBeenCalledWith('alice', 6, 0);
    });

    it('returns error when D1 database is unavailable', async () => {
      const event = {
        url: new URL('https://johndoe.com/api/images'),
        platform: {
          env: {}
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      const response = await GET(event);
      const json = (await response.json()) as ImagesResponse;

      expect(response.status).toBe(500);
      expect(json.error).toBe('D1 database not available');
    });

    it('returns error when D1 query fails', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(() => Promise.reject(new Error('Database error')))
          }))
        }))
      } as unknown as D1Database;

      const event = {
        url: new URL('https://johndoe.com/api/images'),
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        }
      } as unknown as RequestEvent<Record<string, never>, '/api/images'>;

      const response = await GET(event);
      const json = (await response.json()) as ImagesResponse;

      expect(response.status).toBe(500);
      expect(json.error).toBe('Failed to fetch images');
    });
  });
});
