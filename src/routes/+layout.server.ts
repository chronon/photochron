import type { LayoutServerLoad } from './$types';
import { getAPIEndpoint, getConfigFromAPIResponse } from '$lib/config';

export const load: LayoutServerLoad = async ({ url }) => {
  const apiEndpoint = getAPIEndpoint(url.hostname);

  let apiResponse;
  try {
    const response = await fetch(apiEndpoint, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
    apiResponse = await response.json();
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
