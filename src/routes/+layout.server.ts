import type { LayoutServerLoad } from './$types';
import { getAPIEndpoint, getConfigFromAPIResponse } from '$lib/config';

export const load: LayoutServerLoad = async ({ url }) => {
	const apiEndpoint = getAPIEndpoint(url.hostname);

	const apiResponse = await fetch(apiEndpoint, {
		method: 'GET'
	}).then((response) => response.json());

	const config = getConfigFromAPIResponse(apiResponse);

	return {
		config,
		apiResponse
	};
};
