const oneWeek = 604800;

export async function saveImage({host, image, env, type, fetchedUrl,}: {
  host: string;
  image: ArrayBuffer;
  env: Env;
  fetchedUrl: string;
  type: string;
}) {
  // Cache the image in R2
  await env.r2.put(host, image, {
    httpMetadata: { contentType: type },
    customMetadata: {
      originalUrl: fetchedUrl,
      expireTimestamp: String(Date.now() + oneWeek * 1000),
    },
  });

  const filename = new URL(fetchedUrl).pathname.split('/').pop();
  // Return the image with appropriate headers
  return new Response(image, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename=${filename}`,
      'Cache-Control': `public, max-age=${oneWeek}, immutable`,
      'X-Cache-Status': 'MISS',
      'X-Icon-URL': fetchedUrl,
    },
  });
}