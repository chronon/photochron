import type { LayoutServerLoad } from './$types';
import { getConfigForDomain } from '$lib/config';

export const load: LayoutServerLoad = async ({ url, platform }) => {
	const config = getConfigForDomain(
		url.hostname,
		(platform as { env?: Record<string, string> })?.env
	);

	return {
		config
	};
};
