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
