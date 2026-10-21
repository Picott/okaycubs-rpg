import { NextRequest, NextResponse } from 'next/server';

const TENSOR_KEY = process.env.TENSOR_API_KEY;

// Proxy for Tensor GraphQL — keeps the API key server-side
export async function POST(req: NextRequest) {
  if (!TENSOR_KEY) {
    return NextResponse.json({ errors: [{ message: 'Tensor key not configured' }] }, { status: 503 });
  }
  const body = await req.text();
  try {
    const res = await fetch('https://api.tensor.so/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TENSOR-API-KEY': TENSOR_KEY,
      },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Tensor unreachable';
    return NextResponse.json({ errors: [{ message }] }, { status: 502 });
  }
}
