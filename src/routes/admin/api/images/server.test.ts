import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestHandler } from './$types';

interface UploadResponse {
  success: boolean;
  id?: string;
  filename?: string;
  error?: string;
}

// Mock fetch globally
global.fetch = vi.fn();

describe('admin/api/images/+server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('successfully uploads image and saves to D1', async () => {
      const mockD1 = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(() =>
              Promise.resolve({
                success: true
              })
            )
          }))
        }))
      } as unknown as D1Database;

      const formData = new FormData();
      formData.append('file', new File(['image data'], 'photo.jpg', { type: 'image/jpeg' }));
      formData.append(
        'metadata',
        JSON.stringify({
          name: 'vacation',
          caption: 'Beach trip',
          captured: '2025-01-01T00:00:00Z'
        })
      );

      const mockRequest = {
        formData: vi.fn(() => Promise.resolve(formData))
      } as unknown as Request;

      const event = {
        request: mockRequest,
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
            result: {
              id: 'img-123',
              filename: 'johndoe_vacation.jpg',
              uploaded: '2025-01-02T00:00:00Z',
              requireSignedURLs: false,
              variants: []
            }
          }),
          { status: 200 }
        )
      );

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(json.success).toBe(true);
      expect(json.id).toBe('img-123');
      expect(json.filename).toBe('johndoe_vacation.jpg');
    });

    it('rejects request without authentication', async () => {
      const event = {
        request: {} as Request,
        platform: {
          env: {
            PCHRON_DB: {} as D1Database,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
          }
        },
        locals: {} // No adminAuth
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('rejects request without platform environment', async () => {
      const event = {
        request: {} as Request,
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

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Platform not available');
    });

    it('rejects request without D1 database', async () => {
      const event = {
        request: {} as Request,
        platform: {
          env: {
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

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Configuration error');
    });

    it('rejects file with invalid extension', async () => {
      const mockD1 = {} as unknown as D1Database;

      const formData = new FormData();
      formData.append('file', new File(['data'], 'file.exe', { type: 'application/exe' }));
      formData.append(
        'metadata',
        JSON.stringify({
          name: 'test',
          captured: '2025-01-01T00:00:00Z'
        })
      );

      const mockRequest = {
        formData: vi.fn(() => Promise.resolve(formData))
      } as unknown as Request;

      const event = {
        request: mockRequest,
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

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid file extension');
    });

    it('rejects file exceeding size limit', async () => {
      const mockD1 = {} as unknown as D1Database;

      // Create a file larger than 10MB
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });

      const formData = new FormData();
      formData.append('file', largeFile);
      formData.append(
        'metadata',
        JSON.stringify({
          name: 'test',
          captured: '2025-01-01T00:00:00Z'
        })
      );

      const mockRequest = {
        formData: vi.fn(() => Promise.resolve(formData))
      } as unknown as Request;

      const event = {
        request: mockRequest,
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

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('File too large');
    });

    it('rejects request with invalid metadata', async () => {
      const mockD1 = {} as unknown as D1Database;

      const formData = new FormData();
      formData.append('file', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }));
      formData.append('metadata', 'not valid json');

      const mockRequest = {
        formData: vi.fn(() => Promise.resolve(formData))
      } as unknown as Request;

      const event = {
        request: mockRequest,
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

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid metadata JSON');
    });
  });
});
