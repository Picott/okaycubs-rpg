import { put } from '@vercel/blob';
import sharp from 'sharp';
import { BRAND_LOGO_PNG_BASE64, BRAND_BAND_RATIO, BRAND_LOGO_WIDTH } from './brand';

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

/** Downloads an image, trying every IPFS gateway when the URL is an IPFS one. */
export async function downloadImage(imageUrl: string): Promise<{ buffer: Buffer | null; contentType: string; errors: string[] }> {
  const m = imageUrl.match(IPFS_GATEWAY_PATTERN);
  const candidates = m ? IPFS_GATEWAYS.map(gw => `${gw}${m[1]}`) : [imageUrl];
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'OkayCubs-Store/1.0' }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { errors.push(`${url} → ${res.status}`); continue; }
      return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || 'image/png', errors };
    } catch (e) {
      errors.push(`${url} → ${String(e)}`);
    }
  }
  return { buffer: null, contentType: 'image/png', errors };
}

export async function reHostImage(imageUrl: string): Promise<ReHostResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { url: null, failedStep: 'no_blob_token', detail: 'BLOB_READ_WRITE_TOKEN env var not set. Create a Blob store in Vercel Dashboard → Storage.' };
  }
  const cached = blobUrlCache.get(imageUrl);
  if (cached) return { url: cached };

  const m = imageUrl.match(IPFS_GATEWAY_PATTERN);
  const { buffer: imageBuffer, contentType, errors } = await downloadImage(imageUrl);
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

// ---- the πcott mark under the portrait ----------------------------------------------------------
// Printed items get the square Cub plus a band below with the wordmark, so the print file is
// portrait: width W, height W × (1 + BRAND_BAND_RATIO). The mark is white on dark garments and
// black on light ones. Embroidered items (caps, beanies) keep the plain portrait.
const brandedCache = new Map<string, string>();

export function isDarkHex(hex: string): boolean {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
}

/** Composes the portrait + wordmark PNG for a given garment color. */
export async function composeBrandedPrint(cubPng: Buffer, garmentHex: string): Promise<Buffer> {
  const meta = await sharp(cubPng).metadata();
  const W = Math.min(2400, Math.max(1200, meta.width || 1500));
  const band = Math.round(W * BRAND_BAND_RATIO);
  const portrait = await sharp(cubPng).resize(W, W, { fit: 'cover' }).png().toBuffer();
  let logo = sharp(Buffer.from(BRAND_LOGO_PNG_BASE64, 'base64')).ensureAlpha();
  if (isDarkHex(garmentHex)) logo = logo.negate({ alpha: false });     // black wordmark → white
  const logoW = Math.round(W * BRAND_LOGO_WIDTH);
  const logoBuf = await logo.resize({ width: logoW }).png().toBuffer();
  const logoH = (await sharp(logoBuf).metadata()).height || Math.round(logoW * 100 / 468);
  return sharp({ create: { width: W, height: W + band, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: portrait, top: 0, left: 0 },
      { input: logoBuf, top: W + Math.round((band - logoH) / 2), left: Math.round((W - logoW) / 2) },
    ])
    .png().toBuffer();
}

/** Blob URL of the branded print for a Cub image and a garment color (cached per instance). */
export async function brandedPrintUrl(cubImageUrl: string, garmentHex: string): Promise<{ url: string; branded: boolean }> {
  const original = unwrapProxiedImage(cubImageUrl);
  const key = `${original}|${isDarkHex(garmentHex) ? 'w' : 'k'}`;
  const hit = brandedCache.get(key);
  if (hit) return { url: hit, branded: true };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { url: (await printReadyImageUrl(cubImageUrl)).url, branded: false };
  try {
    const { buffer } = await downloadImage(original);
    if (!buffer) throw new Error('download failed');
    const png = await composeBrandedPrint(buffer, garmentHex);
    const m = original.match(IPFS_GATEWAY_PATTERN);
    const base = m ? m[1].replace(/\//g, '-') : Buffer.from(original).toString('base64url').slice(-40);
    const blob = await put(`prints/${base}-${isDarkHex(garmentHex) ? 'w' : 'k'}.png`, png, { access: 'public', contentType: 'image/png', addRandomSuffix: false, allowOverwrite: true });
    brandedCache.set(key, blob.url);
    return { url: blob.url, branded: true };
  } catch (e) {
    console.warn('[brand] falling back to the plain portrait:', e instanceof Error ? e.message : e);
    return { url: (await printReadyImageUrl(cubImageUrl)).url, branded: false };
  }
}

/** Adjusts a square print position to the taller branded file, keeping it inside the print area. */
export function brandedPosition(pos: { area_width: number; area_height: number; width: number; height: number; top: number; left: number }) {
  const height = Math.round(pos.width * (1 + BRAND_BAND_RATIO));
  if (height <= pos.area_height) {
    const top = Math.min(pos.top, pos.area_height - height);
    return { ...pos, height, top: Math.max(0, top) };
  }
  // area too short: shrink to fit, keep it centered horizontally
  const scale = pos.area_height / height;
  const width = Math.round(pos.width * scale);
  return { ...pos, width, height: pos.area_height, top: 0, left: Math.round((pos.area_width - width) / 2) };
}
