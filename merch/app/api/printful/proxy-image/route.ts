import { NextRequest, NextResponse } from 'next/server';

// Re-serves any image (IPFS / Pinata / arweave) from our domain.
// Printful needs a publicly accessible HTTP URL — IPFS gateways are too slow
// for its download timeout, so we proxy through here.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  try {
    const upstream = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'OkayCubs-Store/1.0' },
      // 15-second hard timeout — more than enough for our server → IPFS
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed', status: upstream.status }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Proxy error', detail: String(err) }, { status: 500 });
  }
}
