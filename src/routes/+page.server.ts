import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { config, images } = await parent();

  return {
    config,
    images
  };
};
