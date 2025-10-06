import type { LayoutServerLoad } from './$types';
import { getConfigFromKV } from '$lib/config';

const PAGE_SIZE = 5;

export const load: LayoutServerLoad = async ({ url, platform }) => {
  if (!platform?.env?.CHRONONAGRAM) {
    throw new Error('KV namespace not available. Please run with `wrangler dev` or `pnpm dev`.');
  }

  if (!platform?.env?.chrononagram) {
    throw new Error('D1 database not available. Please run with `wrangler dev` or `pnpm dev`.');
  }

  const kvConfig = await getConfigFromKV(
    platform.env.CHRONONAGRAM,
    url.hostname,
    platform.env.DEV_USER
  );
  const { global, user, username } = kvConfig;

  let images: Array<{
    id: string;
    name: string;
    caption?: string;
    captured: string;
    uploaded: string;
  }>;

  try {
    const result = await platform.env.chrononagram
      .prepare('SELECT * FROM images WHERE username = ? ORDER BY uploaded DESC LIMIT ?')
      .bind(username, PAGE_SIZE)
      .all();

    images = result.results as typeof images;
  } catch (error) {
    console.error('Failed to fetch images from D1:', error);
    throw error;
  }

  const config = {
    imgBase: global.imageBase,
    imgVariant: global.imageVariant,
    userAvatar: `${global.imageBase}/${user.avatar.id}/${user.avatar.variant}`,
    userName: user.profile.name
  };

  return {
    config,
    images,
    username
  };
};
