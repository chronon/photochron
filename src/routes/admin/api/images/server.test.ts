import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:workers';
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

      Object.assign(env, {
        PCHRON_DB: mockD1,
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: mockRequest,
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
      Object.assign(env, {
        PCHRON_DB: {} as D1Database,
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: {} as Request,
        locals: {} // No adminAuth
      } as unknown as Parameters<RequestHandler>[0];

      const response = await POST(event);
      const json = (await response.json()) as UploadResponse;

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('rejects request without D1 database', async () => {
      Object.assign(env, {
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: {} as Request,
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

      Object.assign(env, {
        PCHRON_DB: mockD1,
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: mockRequest,
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

      // Create a file larger than 20MB
      const largeFile = new File([new ArrayBuffer(20_000_001)], 'large.jpg', {
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

      Object.assign(env, {
        PCHRON_DB: mockD1,
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: mockRequest,
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

      Object.assign(env, {
        PCHRON_DB: mockD1,
        CF_ACCOUNT_ID: 'account-123',
        CF_IMAGES_TOKEN: 'token-123'
      });

      const event = {
        request: mockRequest,
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

    describe('oversized files', () => {
      const OVER_STORED_LIMIT = 10_000_001;

      function createEvent(file: File, metadata = '{"name":"vacation","captured":"2025-01-01"}') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', metadata);

        return {
          request: { formData: vi.fn(() => Promise.resolve(formData)) } as unknown as Request,
          locals: {
            adminAuth: {
              username: 'johndoe',
              identity: { type: 'service_token' as const, clientId: 'client-123' }
            }
          }
        } as unknown as Parameters<RequestHandler>[0];
      }

      function createImagesMock(output: () => Promise<unknown>) {
        const transform = vi.fn(() => ({ output: vi.fn(output) }));
        const input = vi.fn(() => ({ transform }));
        return { images: { input } as unknown as ImagesBinding, input, transform };
      }

      function resizedOutput() {
        return Promise.resolve({
          image: () => new Blob(['resized']).stream(),
          contentType: () => 'image/jpeg'
        });
      }

      function setupEnv(images?: ImagesBinding) {
        const mockD1 = {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({ run: vi.fn(() => Promise.resolve({ success: true })) }))
          }))
        } as unknown as D1Database;

        Object.assign(env, {
          PCHRON_DB: mockD1,
          CF_ACCOUNT_ID: 'account-123',
          CF_IMAGES_TOKEN: 'token-123',
          ...(images && { IMAGES: images })
        });

        vi.mocked(fetch).mockResolvedValue(
          new Response(JSON.stringify({ success: true, result: { id: 'img-123' } }), {
            status: 200
          })
        );

        return mockD1;
      }

      function uploadedFile(): File {
        const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
        return body.get('file') as File;
      }

      it('forwards files at the storage limit without resizing', async () => {
        const { images, input } = createImagesMock(resizedOutput);
        setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(10_000_000)], 'photo.jpg', { type: 'image/jpeg' }))
        );

        expect(response.status).toBe(200);
        expect(input).not.toHaveBeenCalled();
        expect(uploadedFile().size).toBe(10_000_000);
      });

      it('resizes files over the storage limit before uploading', async () => {
        const { images, input, transform } = createImagesMock(resizedOutput);
        setupEnv(images);

        const response = await POST(
          createEvent(
            new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'photo.jpg', { type: 'image/jpeg' })
          )
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(200);
        expect(input).toHaveBeenCalledOnce();
        expect(transform).toHaveBeenCalledWith({ width: 4096, height: 4096, fit: 'scale-down' });
        const output = transform.mock.results[0].value.output;
        expect(output).toHaveBeenCalledWith({ format: 'image/jpeg', quality: 90 });
        expect(uploadedFile().name).toBe('johndoe_vacation.jpg');
        expect(uploadedFile().type).toBe('image/jpeg');
        expect(await uploadedFile().text()).toBe('resized');
        expect(json.filename).toBe('johndoe_vacation.jpg');
      });

      it('stores resized HEIC files as JPEG', async () => {
        const { images } = createImagesMock(resizedOutput);
        setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'IMG_0052.heic'))
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(200);
        expect(uploadedFile().name).toBe('johndoe_vacation.jpg');
        expect(json.filename).toBe('johndoe_vacation.jpg');
      });

      it('rejects GIF files over the storage limit without resizing', async () => {
        const { images, input } = createImagesMock(resizedOutput);
        setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'anim.gif'))
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(400);
        expect(json.error).toBe('File too large: 10.01 MB. Maximum: 10 MB');
        expect(input).not.toHaveBeenCalled();
      });

      it('validates metadata before resizing', async () => {
        const { images, input } = createImagesMock(resizedOutput);
        setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'photo.jpg'), 'not json')
        );

        expect(response.status).toBe(400);
        expect(input).not.toHaveBeenCalled();
      });

      it('returns configuration error when the IMAGES binding is missing', async () => {
        setupEnv();

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'photo.jpg'))
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(500);
        expect(json.error).toBe('Configuration error');
        expect(fetch).not.toHaveBeenCalled();
      });

      it('rejects files the Images binding cannot decode', async () => {
        const { images } = createImagesMock(() =>
          Promise.reject(Object.assign(new Error('not an image'), { code: 9412 }))
        );
        const mockD1 = setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'photo.jpg'))
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(400);
        expect(json.error).toBe('Invalid image file');
        expect(fetch).not.toHaveBeenCalled();
        expect(mockD1.prepare).not.toHaveBeenCalled();
      });

      it('returns 500 when resizing fails', async () => {
        const { images } = createImagesMock(() => Promise.reject(new Error('service down')));
        const mockD1 = setupEnv(images);

        const response = await POST(
          createEvent(new File([new ArrayBuffer(OVER_STORED_LIMIT)], 'photo.jpg'))
        );
        const json = (await response.json()) as UploadResponse;

        expect(response.status).toBe(500);
        expect(json.error).toBe('Failed to process image');
        expect(fetch).not.toHaveBeenCalled();
        expect(mockD1.prepare).not.toHaveBeenCalled();
      });
    });
  });
});
