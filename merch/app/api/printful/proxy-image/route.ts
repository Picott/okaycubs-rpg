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
  // optional thumbnail: the game shows cubs at ~184px, so a 384px WebP is ~30x smaller than the 1-2MB
  // originals and saves the Fast Origin Transfer quota. Printful keeps fetching full resolution (no `w`).
  const wParam = parseInt(req.nextUrl.searchParams.get('w') || '', 10);
  const width = Number.isFinite(wParam) ? Math.min(1024, Math.max(64, wParam)) : 0;

  for (const candidate of candidates) {
    const upstream = await fetchImage(candidate);
    if (!upstream) continue;

    let contentType = upstream.headers.get('content-type') || 'image/png';
    let buf: Uint8Array = new Uint8Array(await upstream.arrayBuffer());
    if (width && contentType.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        buf = new Uint8Array(await sharp(Buffer.from(buf)).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer());
        contentType = 'image/webp';
      } catch { /* serve the original if resizing fails */ }
    }

    return new NextResponse(new Blob([buf]), {
      headers: {
        'Content-Type': contentType,
        // IPFS content is immutable: cache a year at Vercel's edge (s-maxage) so each image crosses the
        // function once instead of on every visit — this was eating the Fast Origin Transfer quota
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'Vercel-CDN-Cache-Control': 'max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return NextResponse.json({ error: 'All IPFS gateways failed', url }, { status: 502 });
}
