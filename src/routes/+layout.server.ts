import type { LayoutServerLoad } from './$types';
import { getAPIEndpoint, getConfigFromAPIResponse } from '$lib/config';
import { apiCache } from '$lib/apiCache';

export const load: LayoutServerLoad = async ({ url }) => {
	const apiEndpoint = getAPIEndpoint(url.hostname);

	let apiResponse;
	try {
		apiResponse = await apiCache.get(apiEndpoint, async () => {
			const response = await fetch(apiEndpoint, { method: 'GET' });
			if (!response.ok) {
				throw new Error(
					`API request failed with status ${response.status}: ${response.statusText}`
				);
			}
			return response.json();
		});
	} catch (error) {
		console.error('Failed to fetch API config:', error);
		throw error;
	}

	const config = getConfigFromAPIResponse(apiResponse);

	return {
		config,
		apiResponse
	};
};
