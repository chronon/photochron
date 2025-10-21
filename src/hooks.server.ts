import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { error } from '@sveltejs/kit';
import { getConfigFromKV } from '$lib/config';
import { extractAndValidateIdentity, checkAuthorization } from '$lib/auth';

// Admin authentication handle
const handleAdminAuth: Handle = async ({ event, resolve }) => {
  // Only apply to /admin/* routes
  if (!event.url.pathname.startsWith('/admin')) {
    return resolve(event);
  }

  // Verify platform environment
  if (!event.platform?.env?.PCHRON_KV) {
    console.error('[Admin Auth] Platform environment not available');
    throw error(500, 'Configuration error');
  }

  const { PCHRON_KV, CF_ACCESS_TEAM_DOMAIN, DEV_USER, DEV_CLIENT_ID } = event.platform.env;

  if (!CF_ACCESS_TEAM_DOMAIN) {
    console.error('[Admin Auth] CF_ACCESS_TEAM_DOMAIN not configured');
    throw error(500, 'Configuration error');
  }

  // Determine username from domain
  const hostWithoutPort = event.url.hostname.split(':')[0];
  let username: string;

  if (hostWithoutPort.startsWith('localhost')) {
    // Localhost bypass for development
    if (!DEV_USER) {
      console.error('[Admin Auth] DEV_USER not configured for localhost');
      throw error(500, 'Configuration error');
    }
    username = DEV_USER;
  } else {
    // Look up username from domain mapping in KV
    const usernameFromKV = await PCHRON_KV.get(`domain:${hostWithoutPort}`);
    if (!usernameFromKV) {
      console.error(`[Admin Auth] Domain not configured: ${hostWithoutPort}`);
      throw error(404, 'Domain not configured');
    }
    username = usernameFromKV;
  }

  // Extract and validate identity
  let identity;
  try {
    identity = extractAndValidateIdentity(event.request, CF_ACCESS_TEAM_DOMAIN);
  } catch (err) {
    console.error(`[Admin Auth] Authentication failed for ${username}:`, err);
    throw error(401, 'Unauthorized');
  }

  // Check authorization
  try {
    await checkAuthorization(identity, username, PCHRON_KV, DEV_CLIENT_ID);
  } catch (err) {
    console.error(`[Admin Auth] Authorization failed for ${username}:`, err);
    throw error(403, 'Forbidden');
  }

  console.log(
    `[Admin Auth] Success: type=${identity.type}, client=${identity.clientId}, user=${username}`
  );

  // Set authenticated context in locals for child routes
  event.locals.adminAuth = {
    username,
    identity
  };

  return resolve(event);
};

// Favicon redirect handle
export const handleFavicon: Handle = async ({ event, resolve }) => {
  const { url, platform } = event;

  const faviconMatch = url.pathname.match(
    /^\/(favicon-(\d+)x\d+\.png|apple-touch-icon\.png|favicon\.ico)$/
  );

  if (faviconMatch) {
    try {
      if (!platform?.env?.PCHRON_KV) {
        throw new Error('KV namespace not available');
      }

      const kvConfig = await getConfigFromKV(
        platform.env.PCHRON_KV,
        url.hostname,
        platform.env.DEV_USER
      );
      const { global, user } = kvConfig;

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

      const faviconUrl = `${global.imageBase}/${user.avatar.id}/${variant}`;

      return new Response(null, {
        status: 302,
        headers: {
          Location: faviconUrl,
          'Cache-Control': 'public, max-age=3600'
        }
      });
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

// Combine all handles in sequence
export const handle = sequence(handleAdminAuth, handleFavicon);
