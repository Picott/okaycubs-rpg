import { NextRequest, NextResponse } from 'next/server';

const HELIUS_KEY = process.env.HELIUS_KEY;

// Proxy for Helius JSON-RPC — keeps the API key server-side
export async function POST(req: NextRequest) {
  if (!HELIUS_KEY) {
    return NextResponse.json({ error: 'Helius key not configured' }, { status: 503 });
  }
  const body = await req.text();
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
