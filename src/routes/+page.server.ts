import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { config, apiResponse } = await parent();

	return {
		config,
		images: apiResponse?.images || []
	};
};
