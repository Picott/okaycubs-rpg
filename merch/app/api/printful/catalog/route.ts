import { NextRequest, NextResponse } from 'next/server';

// GET /api/printful/catalog
// Returns the real variant IDs AND available print placements for each product.
// Open this URL in your browser to find the correct IDs and placements for products.ts
// No secret needed — the API key stays server-side.
export async function GET(req: NextRequest) {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PRINTFUL_API_KEY not set' }, { status: 503 });
  }

  const hdrs = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  // Accept ?ids=74,380,447 to probe arbitrary product IDs
  // Default: current config + common jogger/cap alternatives to find valid IDs
  const idsParam = req.nextUrl?.searchParams?.get('ids');
  const productIds = idsParam
    ? idsParam.split(',').map(Number).filter(Boolean)
    // AOP Wide-Leg Jogger candidates: 398, 405, 460, 453, 9819, 407, 412, 440, 450, 470, 480
    // OTTO Cap 31-069 DTFilm candidates: 3719, 9819, 325, 77, 453, 460, 407
    // Known working: 380 (hoodie), 374 (regular jogger)
    : [380, 374, 398, 405, 325, 3719, 9819, 77, 453, 460, 407, 412, 440, 450, 470, 480, 500, 510];
  const results: Record<number, unknown> = {};

  for (const pid of productIds) {
    const [variantRes, printfileRes] = await Promise.all([
      fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs }),
      fetch(`https://api.printful.com/mockup-generator/printfiles/${pid}`, { headers: hdrs }),
    ]);

    const variantData = await variantRes.json() as {
      result?: {
        product?: { title?: string };
        variants?: Array<{ id: number; size?: string; color?: string; color_code?: string; availability_status?: string }>;
      };
    };
    const printfileData = await printfileRes.json() as {
      result?: {
        variant_printfiles?: Array<{
          variant_id: number;
          placements: Array<{ placement: string; display_name?: string }>;
        }>;
        available_placements?: Record<string, string>;
      };
    };

    const product  = variantData?.result?.product;
    const variants = variantData?.result?.variants ?? [];

    // Group by color for readability
    const byColor: Record<string, Array<{ id: number; size?: string; availability?: string }>> = {};
    for (const v of variants) {
      const c = v.color ?? 'Unknown';
      if (!byColor[c]) byColor[c] = [];
      byColor[c].push({ id: v.id, size: v.size, availability: v.availability_status });
    }

    // Extract unique valid placements
    const availablePlacements = printfileData?.result?.available_placements ?? {};
    const placementsFromVariants = new Set<string>();
    for (const vp of printfileData?.result?.variant_printfiles ?? []) {
      for (const p of vp.placements ?? []) placementsFromVariants.add(p.placement);
    }

    results[pid] = {
      name: product?.title ?? `Product ${pid}`,
      httpStatus: variantRes.status,
      totalVariants: variants.length,
      availablePlacements,
      uniquePlacementsFromVariants: Array.from(placementsFromVariants),
      byColor,
    };
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
