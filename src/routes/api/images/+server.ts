import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { getUsernameFromDomain } from '#lib/config.js';

const PAGE_SIZE = 15;

export const GET: RequestHandler = async ({ url }) => {
  if (!env.PCHRON_DB) {
    return Response.json({ error: 'D1 database not available' }, { status: 500 });
  }

  if (!env.PCHRON_KV) {
    return Response.json({ error: 'KV namespace not available' }, { status: 500 });
  }

  const before = url.searchParams.get('before');
  const beforeId = url.searchParams.get('id');

  let username: string;
  try {
    username = await getUsernameFromDomain(env.PCHRON_KV, url.hostname, env.DEV_USER);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to determine username:', errorMessage);
    if (errorMessage.includes('DEV_USER')) {
      return Response.json({ error: 'Configuration error' }, { status: 500 });
    }
    return Response.json({ error: 'Domain not configured' }, { status: 404 });
  }

  try {
    const statement =
      before && beforeId
        ? env.PCHRON_DB.prepare(
            'SELECT * FROM images WHERE username = ? AND (captured < ? OR (captured = ? AND id < ?)) ORDER BY captured DESC, id DESC LIMIT ?'
          ).bind(username, before, before, beforeId, PAGE_SIZE + 1)
        : env.PCHRON_DB.prepare(
            'SELECT * FROM images WHERE username = ? ORDER BY captured DESC, id DESC LIMIT ?'
          ).bind(username, PAGE_SIZE + 1);

    const result = await statement.all();

    const images = result.results.slice(0, PAGE_SIZE);
    const hasMore = result.results.length > PAGE_SIZE;

    return Response.json({ images, hasMore });
  } catch (error) {
    console.error('Failed to fetch images from D1:', error);
    return Response.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
};
