const DEFAULT_URL = '/dashboard';

/**
 * A returnUrl comes from the query string, so anybody can craft one. It is only followed when it is a
 * path inside the app: not an absolute or protocol-relative URL, not a repeated parameter (an array).
 */
export function safeReturnUrl(value: unknown): string {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : DEFAULT_URL;
}
