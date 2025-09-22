import { PUBLIC_API_BASE, PUBLIC_USER_NAME } from '$env/static/public';

export interface UserConfig {
	imgBase: string;
	imgVariant: string;
	userAvatar: string;
	userName: string;
}

export interface APIResponse {
	user: {
		name: string;
		avatar: {
			id: string;
			variant: string;
		};
	};
	config: {
		imageBase: string;
		imageVariant: string;
	};
	images: Array<{
		id: string;
		name: string;
		caption?: string;
		taken: string;
		uploaded: string;
	}>;
}

function extractUserFromDomain(hostname: string): string {
	if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
		return PUBLIC_USER_NAME || 'dev-user';
	}

	const parts = hostname.split('.');
	if (parts.length === 2) {
		return parts[0];
	}

	if (parts.length >= 3) {
		return parts[parts.length - 2];
	}

	return 'unknown-user';
}

export function getAPIEndpoint(hostname: string): string {
	const userName = extractUserFromDomain(hostname);
	const apiBase = PUBLIC_API_BASE || 'https://api.chronon.dev';
	return `${apiBase}/data/${userName}/content.json`;
}

export function getConfigFromAPIResponse(apiResponse: APIResponse): UserConfig {
	const { user, config } = apiResponse;

	return {
		imgBase: config.imageBase,
		imgVariant: config.imageVariant,
		userAvatar: `${config.imageBase}/${user.avatar.id}/${user.avatar.variant}`,
		userName: user.name
	};
}
