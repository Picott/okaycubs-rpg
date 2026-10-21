import { NextRequest, NextResponse } from 'next/server';

const HELIUS_KEY = process.env.HELIUS_KEY || 'b5292800-573a-40c5-9104-fa505b84baa9';

// Proxy for Helius JSON-RPC — keeps the API key server-side
export async function POST(req: NextRequest) {
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
