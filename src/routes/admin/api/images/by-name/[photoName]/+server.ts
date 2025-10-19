import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createErrorResponse, validateAuth, validatePlatformEnv } from '$lib/admin-utils';

interface ImageRecord {
  id: string;
  name: string;
  captured: string;
  uploaded: string;
}

const LOG_PREFIX = '[Lookup]';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // Validate authentication
  const authResult = validateAuth(locals, LOG_PREFIX);
  if (!authResult.valid) return authResult.response;
  const { username, identity } = authResult;

  const { photoName } = params;

  // Normalize photo name (trim whitespace)
  const normalizedName = photoName.trim();

  console.log(
    `${LOG_PREFIX} Lookup request from ${identity.type}: ${identity.clientId} for user ${username}, photo name: ${normalizedName}`
  );

  // Validate photoName parameter
  if (!normalizedName) {
    return createErrorResponse(
      LOG_PREFIX,
      'Invalid photo name',
      400,
      'Photo name must be provided'
    );
  }

  // Validate platform environment
  const envResult = validatePlatformEnv(platform, LOG_PREFIX);
  if (!envResult.valid) return envResult.response;
  const { db } = envResult;

  try {
    // Query for image by name (case-insensitive), return most recent if multiple matches
    const result = await db
      .prepare(
        'SELECT id, name, captured, uploaded FROM images WHERE username = ? AND name = ? COLLATE NOCASE ORDER BY uploaded DESC LIMIT 1'
      )
      .bind(username, normalizedName)
      .first<ImageRecord>();

    if (!result) {
      console.log(`${LOG_PREFIX} No image found with name: ${normalizedName} for user ${username}`);
      return createErrorResponse(
        LOG_PREFIX,
        'Image not found',
        404,
        `No image found with name: ${normalizedName}`
      );
    }

    console.log(
      `${LOG_PREFIX} Found image ${result.id} for user ${username}, name: ${result.name}`
    );

    // Return image metadata
    return json(
      {
        id: result.id,
        name: result.name,
        captured: result.captured,
        uploaded: result.uploaded
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error during lookup:`, {
      photoName: normalizedName,
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
