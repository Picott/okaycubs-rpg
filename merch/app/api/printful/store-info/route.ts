import { NextResponse } from 'next/server';

// GET /api/printful/store-info
// Shows what Printful returns for /store and /stores so we can determine store_id.
// Open this URL in your browser to debug.
export async function GET() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PRINTFUL_API_KEY not set' }, { status: 503 });
  }

  const hdrs = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  const results: Record<string, unknown> = {};

  for (const path of ['/store', '/stores', '/store/statistics']) {
    try {
      const res = await fetch(`https://api.printful.com${path}`, { headers: hdrs });
      const body = await res.json();
      results[path] = { httpStatus: res.status, body };
    } catch (e) {
      results[path] = { error: String(e) };
    }
  }

  return NextResponse.json({
    apiKeyPrefix: apiKey.slice(0, 6) + '...' + apiKey.slice(-4),
    envStoreId: process.env.PRINTFUL_STORE_ID ?? null,
    results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
