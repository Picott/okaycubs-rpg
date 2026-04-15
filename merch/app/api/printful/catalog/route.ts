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

  // Fetch store_id — required by /mockup-generator/printfiles for store-level API keys
  let storeId: number | null = process.env.PRINTFUL_STORE_ID ? parseInt(process.env.PRINTFUL_STORE_ID) : null;
  if (!storeId) {
    for (const path of ['/store', '/stores']) {
      try {
        const r = await fetch(`https://api.printful.com${path}`, { headers: hdrs });
        const d = await r.json();
        const result = d?.result;
        const id = Array.isArray(result) ? result?.[0]?.id : result?.id;
        if (typeof id === 'number') { storeId = id; break; }
      } catch {}
    }
  }
  const storeQuery = storeId ? `?store_id=${storeId}` : '';

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
    let printfileRaw = '';
    try {
    const [variantRes, printfileRes] = await Promise.all([
      fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs }),
      fetch(`https://api.printful.com/mockup-generator/printfiles/${pid}${storeQuery}`, { headers: hdrs }),
    ]);

    const variantData = await variantRes.json() as {
      result?: {
        product?: { title?: string };
        variants?: Array<{ id: number; size?: string; color?: string; color_code?: string; availability_status?: string; price?: string }>;
      };
    };
    printfileRaw = await printfileRes.text();
    let printfileData: {
      result?: {
        variant_printfiles?: Array<{
          variant_id: number;
          placements: Array<{ placement: string; display_name?: string }>;
        }>;
        available_placements?: Record<string, string> | Array<unknown>;
      };
    } = {};
    try { printfileData = JSON.parse(printfileRaw); } catch {}

    const product  = variantData?.result?.product;
    const variants = variantData?.result?.variants ?? [];

    // Group by color for readability
    const byColor: Record<string, Array<{ id: number; size?: string; availability?: string; printfulCost?: string }>> = {};
    for (const v of variants) {
      const c = v.color ?? 'Unknown';
      if (!byColor[c]) byColor[c] = [];
      byColor[c].push({ id: v.id, size: v.size, availability: v.availability_status, printfulCost: v.price });
    }

    // Extract unique valid placements — defensively handle shape changes
    const availablePlacements = printfileData?.result?.available_placements ?? {};
    const placementsFromVariants = new Set<string>();
    const vpRaw = printfileData?.result?.variant_printfiles;
    const vpArr = Array.isArray(vpRaw) ? vpRaw : [];
    for (const vp of vpArr) {
      const plist = Array.isArray(vp?.placements) ? vp.placements : [];
      for (const p of plist) {
        if (p?.placement) placementsFromVariants.add(p.placement);
      }
    }

    results[pid] = {
      name: product?.title ?? `Product ${pid}`,
      httpStatus: variantRes.status,
      printfileHttpStatus: printfileRes.status,
      printfileRawHead: printfileRaw.slice(0, 400),
      totalVariants: variants.length,
      availablePlacements,
      uniquePlacementsFromVariants: Array.from(placementsFromVariants),
      byColor,
    };
    } catch (e) {
      results[pid] = { error: String(e), printfileRawHead: printfileRaw.slice(0, 500) };
    }
  }

  return NextResponse.json({ storeIdUsed: storeId, ...results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
