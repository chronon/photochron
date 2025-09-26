import type { Handle } from '@sveltejs/kit';
import { getAPIEndpoint, getConfigFromAPIResponse } from '$lib/config';

export const handle: Handle = async ({ event, resolve }) => {
  const { url } = event;

  const faviconMatch = url.pathname.match(
    /^\/(favicon-(\d+)x\d+\.png|apple-touch-icon\.png|favicon\.ico)$/
  );

  if (faviconMatch) {
    try {
      const apiEndpoint = getAPIEndpoint(url.hostname);
      const response = await fetch(apiEndpoint);

      if (response.ok) {
        const apiResponse = await response.json();
        const config = getConfigFromAPIResponse(apiResponse);

        let variant: string;
        if (url.pathname === '/apple-touch-icon.png') {
          variant = 'apple180';
        } else if (url.pathname === '/favicon.ico') {
          variant = 'favicon32';
        } else if (faviconMatch[2]) {
          variant = `favicon${faviconMatch[2]}`;
        } else {
          variant = 'favicon32';
        }

        const faviconUrl = `${config.imgBase}/${apiResponse.user.avatar.id}/${variant}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: faviconUrl,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    } catch (error) {
      console.error('Favicon redirect failed:', error);
      const fallbackMap = {
        '/apple-touch-icon.png': '/fallback-apple-touch-icon.png',
        '/favicon-32x32.png': '/fallback-favicon-32x32.png',
        '/favicon-16x16.png': '/fallback-favicon-16x16.png',
        '/favicon.ico': '/fallback-favicon-32x32.png'
      };
      const fallbackUrl = fallbackMap[url.pathname as keyof typeof fallbackMap];
      if (fallbackUrl) {
        return new Response(null, {
          status: 302,
          headers: { Location: fallbackUrl }
        });
      }
    }
  }

  return resolve(event);
};
