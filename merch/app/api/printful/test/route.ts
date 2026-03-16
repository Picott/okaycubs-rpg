import { NextResponse } from 'next/server';

// GET /api/printful/test — checks API key + product IDs without creating anything
// Visit this URL in your browser to see the exact Printful error.
export async function GET() {
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
    apiKeyPrefix: apiKey.slice(0, 8) + '…',
    store: { status: storeRes.status, data: storeData },
    products: productResults,
  });
}
