import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const PAGE_SIZE = 15;

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env?.PCHRON_DB) {
    return json({ error: 'D1 database not available' }, { status: 500 });
  }

  if (!platform?.env?.PCHRON_KV) {
    return json({ error: 'KV namespace not available' }, { status: 500 });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Determine username from domain
  const hostWithoutPort = url.hostname.split(':')[0];
  let username: string;

  if (hostWithoutPort.startsWith('localhost')) {
    // Localhost bypass for development
    if (!platform.env.DEV_USER) {
      return json({ error: 'DEV_USER not configured' }, { status: 500 });
    }
    username = platform.env.DEV_USER;
  } else {
    // Look up username from domain mapping in KV
    const usernameFromKV = await platform.env.PCHRON_KV.get(`domain:${hostWithoutPort}`);
    if (!usernameFromKV) {
      return json({ error: 'Domain not configured' }, { status: 404 });
    }
    username = usernameFromKV;
  }

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
