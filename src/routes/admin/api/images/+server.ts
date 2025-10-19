import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createErrorResponse, validateAuth, validatePlatformEnv } from '$lib/admin-utils';

interface ImageMetadata {
  name: string;
  caption?: string;
  captured: string;
}

interface CloudflareImagesUploadResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  success: boolean;
  errors: unknown[];
  messages: unknown[];
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'] as const;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const LOG_PREFIX = '[Upload]';

function validateMetadata(
  metadataStr: string
): { valid: true; data: ImageMetadata } | { valid: false; error: string } {
  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataStr);
  } catch {
    return { valid: false, error: 'Invalid metadata JSON' };
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { valid: false, error: 'Metadata must be an object' };
  }

  const data = metadata as Record<string, unknown>;

  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Missing or invalid name in metadata' };
  }

  if (!data.captured || typeof data.captured !== 'string') {
    return { valid: false, error: 'Missing or invalid captured date in metadata' };
  }

  if (isNaN(Date.parse(data.captured))) {
    return { valid: false, error: 'Invalid captured date format (expected ISO8601)' };
  }

  if (data.caption !== undefined && typeof data.caption !== 'string') {
    return { valid: false, error: 'Invalid caption type in metadata' };
  }

  return {
    valid: true,
    data: {
      name: data.name,
      caption: data.caption as string | undefined,
      captured: data.captured
    }
  };
}

function validateFile(file: File): { valid: true } | { valid: false; error: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (
    !extension ||
    !ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
  ) {
    return {
      valid: false,
      error: `Invalid file extension: ${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: ${MAX_FILE_SIZE_MB} MB`
    };
  }

  return { valid: true };
}

async function uploadToCloudflareImages(
  file: File,
  username: string,
  metadata: ImageMetadata,
  uploadedTimestamp: string,
  accountId: string,
  token: string
): Promise<
  { success: true; imageId: string; filename: string } | { success: false; error: string }
> {
  // Extension is guaranteed to exist by validateFile()
  const extension = file.name.split('.').pop()!.toLowerCase();
  // Sanitize name to prevent special characters or path traversal
  const safeName = metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const customFilename = `${username}_${safeName}.${extension}`;

  const renamedFile = new File([await file.arrayBuffer()], customFilename, { type: file.type });

  const augmentedMetadata = {
    ...metadata,
    username,
    uploaded: uploadedTimestamp
  };

  const cfImagesUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
  const cfFormData = new FormData();
  cfFormData.append('file', renamedFile);
  cfFormData.append('metadata', JSON.stringify(augmentedMetadata));

  console.log(`${LOG_PREFIX} Uploading to Cloudflare Images with filename: ${customFilename}`);

  let cfResponse: Response;
  try {
    cfResponse = await fetch(cfImagesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: cfFormData
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to connect to Cloudflare Images API:`, error);
    return { success: false, error: 'Failed to upload image' };
  }

  if (!cfResponse.ok) {
    const errorText = await cfResponse.text();
    console.error(`${LOG_PREFIX} Cloudflare Images API error (${cfResponse.status}):`, errorText);
    return { success: false, error: `Image upload failed: ${cfResponse.statusText}` };
  }

  const cfResult = (await cfResponse.json()) as CloudflareImagesUploadResponse;

  if (!cfResult.success || !cfResult.result?.id) {
    console.error(`${LOG_PREFIX} No image ID returned from Cloudflare Images API`);
    return { success: false, error: 'Invalid response from image service' };
  }

  const imageId = cfResult.result.id;

  console.log(
    `${LOG_PREFIX} Successfully uploaded to Cloudflare Images. ID: ${imageId}, Filename: ${customFilename}`
  );

  return { success: true, imageId, filename: customFilename };
}

async function saveImageMetadata(
  db: D1Database,
  imageId: string,
  username: string,
  metadata: ImageMetadata,
  uploadedTimestamp: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const insertResult = await db
      .prepare(
        'INSERT INTO images (id, username, name, caption, captured, uploaded) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(
        imageId,
        username,
        metadata.name,
        metadata.caption || null,
        metadata.captured,
        uploadedTimestamp
      )
      .run();

    if (!insertResult.success) {
      console.error(`${LOG_PREFIX} D1 insert failed:`, insertResult.error);
      console.error(`${LOG_PREFIX} ORPHANED IMAGE: ${imageId} needs manual cleanup`);
      return { success: false, error: 'Failed to save image metadata' };
    }

    console.log(`${LOG_PREFIX} Successfully saved metadata to D1 for image ${imageId}`);
    return { success: true };
  } catch (error) {
    console.error(`${LOG_PREFIX} D1 insert error:`, error);
    console.error(`${LOG_PREFIX} ORPHANED IMAGE: ${imageId} needs manual cleanup`);
    return { success: false, error: 'Failed to save image metadata' };
  }
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Validate authentication
  const authResult = validateAuth(locals, LOG_PREFIX);
  if (!authResult.valid) return authResult.response;
  const { username, identity } = authResult;

  console.log(
    `${LOG_PREFIX} Upload request from ${identity.type}: ${identity.clientId} for user ${username}`
  );

  // Validate platform environment
  const envResult = validatePlatformEnv(platform, LOG_PREFIX, ['CF_ACCOUNT_ID', 'CF_IMAGES_TOKEN']);
  if (!envResult.valid) return envResult.response;
  const { db, env } = envResult;
  const { CF_ACCOUNT_ID, CF_IMAGES_TOKEN } = env;

  // Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    return createErrorResponse(
      LOG_PREFIX,
      'Invalid form data',
      400,
      `Failed to parse form data: ${error}`
    );
  }

  // Extract and validate file
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return createErrorResponse(LOG_PREFIX, 'Missing or invalid file', 400);
  }

  const fileValidation = validateFile(file);
  if (!fileValidation.valid) {
    return createErrorResponse(LOG_PREFIX, fileValidation.error, 400);
  }

  console.log(
    `${LOG_PREFIX} Received file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`
  );

  // Extract and validate metadata
  const metadataStr = formData.get('metadata');
  if (!metadataStr || typeof metadataStr !== 'string') {
    return createErrorResponse(LOG_PREFIX, 'Missing or invalid metadata', 400);
  }

  const metadataValidation = validateMetadata(metadataStr);
  if (!metadataValidation.valid) {
    return createErrorResponse(LOG_PREFIX, metadataValidation.error, 400);
  }

  const metadata = metadataValidation.data;
  console.log(
    `${LOG_PREFIX} Metadata validated: name=${metadata.name}, captured=${metadata.captured}`
  );

  // Upload to Cloudflare Images
  const uploadedTimestamp = new Date().toISOString();
  const uploadResult = await uploadToCloudflareImages(
    file,
    username,
    metadata,
    uploadedTimestamp,
    CF_ACCOUNT_ID as string,
    CF_IMAGES_TOKEN as string
  );

  if (!uploadResult.success) {
    return createErrorResponse(LOG_PREFIX, uploadResult.error, 500);
  }

  // Save metadata to D1
  const saveResult = await saveImageMetadata(
    db,
    uploadResult.imageId,
    username,
    metadata,
    uploadedTimestamp
  );

  if (!saveResult.success) {
    return createErrorResponse(LOG_PREFIX, saveResult.error, 500);
  }

  // Return success
  return json({
    success: true,
    id: uploadResult.imageId,
    filename: uploadResult.filename,
    uploaded: uploadedTimestamp
  });
};
