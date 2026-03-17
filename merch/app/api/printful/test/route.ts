import { NextRequest, NextResponse } from 'next/server';

// GET /api/printful/test
// If DIAGNOSTIC_SECRET is set in env: requires ?secret=<value>
// If DIAGNOSTIC_SECRET is NOT set:   open (only the server owner can deploy it)
//
// Returns store info + full variant list for each product — use this to
// get the correct variant IDs to put in products.ts
export async function GET(req: NextRequest) {
  const envSecret = process.env.DIAGNOSTIC_SECRET;
  if (envSecret) {
    const provided = req.nextUrl.searchParams.get('secret');
    if (provided !== envSecret) {
      return NextResponse.json({ error: 'Unauthorized — pass ?secret=<DIAGNOSTIC_SECRET>' }, { status: 401 });
    }
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PRINTFUL_API_KEY env var is not set' }, { status: 503 });
  }

  const hdrs = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  // 1. Validate API key
  const storeRes  = await fetch('https://api.printful.com/store', { headers: hdrs });
  const storeData = await storeRes.json() as { result?: { name?: string } };

  // 2. Fetch each product + its full variant list
  const productIds = [380, 447, 74];
  const products: Record<number, unknown> = {};

  for (const pid of productIds) {
    const r = await fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs });
    const d = await r.json() as {
      result?: {
        product?: { title?: string };
        variants?: Array<{
          id: number;
          size?: string;
          color?: string;
          color_code?: string;
          availability_status?: string;
        }>;
      };
    };

    const variants = d?.result?.variants ?? [];

    // Group by color for readability
    const byColor: Record<string, Array<{ id: number; size?: string }>> = {};
    for (const v of variants) {
      const c = v.color ?? 'Unknown';
      if (!byColor[c]) byColor[c] = [];
      byColor[c].push({ id: v.id, size: v.size });
    }

    products[pid] = {
      httpStatus: r.status,
      name: d?.result?.product?.title,
      totalVariants: variants.length,
      byColor,
    };
  }

  return NextResponse.json({
    store: { httpStatus: storeRes.status, name: storeData?.result?.name },
    products,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
