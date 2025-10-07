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

describe('admin/api/upload/+server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('successfully uploads image and saves to D1', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: ['client-123']
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

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
        formData: vi.fn(() => Promise.resolve(formData)),
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'Cf-Access-Client-Id') return 'client-123';
            return null;
          })
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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
      expect(mockKV.get).toHaveBeenCalledWith('user:johndoe');
    });

    it('rejects request without platform environment', async () => {
      const event = {
        request: {} as Request,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: undefined
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Platform not available');
    });

    it('rejects request without KV namespace', async () => {
      const event = {
        request: {} as Request,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {}
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Configuration error');
    });

    it('rejects request without Cloudflare Access headers', async () => {
      const mockKV = {} as unknown as KVNamespace;
      const mockD1 = {} as unknown as D1Database;

      const mockRequest = {
        headers: {
          get: vi.fn(() => null)
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized: Missing Access headers');
    });

    it('rejects request from unauthorized client', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: ['client-456']
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const mockD1 = {} as unknown as D1Database;

      const mockRequest = {
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'Cf-Access-Client-Id') return 'client-123';
            return null;
          })
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123',
            DEV_USER: 'dev'
          }
        }
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized: Client not authorized for this user');
    });

    it('rejects file with invalid extension', async () => {
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: ['client-123']
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

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
        formData: vi.fn(() => Promise.resolve(formData)),
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'Cf-Access-Client-Id') return 'client-123';
            return null;
          })
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: ['client-123']
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

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
        formData: vi.fn(() => Promise.resolve(formData)),
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'Cf-Access-Client-Id') return 'client-123';
            return null;
          })
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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
      const mockKV = {
        get: vi.fn((key: string) => {
          if (key === 'user:johndoe') {
            return Promise.resolve(
              JSON.stringify({
                domain: 'johndoe.com',
                profile: { name: 'John Doe' },
                avatar: { id: 'avatar-123', variant: 'profile' },
                authorized_client_ids: ['client-123']
              })
            );
          }
          return Promise.resolve(null);
        })
      } as unknown as KVNamespace;

      const mockD1 = {} as unknown as D1Database;

      const formData = new FormData();
      formData.append('file', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }));
      formData.append('metadata', 'not valid json');

      const mockRequest = {
        formData: vi.fn(() => Promise.resolve(formData)),
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'Cf-Access-Client-Id') return 'client-123';
            return null;
          })
        }
      } as unknown as Request;

      const event = {
        request: mockRequest,
        url: new URL('https://johndoe.com/admin/api/upload'),
        platform: {
          env: {
            PCHRON_KV: mockKV,
            chrononagram: mockD1,
            CF_ACCOUNT_ID: 'account-123',
            CF_IMAGES_TOKEN: 'token-123'
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
