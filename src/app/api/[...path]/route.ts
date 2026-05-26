const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'https://makrly-floorplan-backend--brettmakrly.replit.app';

async function proxy(request: Request, params: { path: string[] }) {
  const path = params.path.join('/');
  const targetUrl = `${BACKEND_BASE_URL}/api/${path}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: 'follow',
  };

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}
