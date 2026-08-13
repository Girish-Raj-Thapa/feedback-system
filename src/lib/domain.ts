/**
 * Extracts the raw hostname from a given URL or domain string.
 * @param urlOrDomain e.g., 'https://www.hello.com/path', 'api.hello.com'
 * @returns the lowercase hostname, e.g., 'www.hello.com', 'api.hello.com'
 */
export function extractDomain(urlOrDomain: string | null | undefined): { hostname: string; port: string } | null {
  if (!urlOrDomain) return null;
  try {
    const withProtocol = urlOrDomain.includes('://') ? urlOrDomain : `https://${urlOrDomain}`;
    const url = new URL(withProtocol);
    return {
      hostname: url.hostname.toLowerCase(),
      port: url.port || ''
    };
  } catch (e) {
    return null;
  }
}

/**
 * Validates if the incoming origin is allowed based on the registered website URL.
 * @param originHeader e.g., 'https://api.hello.com' (from request.headers.get('origin'))
 * @param registeredWebsiteUrl e.g., 'https://hello.com' (from database)
 */
export function isAllowedOrigin(
  originHeader: string | null | undefined,
  registeredWebsiteUrl: string | null | undefined
): boolean {
  if (!originHeader || !registeredWebsiteUrl) return false;

  const originInfo = extractDomain(originHeader);
  const registeredInfo = extractDomain(registeredWebsiteUrl);

  if (!originInfo || !registeredInfo) return false;

  // If the registered URL explicitly includes a port, the origin MUST match that port
  if (registeredInfo.port && originInfo.port !== registeredInfo.port) {
    return false;
  }

  const originDomain = originInfo.hostname;
  const registeredDomain = registeredInfo.hostname;

  // Exact match (e.g., origin = 'hello.com', registered = 'hello.com')
  if (originDomain === registeredDomain) return true;

  // Subdomain match (e.g., origin = 'api.hello.com', registered = 'hello.com')
  if (originDomain.endsWith('.' + registeredDomain)) return true;

  // Allow localhost for local development testing, but only if the user didn't register a specific IP/localhost
  if (process.env.NODE_ENV !== 'production' && originDomain === 'localhost' && registeredDomain !== '127.0.0.1' && registeredDomain !== 'localhost') {
    return true;
  }

  return false;
}
