import * as cheerio from 'cheerio';

// Try multiple favicon URLs
const urlsToTry = [
	'favicon.ico',
	'favicon.png',
	'apple-touch-icon.png',
];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const rawUrl = new URL(request.url).searchParams.get('url');
		if (!rawUrl) return new Response('Missing URL', { status: 400 });

		const url = new URL(rawUrl);
		if (!url.protocol.startsWith('http')) return new Response('Invalid URL', { status: 400 });

		// Check if the favicon is already cached in R2
		const cachedFavicon = await env.r2.get(url.host);
		if (cachedFavicon) {
			return new Response(cachedFavicon.body, {
				headers: {
					'Content-Type': cachedFavicon.httpMetadata!.contentType || 'image/png',
					'Cache-Control': 'public, max-age=31536000, immutable',
				},
			});
		}

		for (const urlToTry of urlsToTry) {
			const res = await fetch(`${url.protocol}//${url.host}/${urlToTry}`, { method: 'GET' });
			if (res.ok) {
				// Check if the response is an image
				const contentType = res.headers.get('Content-Type');
				if (contentType && contentType.startsWith('image/')) {
					const body = await res.arrayBuffer();
					// Cache the image in R2
					await env.r2.put(url.host, body, {
						httpMetadata: {
							contentType,
							cacheControl: 'public, max-age=31536000, immutable',
						},
					});

					// Return the image with appropriate headers
					return new Response(body, {
						headers: {
							'Content-Type': contentType,
							'Cache-Control': 'public, max-age=31536000, immutable',
						},
					});
				}
			}
		}

		// If the favicon is not found, try to get it from meta tags
		const htmlRes = await fetch(url.toString());
		if (!htmlRes.ok) return new Response('Failed to fetch page', { status: 500 });
		const html = await htmlRes.text();
		const $ = cheerio.load(html);
		const linkTag = $('link[rel*="icon"]');
		const href = linkTag.attr('href');
		if (href) {
			const iconUrl = new URL(href, url);
			const iconRes = await fetch(iconUrl.toString(), { method: 'GET' });
			if (iconRes.ok) {
				// Check if the response is an image
				const contentType = iconRes.headers.get('Content-Type');
				if (contentType && contentType.startsWith('image/')) {
					const body = await iconRes.arrayBuffer();
					// Cache the image in R2
					await env.r2.put(url.host, body, {
						httpMetadata: {
							contentType,
							cacheControl: 'public, max-age=31536000, immutable',
						},
					});

					// Return the image with appropriate headers
					return new Response(body, {
						headers: {
							'Content-Type': iconRes.headers.get('Content-Type') || 'image/png',
							'Cache-Control': 'public, max-age=31536000, immutable',
						},
					});
				}
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
