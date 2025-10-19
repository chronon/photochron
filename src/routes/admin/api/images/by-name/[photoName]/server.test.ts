import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestHandler } from './$types';

interface LookupResponse {
  id?: string;
  name?: string;
  captured?: string;
  uploaded?: string;
  error?: string;
}

describe('admin/api/images/by-name/[photoName]/+server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('successfully finds image by name', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() =>
              Promise.resolve({
                id: 'img-123',
                name: 'vacation.jpg',
                captured: '2024-06-15T18:30:00Z',
                uploaded: '2024-06-15T19:00:00Z'
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'vacation.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.id).toBe('img-123');
      expect(json.name).toBe('vacation.jpg');
      expect(json.captured).toBe('2024-06-15T18:30:00Z');
      expect(json.uploaded).toBe('2024-06-15T19:00:00Z');
      expect(json.error).toBeUndefined();

      // Verify SQL query uses COLLATE NOCASE
      expect(mockD1.prepare).toHaveBeenCalledWith(
        'SELECT id, name, captured, uploaded FROM images WHERE username = ? AND name = ? COLLATE NOCASE ORDER BY uploaded DESC LIMIT 1'
      );
    });

    it('performs case-insensitive name matching', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn((username: string, photoName: string) => {
            // Simulate database case-insensitive comparison
            expect(username).toBe('johndoe');
            expect(photoName).toBe('VACATION.JPG'); // uppercase in request
            return {
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'img-555',
                  name: 'vacation.jpg', // lowercase in database
                  captured: '2024-10-01T10:00:00Z',
                  uploaded: '2024-10-01T10:30:00Z'
                })
              )
            };
          })
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'VACATION.JPG' }, // uppercase request
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.id).toBe('img-555');
      expect(json.name).toBe('vacation.jpg'); // Returns lowercase from database
    });

    it('returns 404 when image does not exist', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() => Promise.resolve(null))
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'nonexistent.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(404);
      expect(json.error).toBe('Image not found');
      expect(json.id).toBeUndefined();
    });

    it('returns 401 when request is not authenticated', async () => {
      const event = {
        params: { photoName: 'vacation.jpg' },
        platform: {
          env: {
            PCHRON_DB: {} as D1Database
          }
        },
        locals: {} // No adminAuth
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(json.id).toBeUndefined();
    });

    it('returns 400 when photoName is empty', async () => {
      const event = {
        params: { photoName: '' },
        platform: {
          env: {
            PCHRON_DB: {} as D1Database
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid photo name');
      expect(json.id).toBeUndefined();
    });

    it('returns 400 when photoName is whitespace only', async () => {
      const event = {
        params: { photoName: '   ' },
        platform: {
          env: {
            PCHRON_DB: {} as D1Database
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid photo name');
    });

    it('handles photo names with spaces', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() =>
              Promise.resolve({
                id: 'img-456',
                name: 'my photo.jpg',
                captured: '2024-07-01T10:00:00Z',
                uploaded: '2024-07-01T10:30:00Z'
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'my photo.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.name).toBe('my photo.jpg');
    });

    it('handles photo names with unicode characters', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() =>
              Promise.resolve({
                id: 'img-789',
                name: 'café.jpg',
                captured: '2024-08-01T14:00:00Z',
                uploaded: '2024-08-01T14:30:00Z'
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'café.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.name).toBe('café.jpg');
    });

    it('returns 500 when database binding is not available', async () => {
      const event = {
        params: { photoName: 'test.jpg' },
        platform: {
          env: {
            // No PCHRON_DB
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(500);
      expect(json.error).toBe('Configuration error');
    });

    it('returns 500 when platform is not available', async () => {
      const event = {
        params: { photoName: 'test.jpg' },
        platform: undefined,
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(500);
      expect(json.error).toBe('Platform not available');
    });

    it('returns 500 when database query throws error', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() => Promise.reject(new Error('Database connection failed')))
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'test.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(500);
      expect(json.error).toBe('Internal server error');
    });

    it('uses username from adminAuth, not from params', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn((username: string, photoName: string) => {
            // Verify the correct username is being used
            expect(username).toBe('johndoe');
            expect(photoName).toBe('vacation.jpg');
            return {
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'img-123',
                  name: 'vacation.jpg',
                  captured: '2024-06-15T18:30:00Z',
                  uploaded: '2024-06-15T19:00:00Z'
                })
              )
            };
          })
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: 'vacation.jpg' },
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe', // This should be used
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.id).toBe('img-123');
    });

    it('trims leading and trailing whitespace from photo name', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn((username: string, photoName: string) => {
            // Verify the photoName is trimmed
            expect(username).toBe('johndoe');
            expect(photoName).toBe('vacation.jpg'); // Should be trimmed
            return {
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'img-999',
                  name: 'vacation.jpg',
                  captured: '2024-09-01T12:00:00Z',
                  uploaded: '2024-09-01T12:30:00Z'
                })
              )
            };
          })
        }))
      } as unknown as D1Database;

      const event = {
        params: { photoName: '  vacation.jpg  ' }, // Leading and trailing spaces
        platform: {
          env: {
            PCHRON_DB: mockD1
          }
        },
        locals: {
          adminAuth: {
            username: 'johndoe',
            identity: {
              type: 'service_token' as const,
              clientId: 'client-123'
            }
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await GET(event);
      const json = (await response.json()) as LookupResponse;

      expect(response.status).toBe(200);
      expect(json.id).toBe('img-999');
      expect(json.name).toBe('vacation.jpg');
    });
  });
});
