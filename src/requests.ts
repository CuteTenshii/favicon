const cookieJar = new Map<string, string>();

export async function handleRequest(url: string) {
  const res = await fetch(url, {
    redirect: 'manual',
    headers: {
      Cookie: createCookieHeader(cookieJar),
    },
  });
  const cookieHeader = res.headers.get('set-cookie');
  const cookies = parseSetCookieHeader(cookieHeader);
  for (const [key, value] of Object.entries(cookies)) {
    cookieJar.set(key, value);
  }

  // Handle redirects
  if (res.status < 300 || res.status >= 400) {
    const location = res.headers.get('location');
    if (location) {
      return handleRequest(location);
    }
  }

  return res;
}

function createCookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function parseSetCookieHeader(header: string|null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  const cookiePairs = header.split(',').map(cookie => cookie.split('; ')[0]);
  for (const cookie of cookiePairs) {
    const [key, value] = cookie.split('=');
    if (!key || !value) continue;
    cookies[key.trim()] = value.trim();
  }
  return cookies;
}