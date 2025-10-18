import type { RequestHandler } from './$types';
import { json, type NumericRange } from '@sveltejs/kit';

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

function errorResponse(message: string, status: NumericRange<400, 599>, logDetails?: string) {
  console.error(`${LOG_PREFIX} ${logDetails || message}`);
  return json({ success: false, error: message }, { status });
}

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  // Get authenticated context from locals (set by hooks)
  if (!locals.adminAuth) {
    return errorResponse('Unauthorized', 401, 'Admin authentication required');
  }

  const { username, identity } = locals.adminAuth;
  const { imageId } = params;

  console.log(
    `${LOG_PREFIX} Delete request from ${identity.type}: ${identity.clientId} for user ${username}, image ${imageId}`
  );

  // Validate imageId parameter
  if (!imageId || imageId.trim() === '') {
    return errorResponse('Invalid image ID', 400, 'Image ID must be provided');
  }

  // Verify platform environment
  if (!platform?.env) {
    return errorResponse('Platform not available', 500, 'Platform environment not available');
  }

  const { PCHRON_DB: db, CF_ACCOUNT_ID, CF_IMAGES_TOKEN } = platform.env;

  if (!db) {
    return errorResponse('Configuration error', 500, 'PCHRON_DB database binding not available');
  }

  if (!CF_ACCOUNT_ID || !CF_IMAGES_TOKEN) {
    return errorResponse('Configuration error', 500, 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN');
  }

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
        return errorResponse(
          'Forbidden',
          403,
          `Image ${imageId} belongs to different user: ${existsResult.username}`
        );
      }

      return errorResponse('Image not found', 404, `No image found with ID ${imageId}`);
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
      return errorResponse('Database error', 500, 'Failed to delete image from database');
    }

    console.log(`${LOG_PREFIX} Successfully deleted image ${imageId} from D1`);

    // Delete from Cloudflare Images
    let imagesWarning: string | undefined;

    try {
      const imagesApiUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${imageId}`;

      console.log(`${LOG_PREFIX} Deleting from Cloudflare Images: ${imageId}`);

      const imagesResponse = await fetch(imagesApiUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CF_IMAGES_TOKEN}`
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
    return errorResponse(
      'Internal server error',
      500,
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
