import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createErrorResponse, validateAuth, validatePlatformEnv } from '$lib/admin-utils';

interface ImageRecord {
  id: string;
  username: string;
  name: string;
}

interface CloudflareImagesDeleteResponse {
  result: Record<string, unknown>;
  success: boolean;
  errors: Array<{ message: string }>;
  messages: unknown[];
}

const LOG_PREFIX = '[Delete]';

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  // Validate authentication
  const authResult = validateAuth(locals, LOG_PREFIX);
  if (!authResult.valid) return authResult.response;
  const { username, identity } = authResult;

  const { imageId } = params;

  console.log(
    `${LOG_PREFIX} Delete request from ${identity.type}: ${identity.clientId} for user ${username}, image ${imageId}`
  );

  // Validate imageId parameter
  if (!imageId || imageId.trim() === '') {
    return createErrorResponse(LOG_PREFIX, 'Invalid image ID', 400, 'Image ID must be provided');
  }

  // Validate platform environment
  const envResult = validatePlatformEnv(platform, LOG_PREFIX, ['CF_ACCOUNT_ID', 'CF_IMAGES_TOKEN']);
  if (!envResult.valid) return envResult.response;
  const { db, env } = envResult;
  const { CF_ACCOUNT_ID, CF_IMAGES_TOKEN } = env;

  try {
    // Verify image exists and belongs to this user
    const verifyResult = await db
      .prepare('SELECT id, username, name FROM images WHERE id = ? AND username = ?')
      .bind(imageId, username)
      .first<ImageRecord>();

    if (!verifyResult) {
      // Check if image exists at all (might belong to different user)
      const existsResult = await db
        .prepare('SELECT id, username FROM images WHERE id = ?')
        .bind(imageId)
        .first<ImageRecord>();

      if (existsResult) {
        console.warn(
          `${LOG_PREFIX} User ${username} attempted to delete image ${imageId} owned by ${existsResult.username}`
        );
        return createErrorResponse(
          LOG_PREFIX,
          'Forbidden',
          403,
          `Image ${imageId} belongs to different user: ${existsResult.username}`
        );
      }

      return createErrorResponse(
        LOG_PREFIX,
        'Image not found',
        404,
        `No image found with ID ${imageId}`
      );
    }

    console.log(
      `${LOG_PREFIX} Verified image ${imageId} belongs to ${username}, name: ${verifyResult.name}`
    );

    // Delete from D1 database
    const deleteResult = await db
      .prepare('DELETE FROM images WHERE id = ? AND username = ?')
      .bind(imageId, username)
      .run();

    if (!deleteResult.success) {
      console.error(`${LOG_PREFIX} D1 deletion failed:`, deleteResult.error);
      return createErrorResponse(
        LOG_PREFIX,
        'Database error',
        500,
        'Failed to delete image from database'
      );
    }

    console.log(`${LOG_PREFIX} Successfully deleted image ${imageId} from D1`);

    // Delete from Cloudflare Images
    let imagesWarning: string | undefined;

    try {
      const imagesApiUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID as string}/images/v1/${imageId}`;

      console.log(`${LOG_PREFIX} Deleting from Cloudflare Images: ${imageId}`);

      const imagesResponse = await fetch(imagesApiUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CF_IMAGES_TOKEN as string}`
        }
      });

      const imagesResult = (await imagesResponse.json()) as CloudflareImagesDeleteResponse;

      if (!imagesResponse.ok || !imagesResult.success) {
        const errorMessage = imagesResult.errors?.[0]?.message || imagesResponse.statusText;
        console.error(`${LOG_PREFIX} Cloudflare Images deletion failed:`, {
          imageId,
          username,
          status: imagesResponse.status,
          error: errorMessage
        });
        imagesWarning = `Failed to delete from storage: ${errorMessage}`;
      } else {
        console.log(`${LOG_PREFIX} Successfully deleted image ${imageId} from Cloudflare Images`);
      }
    } catch (imagesError) {
      console.error(`${LOG_PREFIX} Cloudflare Images deletion exception:`, {
        imageId,
        username,
        error: imagesError
      });
      imagesWarning = `Failed to delete from storage: ${imagesError instanceof Error ? imagesError.message : 'Unknown error'}`;
    }

    // Return success response
    return json(
      {
        success: true,
        imageId,
        message: imagesWarning ? 'Image deleted from database' : 'Image deleted successfully',
        ...(imagesWarning && { warning: imagesWarning })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error during deletion:`, {
      imageId,
      username,
      error
    });
    return createErrorResponse(
      LOG_PREFIX,
      'Internal server error',
      500,
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
