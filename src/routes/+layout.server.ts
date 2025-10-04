import type { LayoutServerLoad } from './$types';
import { getConfigFromKV } from '$lib/config';

export const load: LayoutServerLoad = async ({ url, platform }) => {
  if (!platform?.env?.CHRONONAGRAM) {
    throw new Error('KV namespace not available. Please run with `wrangler dev` or `pnpm dev`.');
  }

  const kvConfig = await getConfigFromKV(platform.env.CHRONONAGRAM, url.hostname);
  const { global, user, username } = kvConfig;

  const apiEndpoint = `${global.apiBase}/data/${username}/content.json`;
  let images: Array<{
    id: string;
    name: string;
    caption?: string;
    taken: string;
    uploaded: string;
  }>;

  try {
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as { images: typeof images };
    images = data.images;
  } catch (error) {
    console.error('Failed to fetch images from API:', error);
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
    images
  };
};
