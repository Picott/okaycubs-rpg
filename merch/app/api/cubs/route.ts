import { NextRequest, NextResponse } from 'next/server';
import { getCubsForWallet, getAllOkayCubs, FEATURED_CUBS } from '@/lib/cubs';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  const origin = req.nextUrl.origin; // e.g. https://okaycubs-rpg.vercel.app

  function proxyImg(url: string): string {
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

    // Proxy every image through our server so the browser never hits nftstorage.link
    // directly (CORS) and Printful always gets a fast reachable URL.
    const proxied = cubs.map(c => ({ ...c, image: proxyImg(c.image) }));
    return NextResponse.json(proxied);
  } catch {
    return NextResponse.json([]);
  }
}
