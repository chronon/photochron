import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractUserFromDomain } from '$lib/config';

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env?.chrononagram) {
    return json({ error: 'D1 database not available' }, { status: 500 });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Extract username from domain
  const username = extractUserFromDomain(url.hostname, platform.env.DEV_USER);

  try {
    // Query for 6 images to determine if there are more
    const result = await platform.env.chrononagram
      .prepare('SELECT * FROM images WHERE username = ? ORDER BY uploaded DESC LIMIT 6 OFFSET ?')
      .bind(username, offset)
      .all();

    // Return only 5 images
    const images = result.results.slice(0, 5);
    const hasMore = result.results.length === 6;

    return json({ images, hasMore });
  } catch (error) {
    console.error('Failed to fetch images from D1:', error);
    return json({ error: 'Failed to fetch images' }, { status: 500 });
  }
};
