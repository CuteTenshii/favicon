import {saveImage} from './r2';
import * as cheerio from 'cheerio';

const cookieJar = new Map<string, string>();
// Try multiple favicon URLs
const urlsToTry = [
  'favicon.ico',
  'favicon.png',
  'apple-touch-icon.png',
];

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
  if (res.status > 300 || res.status <= 400) {
    const location = res.headers.get('location');
    if (location) return handleRequest(new URL(location, url).toString());
  }

  return res;
}

function createCookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function parseSetCookieHeader(header: string | null): Record<string, string> {
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

export async function fetchImage({ url, fromHtml, env }: {
  url: URL,
  fromHtml: boolean,
  env: Env
}): Promise<Response> {
  const triedUrls = [];

  if (!fromHtml) {
    for (const urlToTry of urlsToTry) {
      const fetchedUrl = `${url.protocol}//${url.host}/${urlToTry}`;
      triedUrls.push(fetchedUrl);

      const res = await handleRequest(fetchedUrl);
      if (res.ok) {
        // Check if the response is an image
        const contentType = res.headers.get('Content-Type');
        if (contentType?.startsWith('image/')) {
          return saveImage({
            host: url.host,
            image: await res.arrayBuffer(),
            env,
            type: contentType,
            fetchedUrl,
          });
        }
      }
    }
  }

  // If the favicon is not found, try to get it from meta tags
  const htmlRes = await handleRequest(url.toString());
  triedUrls.push(url.toString());
  if (!htmlRes.ok) return new Response(`Failed to fetch page: ${htmlRes.status} ${htmlRes.statusText}`.trim(), { status: 500 });

  const $ = cheerio.load(await htmlRes.text());
  const linkTag = $('link[rel*="icon"]');
  const href = linkTag.attr('href');
  if (href) {
    const iconUrl = new URL(href, url);
    const iconRes = await handleRequest(iconUrl.toString());
    if (iconRes.ok) {
      // Check if the response is an image
      const contentType = iconRes.headers.get('Content-Type');
      if (contentType?.startsWith('image/')) {
        return saveImage({
          host: url.host,
          image: await iconRes.arrayBuffer(),
          env,
          type: contentType,
          fetchedUrl: iconUrl.toString(),
        });
      }
    }
  }

  return new Response(`Favicon not found! Tried URLs:\n${triedUrls.map(u => `- ${u}`).join('\n')}`, { status: 400 });
}