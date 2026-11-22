/** Only web links and site-relative paths: never javascript:, data: or other schemes from untrusted data. */
export function isSafeUrl(u: string): boolean {
  const s = u.trim();
  if (/^https?:\/\//i.test(s)) return true;
  // relative paths: no scheme before the first slash, no protocol-relative "//host"
  return !/^[a-z][a-z0-9+.-]*:/i.test(s) && !s.startsWith('//');
}

export function safeUrl(u: string | undefined): string | undefined {
  return u && isSafeUrl(u) ? u : undefined;
}

/** The site a link goes to, for its tooltip and accessible name ("en.wikipedia.org"). */
export function hostOf(url: string): string {
  try {
    return new URL(url, (globalThis as { location?: { href: string } }).location?.href ?? 'http://localhost/').hostname;
  } catch {
    return url;
  }
}
