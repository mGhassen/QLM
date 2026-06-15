const API_HOST = process.env.VITE_POSTHOG_URL || 'https://us.i.posthog.com';
const ASSET_HOST =
  process.env.VITE_POSTHOG_ASSETS_URL || 'https://us-assets.i.posthog.com';

export type PosthogIngestMountPrefix = '/ingest';

/**
 * Reverse-proxy PostHog API + assets for first-party ingestion (`api_host`).
 * Mounted at `/ingest/*` (see `routes/ingest.$.ts`).
 */
export async function proxyPosthogIngestRequest(
  request: Request,
  splat: string | undefined,
  options: { mountPrefix: PosthogIngestMountPrefix },
): Promise<Response> {
  const { mountPrefix } = options;
  const url = new URL(request.url);
  const targetHost = url.pathname.startsWith(`${mountPrefix}/static/`)
    ? ASSET_HOST
    : API_HOST;

  const newUrl = new URL(url);
  newUrl.protocol = 'https';
  newUrl.hostname = new URL(targetHost).hostname;
  newUrl.port = '443';

  if (splat) {
    newUrl.pathname = `/${splat}`;
  } else {
    newUrl.pathname = url.pathname.startsWith(mountPrefix)
      ? url.pathname.slice(mountPrefix.length) || '/'
      : url.pathname;
  }

  const headers = new Headers(request.headers);
  headers.set('host', new URL(targetHost).hostname);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    body: request.body,
  };

  if (request.body) {
    (fetchOptions as { duplex?: string }).duplex = 'half';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(newUrl, fetchOptions);
    clearTimeout(timeoutId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    const errorCode =
      (error as { code?: string }).code ||
      (error as { cause?: { code?: string } }).cause?.code;

    const isTimeout =
      (error instanceof Error && error.name === 'AbortError') ||
      errorCode === 'ETIMEDOUT';

    const isNetworkError =
      error instanceof TypeError ||
      errorCode === 'ETIMEDOUT' ||
      (error instanceof Error && error.message.includes('fetch failed'));

    if (isTimeout || isNetworkError) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `[PostHog Proxy] ${isTimeout ? 'Timeout' : 'Network error'} (silent):`,
          newUrl.pathname,
        );
      }
      return new Response('', { status: 200 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[PostHog Proxy] Unexpected error:', error);
    }
    return new Response('', { status: 200 });
  }
}
