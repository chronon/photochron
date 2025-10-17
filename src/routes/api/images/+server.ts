import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractUserFromDomain } from '$lib/config';

const PAGE_SIZE = 5;

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env?.PCHRON_DB) {
    return json({ error: 'D1 database not available' }, { status: 500 });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Extract username from domain
  const username = extractUserFromDomain(url.hostname, platform.env.DEV_USER);

  try {
    // Query for PAGE_SIZE + 1 to determine if there are more
    const result = await platform.env.PCHRON_DB.prepare(
      'SELECT * FROM images WHERE username = ? ORDER BY captured DESC LIMIT ? OFFSET ?'
    )
      .bind(username, PAGE_SIZE + 1, offset)
      .all();

    // Return only PAGE_SIZE images
    const images = result.results.slice(0, PAGE_SIZE);
    const hasMore = result.results.length > PAGE_SIZE;

    return json({ images, hasMore });
  } catch (error) {
    console.error('Failed to fetch images from D1:', error);
    return json({ error: 'Failed to fetch images' }, { status: 500 });
  }
};
