import * as cheerio from 'cheerio';
import {handleRequest} from "./requests";

// Try multiple favicon URLs
const urlsToTry = [
	'favicon.ico',
	'favicon.png',
	'apple-touch-icon.png',
];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const rawUrl = new URL(request.url).searchParams.get('url');
		const fromHtml = new URL(request.url).searchParams.get('from_html');
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
					'X-Cache-Status': 'HIT',
					'X-Icon-URL': cachedFavicon.customMetadata!['original-url'] || '',
				},
			});
		}

		if (!fromHtml) {
			for (const urlToTry of urlsToTry) {
				const fetchedUrl = `${url.protocol}//${url.host}/${urlToTry}`
				const res = await handleRequest(fetchedUrl);
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
							customMetadata: {
								'original-url': fetchedUrl,
							},
						});

						// Return the image with appropriate headers
						return new Response(body, {
							headers: {
								'Content-Type': contentType,
								'Cache-Control': 'public, max-age=31536000, immutable',
								'X-Cache-Status': 'MISS',
								'X-Icon-URL': fetchedUrl,
							},
						});
					}
				}
			}
		}

		// If the favicon is not found, try to get it from meta tags
		const htmlRes = await handleRequest(url.toString());
		if (!htmlRes.ok) return new Response('Failed to fetch page', { status: 500 });
		const html = await htmlRes.text();
		const $ = cheerio.load(html);
		const linkTag = $('link[rel*="icon"]');
		const href = linkTag.attr('href');
		if (href) {
			const iconUrl = new URL(href, url);
			const iconRes = await handleRequest(iconUrl.toString());
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
						customMetadata: {
							'original-url': iconUrl.toString(),
						},
					});

					// Return the image with appropriate headers
					return new Response(body, {
						headers: {
							'Content-Type': iconRes.headers.get('Content-Type') || 'image/png',
							'Cache-Control': 'public, max-age=31536000, immutable',
							'X-Cache-Status': 'MISS',
							'X-Icon-URL': iconUrl.toString(),
						},
					});
				}
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
