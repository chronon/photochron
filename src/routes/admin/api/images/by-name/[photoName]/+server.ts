import type { RequestHandler } from './$types';
import { json, type NumericRange } from '@sveltejs/kit';

interface ImageRecord {
  id: string;
  name: string;
  captured: string;
  uploaded: string;
}

const LOG_PREFIX = '[Lookup]';

function errorResponse(message: string, status: NumericRange<400, 599>, logDetails?: string) {
  console.error(`${LOG_PREFIX} ${logDetails || message}`);
  return json({ error: message }, { status });
}

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // Get authenticated context from locals (set by hooks)
  if (!locals.adminAuth) {
    return errorResponse('Unauthorized', 401, 'Admin authentication required');
  }

  const { username, identity } = locals.adminAuth;
  const { photoName } = params;

  // Normalize photo name (trim whitespace)
  const normalizedName = photoName.trim();

  console.log(
    `${LOG_PREFIX} Lookup request from ${identity.type}: ${identity.clientId} for user ${username}, photo name: ${normalizedName}`
  );

  // Validate photoName parameter
  if (!normalizedName) {
    return errorResponse('Invalid photo name', 400, 'Photo name must be provided');
  }

  // Verify platform environment
  if (!platform?.env) {
    return errorResponse('Platform not available', 500, 'Platform environment not available');
  }

  const { PCHRON_DB: db } = platform.env;

  if (!db) {
    return errorResponse('Configuration error', 500, 'PCHRON_DB database binding not available');
  }

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
      return errorResponse('Image not found', 404, `No image found with name: ${normalizedName}`);
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
    return errorResponse(
      'Internal server error',
      500,
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
