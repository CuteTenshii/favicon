import { fetchImage } from './requests';

const oneWeek = 604800;
const domainRoute = new URLPattern({ pathname: '/:domain' });

async function handleFavicon(rawUrl: string, fromHtml: boolean, env: Env, ctx: ExecutionContext) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return new Response('Invalid URL', { status: 400 });

  const cachedFavicon = await env.r2.get(url.host);
  if (cachedFavicon) {
    const metadata = cachedFavicon.customMetadata!;
    const isStale = Number.parseInt(metadata.expireTimestamp) < Date.now();
    if (isStale) {
      ctx.waitUntil(fetchImage({ url, fromHtml, env }));
    }
    const filename = new URL(metadata.originalUrl).pathname.split('/').pop();

    return new Response(cachedFavicon.body, {
      headers: {
        'Content-Type': cachedFavicon.httpMetadata!.contentType || 'image/png',
        'Content-Disposition': `inline; filename=${filename}`,
        'Cache-Control': `public, max-age=${oneWeek}, immutable`,
        'X-Cache-Status': isStale ? 'STALE' : 'HIT',
        'X-Icon-URL': metadata.originalUrl || '',
      },
    });
  }

  return fetchImage({ url, fromHtml, env });
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext) {
  const requestUrl = new URL(request.url);
  const fromHtml = !!requestUrl.searchParams.get('from_html');

  if (requestUrl.pathname === '/') {
    const rawUrl = requestUrl.searchParams.get('url');
    if (!rawUrl) return Response.redirect('https://github.com/CuteTenshii/favicon');

    return handleFavicon(rawUrl, fromHtml, env, ctx);
  }

  const domain = domainRoute.exec(requestUrl.href)?.pathname.groups.domain;
  return domain
    ? handleFavicon(`https://${domain}`, fromHtml, env, ctx)
    : new Response('Not found', { status: 404 });
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler<Env>;
