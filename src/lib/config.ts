import {
	PUBLIC_IMG_BASE,
	PUBLIC_API_BASE,
	PUBLIC_IMG_VARIANT,
	PUBLIC_USER_NAME
} from '$env/static/public';

export interface UserConfig {
	imgBase: string;
	imgSource: string;
	imgVariant: string;
	userAvatar: string;
	userName: string;
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

export function getConfigForDomain(hostname: string, env?: Record<string, string>): UserConfig {
	const userName = extractUserFromDomain(hostname);
	const imgBase = PUBLIC_IMG_BASE || 'https://imagedelivery.net/ACCOUNT_HASH';
	const apiBase = PUBLIC_API_BASE || 'https://api.chronon.dev';
	const imgVariant = PUBLIC_IMG_VARIANT || 'default';

	const avatarVarName = `${userName.toUpperCase()}_AVATAR`;
	const userAvatarPath = env?.[avatarVarName] || `${userName}-avatar/${imgVariant}`;

	return {
		imgBase,
		imgSource: `${apiBase}/data/${userName}/images.json`,
		imgVariant,
		userAvatar: `${imgBase}/${userAvatarPath}`,
		userName
	};
}
