import type { PageServerLoad } from './$types';
import { getConfigForDomain } from '$lib/config';

export const load: PageServerLoad = async ({ url, platform }) => {
	const config = getConfigForDomain(
		url.hostname,
		(platform as { env?: Record<string, string> })?.env
	);

	return {
		config,
		images: await fetch(config.imgSource, {
			method: 'GET'
		}).then((response) => response.json())
	};
};
