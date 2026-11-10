import sharp from 'sharp';
import type { Product } from './products';
import type { PrintfulOrderItem } from './printful';
import { brandedPrintUrl, brandedPosition } from './images';

// Printful's embroidery thread palette (the exact values its API accepts for thread_colors).
const THREADS = ['#FFFFFF', '#000000', '#96A1A8', '#A67843', '#FFCC00', '#E25C27', '#CC3366', '#CC3333', '#660000', '#333366', '#005397', '#3399FF', '#6B5294', '#01784E', '#7BA35A'];
const MAX_THREADS = 6;   // flat embroidery allows up to six thread colors per design

const hex2rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const PALETTE = THREADS.map(h => ({ hex: h, rgb: hex2rgb(h) }));

/**
 * Picks the embroidery thread colors for a Cub: downsample the artwork, snap every opaque pixel to
 * the nearest thread, keep the most used ones. Falls back to black + white if the image cannot be read.
 */
export async function threadColorsFor(imageUrl: string): Promise<string[]> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 128) continue;   // transparent background
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let best = PALETTE[0], bestD = Infinity;
      for (const p of PALETTE) {
        const d = (r - p.rgb[0]) ** 2 + (g - p.rgb[1]) ** 2 + (b - p.rgb[2]) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      }
      counts.set(best.hex, (counts.get(best.hex) || 0) + 1);
    }
    const entries = Array.from(counts.entries());
    const total = entries.reduce((a, [, n]) => a + n, 0) || 1;
    const picked = entries.filter(([, n]) => n / total >= 0.02).sort((a, b) => b[1] - a[1]).slice(0, MAX_THREADS).map(([hex]) => hex);
    return picked.length ? picked : ['#000000', '#FFFFFF'];
  } catch (e) {
    console.warn('[embroidery] thread colors fallback:', e instanceof Error ? e.message : e);
    return ['#000000', '#FFFFFF'];
  }
}

/** Builds the Printful order item for a product variant and a print-ready image, with embroidery options when needed. */
export async function buildOrderItem(product: Product, variantId: number, imageUrl: string): Promise<PrintfulOrderItem> {
  const embroidered = product.printPlacement.startsWith('embroidery');
  const variant = product.variants.find(v => v.printfulVariantId === variantId);
  let fileUrl = imageUrl, position = product.printPosition;
  if (!embroidered) {
    const b = await brandedPrintUrl(imageUrl, variant?.colorHex || '#000000');
    if (b.branded) { fileUrl = b.url; position = position ? brandedPosition(position) : undefined; }
  }
  const item: PrintfulOrderItem = {
    variantId, quantity: 1,
    files: [{ url: fileUrl, placement: product.printPlacement, position }],
  };
  if (embroidered) {
    item.options = [
      { id: 'embroidery_type', value: 'flat' },
      { id: 'thread_colors', value: await threadColorsFor(imageUrl) },
    ];
  }
  return item;
}
