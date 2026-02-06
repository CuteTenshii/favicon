import {fetchImage} from './requests';

const oneWeek = 604800;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const rawUrl = new URL(request.url).searchParams.get('url');
    const fromHtml = new URL(request.url).searchParams.get('from_html');

    // Redirect to the GitHub repository if no URL is provided
    if (!rawUrl) return Response.redirect('https://github.com/CuteTenshii/favicon');

    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return new Response('Invalid URL', { status: 400 });

    // Check if the favicon is already cached in R2
    const cachedFavicon = await env.r2.get(url.host);
    if (cachedFavicon) {
      const metadata = cachedFavicon.customMetadata!
      const isStale = parseInt(metadata.expireTimestamp) < Date.now();
      if (isStale) {
        // Fetch in background for next fetch
        fetchImage({ url, fromHtml: !!fromHtml, env });
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

    return fetchImage({ url, fromHtml: !!fromHtml, env });
  },
} satisfies ExportedHandler<Env>;
