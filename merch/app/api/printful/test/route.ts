import { NextRequest, NextResponse } from 'next/server';

// GET /api/printful/test?secret=<DIAGNOSTIC_SECRET> — dev/ops diagnostic only
// Set DIAGNOSTIC_SECRET in your environment; never expose this URL publicly.
export async function GET(req: NextRequest) {
  const secret = process.env.DIAGNOSTIC_SECRET;
  if (!secret || req.nextUrl.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PRINTFUL_API_KEY env var is not set' }, { status: 503 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Test 1: validate the API key by fetching the store info
  const storeRes = await fetch('https://api.printful.com/store', { headers });
  const storeData = await storeRes.json();

  // Test 2: check each product ID exists in the catalog
  const productIds = [380, 447, 74];
  const productResults: Record<number, unknown> = {};
  for (const id of productIds) {
    const r = await fetch(`https://api.printful.com/products/${id}`, { headers });
    const d = await r.json();
    productResults[id] = { status: r.status, name: d?.result?.product?.title ?? d };
  }

  return NextResponse.json({
    store: { status: storeRes.status, name: storeData?.result?.name },
    products: productResults,
  });
}
