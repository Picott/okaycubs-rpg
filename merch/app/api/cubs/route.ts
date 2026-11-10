import { NextRequest, NextResponse } from 'next/server';
import { getCubsForWallet } from '@/lib/cubs';
import { kv, kvConfigured } from '@/lib/kv';

// The store sells the πcott collection: the Cubs held by COLLECTOR_WALLET. Visitors browse those;
// a connected holder sees their own Cubs instead. Nothing outside those two sets is offered.
const COLLECTOR_WALLET = (process.env.COLLECTOR_WALLET || '').trim();
const CATALOG_TTL = 3600;

async function collectorCubs() {
  if (!COLLECTOR_WALLET) return [];
  const key = `catalog:${COLLECTOR_WALLET}`;
  if (kvConfigured) {
    const hit = await kv.get<Awaited<ReturnType<typeof getCubsForWallet>>>(key).catch(() => null);
    if (hit && hit.length) return hit;
  }
  const cubs = await getCubsForWallet(COLLECTOR_WALLET);
  if (cubs.length && kvConfigured) await kv.set(key, cubs, CATALOG_TTL).catch(() => {});
  return cubs;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const origin = req.nextUrl.origin; // e.g. https://okaycubs-rpg.vercel.app

  function proxyImg(url: string): string {
    if (!url) return '';
    return `${origin}/api/printful/proxy-image?url=${encodeURIComponent(url)}`;
  }

  try {
    const cubs = wallet ? await getCubsForWallet(wallet) : await collectorCubs();

    // Proxy every image through our server so the browser never hits nftstorage.link
    // directly (CORS) and Printful always gets a fast reachable URL.
    const proxied = cubs.map(c => ({ ...c, image: proxyImg(c.image) }));
    return NextResponse.json(proxied);
  } catch {
    return NextResponse.json([]);
  }
}
