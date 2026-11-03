import { put } from '@vercel/blob';

// Printful cannot download from IPFS gateways (mockup tasks stay pending, orders fail), so every
// Cub image is copied to Vercel Blob first. The cache is per warm instance; Blob overwrites are cheap.
const blobUrlCache = new Map<string, string>();

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://nftstorage.link/ipfs/',
];

export const IPFS_GATEWAY_PATTERN =
  /^https?:\/\/(?:nftstorage\.link|ipfs\.io|cloudflare-ipfs\.com|gateway\.pinata\.cloud|w3s\.link|dweb\.link|gateway\.ipfs\.io)\/ipfs\/(.+)/;

export interface ReHostResult {
  url: string | null;
  failedStep?: 'download' | 'upload' | 'no_blob_token';
  detail?: string;
}

/** Unwrap our own /api/printful/proxy-image?url=… wrapper back to the original image URL. */
export function unwrapProxiedImage(imageUrl: string): string {
  if (!imageUrl.includes('/api/printful/proxy-image')) return imageUrl;
  try {
    const original = new URL(imageUrl).searchParams.get('url');
    return original || imageUrl;
  } catch { return imageUrl; }
}

export async function reHostImage(imageUrl: string): Promise<ReHostResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { url: null, failedStep: 'no_blob_token', detail: 'BLOB_READ_WRITE_TOKEN env var not set. Create a Blob store in Vercel Dashboard → Storage.' };
  }
  const cached = blobUrlCache.get(imageUrl);
  if (cached) return { url: cached };

  const m = imageUrl.match(IPFS_GATEWAY_PATTERN);
  const candidates = m ? IPFS_GATEWAYS.map(gw => `${gw}${m[1]}`) : [imageUrl];

  let imageBuffer: Buffer | null = null;
  let contentType = 'image/png';
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'OkayCubs-Store/1.0' }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { errors.push(`${url} → ${res.status}`); continue; }
      imageBuffer = Buffer.from(await res.arrayBuffer());
      contentType = res.headers.get('content-type') || 'image/png';
      break;
    } catch (e) {
      errors.push(`${url} → ${String(e)}`);
    }
  }
  if (!imageBuffer) return { url: null, failedStep: 'download', detail: errors.join(' | ') };

  try {
    const filename = m ? `cubs/${m[1].replace(/\//g, '-')}` : `cubs/${Date.now()}.png`;
    const blob = await put(filename, imageBuffer, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true });
    blobUrlCache.set(imageUrl, blob.url);
    return { url: blob.url };
  } catch (e) {
    return { url: null, failedStep: 'upload', detail: String(e) };
  }
}

/** Best print-ready URL for an order: the Blob copy when possible, otherwise the original. */
export async function printReadyImageUrl(imageUrl: string): Promise<{ url: string; rehosted: boolean }> {
  const original = unwrapProxiedImage(imageUrl);
  if (original.startsWith('https://') && /\.public\.blob\.vercel-storage\.com\//.test(original)) return { url: original, rehosted: true };
  const r = await reHostImage(original);
  return r.url ? { url: r.url, rehosted: true } : { url: original, rehosted: false };
}
