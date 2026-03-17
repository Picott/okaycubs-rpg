import { NextResponse } from 'next/server';

// GET /api/printful/catalog
// Returns the real variant IDs for the products we want to sell.
// Open this URL in your browser to find the correct IDs to put in products.ts
// No secret needed — the API key stays server-side.
export async function GET() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PRINTFUL_API_KEY not set' }, { status: 503 });
  }

  const hdrs = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  // Fetch catalog info for the three product IDs currently configured
  const productIds = [380, 447, 74];
  const results: Record<number, unknown> = {};

  for (const pid of productIds) {
    const res  = await fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs });
    const data = await res.json() as {
      result?: {
        product?: { title?: string };
        variants?: Array<{ id: number; size?: string; color?: string; color_code?: string; availability_status?: string }>;
      };
    };

    const product  = data?.result?.product;
    const variants = data?.result?.variants ?? [];

    // Group by color for readability
    const byColor: Record<string, Array<{ id: number; size?: string; availability?: string }>> = {};
    for (const v of variants) {
      const c = v.color ?? 'Unknown';
      if (!byColor[c]) byColor[c] = [];
      byColor[c].push({ id: v.id, size: v.size, availability: v.availability_status });
    }

    results[pid] = {
      name: product?.title ?? `Product ${pid}`,
      httpStatus: res.status,
      totalVariants: variants.length,
      byColor,
    };
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
