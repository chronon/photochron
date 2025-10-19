import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './+server';
import type { RequestHandler } from './$types';

interface DeleteResponse {
  success: boolean;
  id?: string;
  message?: string;
  warning?: string;
  error?: string;
}

// Mock fetch globally
global.fetch = vi.fn();

describe('admin/api/images/[imageId]/+server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE', () => {
    it('successfully deletes image from D1 and Cloudflare Images', async () => {
      const mockD1 = {
        prepare: vi.fn((sql: string) => {
          if (sql.includes('SELECT')) {
            return {
              bind: vi.fn(() => ({
                first: vi.fn(() =>
                  Promise.resolve({
                    id: 'img-123',
                    username: 'johndoe',
                    name: 'vacation.jpg'
                  })
                )
              }))
            };
          }
          // DELETE query
          return {
            bind: vi.fn(() => ({
              run: vi.fn(() =>
                Promise.resolve({
                  success: true
                })
              )
            }))
          };
        })
      } as unknown as D1Database;

      const event = {
        params: { imageId: 'img-123' },
        platform: {
          env: {
            PCHRON_DB: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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

      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {},
            errors: [],
            messages: []
          }),
          { status: 200 }
        )
      );

      const response = await DELETE(event);
      const json = (await response.json()) as DeleteResponse;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.id).toBe('img-123');
      expect(json.message).toBe('Image deleted successfully');
      expect(json.warning).toBeUndefined();
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
        params: { imageId: 'nonexistent' },
        platform: {
          env: {
            PCHRON_DB: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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

      const response = await DELETE(event);
      const json = (await response.json()) as DeleteResponse;

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Image not found');
    });

    it('returns 403 when user tries to delete another users image', async () => {
      let callCount = 0;
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(() => {
              callCount++;
              if (callCount === 1) {
                // First query: check with username
                return Promise.resolve(null);
              }
              // Second query: check without username
              return Promise.resolve({
                id: 'img-123',
                username: 'otheruser'
              });
            })
          }))
        }))
      } as unknown as D1Database;

      const event = {
        params: { imageId: 'img-123' },
        platform: {
          env: {
            PCHRON_DB: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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

      const response = await DELETE(event);
      const json = (await response.json()) as DeleteResponse;

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Forbidden');
    });

    it('returns 401 when request is not authenticated', async () => {
      const event = {
        params: { imageId: 'img-123' },
        platform: {
          env: {
            PCHRON_DB: {} as D1Database,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
          }
        },
        locals: {} // No adminAuth
      } as unknown as Parameters<RequestHandler>[0];

      const response = await DELETE(event);
      const json = (await response.json()) as DeleteResponse;

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when imageId is empty', async () => {
      const event = {
        params: { imageId: '' },
        platform: {
          env: {
            PCHRON_DB: {} as D1Database,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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

      const response = await DELETE(event);
      const json = (await response.json()) as DeleteResponse;

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid image ID');
    });
  });
});
