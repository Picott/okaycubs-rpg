import { NextRequest, NextResponse } from 'next/server';

// Public IPFS gateways in priority order — tried sequentially until one succeeds.
// cloudflare-ipfs.com shut down its public gateway in 2024 — removed.
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://nftstorage.link/ipfs/',
];

const IPFS_GATEWAY_PATTERN =
  /^https?:\/\/(?:nftstorage\.link|ipfs\.io|cloudflare-ipfs\.com|gateway\.pinata\.cloud|w3s\.link|dweb\.link|gateway\.ipfs\.io)\/ipfs\/(.+)/;

// Given any URL, return an ordered list of URLs to try.
// For IPFS gateway URLs, substitutes alternative gateways first.
// For non-IPFS URLs, returns the URL as-is.
function candidateUrls(raw: string): string[] {
  const m = raw.match(IPFS_GATEWAY_PATTERN);
  if (m) {
    const cidPath = m[1];
    return IPFS_GATEWAYS.map(gw => `${gw}${cidPath}`);
  }
  return [raw];
}

async function fetchImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OkayCubs-Store/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return res;
    return null;
  } catch {
    return null;
  }
}

// Re-serves any image (IPFS / Pinata / arweave) from our domain.
// Printful needs a publicly accessible HTTP URL — IPFS gateways are unreliable,
// so we proxy through here and try multiple gateways as fallbacks.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  const candidates = candidateUrls(decodeURIComponent(url));

  for (const candidate of candidates) {
    const upstream = await fetchImage(candidate);
    if (!upstream) continue;

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return NextResponse.json({ error: 'All IPFS gateways failed', url }, { status: 502 });
}
