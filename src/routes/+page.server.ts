import type { PageServerLoad } from './$types';
import { PUBLIC_IMG_SOURCE } from '$env/static/public';

const imgSource: string = PUBLIC_IMG_SOURCE;

export const load: PageServerLoad = async () => {
	return {
		images: await fetch(imgSource, {
			method: 'GET'
		}).then((response) => response.json())
	};
};
