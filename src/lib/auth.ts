import type { UserKVConfig } from './config';

export interface AuthenticatedIdentity {
  type: 'service_token';
  clientId: string; // Service token ID
}

interface AccessJWTPayload {
  common_name?: string; // Service token client ID
  iss?: string; // Issuer (Access team domain)
  exp?: number; // Expiration timestamp (Unix seconds)
  aud?: string[]; // Audience
}

/**
 * Extracts and validates identity from Cloudflare Access headers.
 *
 * SECURITY: This function assumes Cloudflare Access is properly configured.
 * We validate basic JWT claims (expiration, issuer) but trust that Access
 * issued the token (no signature validation).
 */
export function extractAndValidateIdentity(
  request: Request,
  expectedIssuer: string
): AuthenticatedIdentity {
  // Development bypass - when expectedIssuer is 'dev', skip Access validation
  if (expectedIssuer === 'dev') {
    const devClientId = request.headers.get('X-Dev-Client-Id') || 'dev-client-id';
    console.log('[Auth] Using development bypass with client:', devClientId);
    return {
      type: 'service_token',
      clientId: devClientId
    };
  }

  // Check for service token header (direct client ID)
  const clientId = request.headers.get('Cf-Access-Client-Id');
  if (clientId) {
    return {
      type: 'service_token',
      clientId
    };
  }

  // Check for JWT assertion (service token)
  const jwtAssertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwtAssertion) {
    throw new Error('Missing Access authentication headers');
  }

  // Parse JWT payload (no signature validation - we trust Access)
  let payload: AccessJWTPayload;
  try {
    payload = JSON.parse(atob(jwtAssertion.split('.')[1]));
  } catch {
    throw new Error('Invalid JWT format');
  }

  // Validate expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  // Validate issuer
  if (payload.iss && payload.iss !== expectedIssuer) {
    throw new Error(`Invalid issuer: expected ${expectedIssuer}, got ${payload.iss}`);
  }

  // Extract service token client ID
  if (!payload.common_name) {
    throw new Error('Service token missing common_name');
  }

  return {
    type: 'service_token',
    clientId: payload.common_name
  };
}

/**
 * Checks if authenticated identity is authorized for the given user.
 */
export async function checkAuthorization(
  identity: AuthenticatedIdentity,
  username: string,
  kv: KVNamespace,
  devClientId?: string
): Promise<void> {
  // Development bypass - allow if client ID matches DEV_CLIENT_ID env var
  if (devClientId && identity.clientId === devClientId) {
    console.log('[Auth] Using dev client ID bypass for authorization');
    return;
  }

  const userConfigJson = await kv.get(`user:${username}`);

  if (!userConfigJson) {
    throw new Error(`User not found: ${username}`);
  }

  const userConfig = JSON.parse(userConfigJson) as UserKVConfig;

  if (!userConfig.authorized_client_ids.includes(identity.clientId)) {
    throw new Error(`Client ${identity.clientId} not authorized for user ${username}`);
  }
}
