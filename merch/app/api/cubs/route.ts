import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCubsForWallet, getAllOkayCubs, FEATURED_CUBS } from '@/lib/cubs';

// Build a set of cub numbers that have a local static file in /public/cubs/
// Local files are served directly — fast, reliable, no IPFS dependency.
function getLocalCubNumbers(): Set<number> {
  try {
    const dir = path.join(process.cwd(), 'public', 'cubs');
    return new Set(
      fs.readdirSync(dir)
        .map(f => parseInt(path.basename(f, path.extname(f)), 10))
        .filter(n => !isNaN(n))
    );
  } catch {
    return new Set();
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const origin = req.nextUrl.origin; // e.g. https://okaycubs-rpg.vercel.app

  const localNums = getLocalCubNumbers();

  function resolveImg(url: string, number: number): string {
    // Prefer local static file — Printful can download it instantly
    if (localNums.has(number)) return `${origin}/cubs/${number}.png`;
    // Fall back to our proxy (handles IPFS / arweave slowness)
    if (!url) return '';
    return `${origin}/api/printful/proxy-image?url=${encodeURIComponent(url)}`;
  }

  try {
    let cubs = wallet
      ? await getCubsForWallet(wallet)
      : await getAllOkayCubs();

    // When no wallet and collection returns nothing, fall back to featured cubs
    if (!wallet && cubs.length === 0) {
      cubs = FEATURED_CUBS;
    }

    const proxied = cubs.map(c => ({ ...c, image: resolveImg(c.image, c.number) }));
    return NextResponse.json(proxied);
  } catch {
    return NextResponse.json([]);
  }
}
