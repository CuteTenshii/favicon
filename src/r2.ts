const oneWeek = 604800;

export function createResponseHeaders({ type, fetchedUrl, cacheStatus }: {
  type: string;
  fetchedUrl: string;
  cacheStatus: 'HIT' | 'MISS' | 'STALE';
}) {
  const filename = new URL(fetchedUrl).pathname.split('/').pop();
  return {
    'Content-Type': type,
    'Content-Disposition': `inline; filename=${filename}`,
    'Cache-Control': `public, max-age=${oneWeek}, immutable`,
    'X-Cache-Status': cacheStatus,
    'X-Icon-URL': fetchedUrl,
  };
}

export async function saveImage({ host, image, env, type, fetchedUrl, }: {
  host: string;
  image: ArrayBuffer;
  env: Env;
  fetchedUrl: string;
  type: string;
}) {
  await env.r2.put(host, image, {
    httpMetadata: { contentType: type },
    customMetadata: {
      originalUrl: fetchedUrl,
      expireTimestamp: String(Date.now() + oneWeek * 1000),
    },
  });

  return new Response(image, {
    headers: createResponseHeaders({ type, fetchedUrl, cacheStatus: 'MISS' }),
  });
}
