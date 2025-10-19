import { json, type NumericRange } from '@sveltejs/kit';
import type { AuthenticatedIdentity } from './auth';

/**
 * Validation result types for type-safe error handling.
 */
export type ValidationSuccess<T> = { valid: true } & T;
export type ValidationFailure = { valid: false; response: Response };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Creates a standardized error response for admin endpoints.
 *
 * @param logPrefix - Prefix for console logging (e.g., '[Upload]')
 * @param message - User-facing error message
 * @param status - HTTP status code
 * @param logDetails - Optional detailed message for server logs
 */
export function createErrorResponse(
  logPrefix: string,
  message: string,
  status: NumericRange<400, 599>,
  logDetails?: string
): Response {
  console.error(`${logPrefix} ${logDetails || message}`);
  return json({ success: false, error: message }, { status });
}

/**
 * Validates authentication from request locals.
 *
 * @param locals - SvelteKit request locals
 * @param logPrefix - Prefix for console logging
 * @returns Validated username and identity, or error response
 */
export function validateAuth(
  locals: App.Locals,
  logPrefix: string
): ValidationResult<{ username: string; identity: AuthenticatedIdentity }> {
  if (!locals.adminAuth) {
    return {
      valid: false,
      response: createErrorResponse(logPrefix, 'Unauthorized', 401, 'Admin authentication required')
    };
  }
  return {
    valid: true,
    username: locals.adminAuth.username,
    identity: locals.adminAuth.identity
  };
}

/**
 * Validates platform environment and database binding.
 *
 * @param platform - SvelteKit platform object
 * @param logPrefix - Prefix for console logging
 * @param requiredBindings - Optional list of required env bindings to validate
 * @returns Validated database and environment, or error response
 */
export function validatePlatformEnv(
  platform: App.Platform | undefined,
  logPrefix: string,
  requiredBindings: string[] = []
): ValidationResult<{ db: D1Database; env: Record<string, unknown> }> {
  if (!platform?.env) {
    return {
      valid: false,
      response: createErrorResponse(
        logPrefix,
        'Platform not available',
        500,
        'Platform environment not available'
      )
    };
  }

  const { PCHRON_DB: db, ...env } = platform.env;

  if (!db) {
    return {
      valid: false,
      response: createErrorResponse(
        logPrefix,
        'Configuration error',
        500,
        'PCHRON_DB database binding not available'
      )
    };
  }

  // Check required bindings
  const envRecord = env as Record<string, unknown>;
  for (const binding of requiredBindings) {
    if (!envRecord[binding]) {
      return {
        valid: false,
        response: createErrorResponse(logPrefix, 'Configuration error', 500, `Missing ${binding}`)
      };
    }
  }

  return {
    valid: true,
    db,
    env
  };
}
