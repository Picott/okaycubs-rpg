import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS, ProductType } from '@/lib/products';

const PRINTFUL_API = 'https://api.printful.com';

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// POST — create the mockup task, return task_key immediately
export async function POST(req: NextRequest) {
  const { productType, variantId, imageUrl } = await req.json();

  if (!productType || !variantId || !imageUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json({ error: 'Printful API key not configured' }, { status: 503 });
  }

  const product = PRODUCTS[productType as ProductType];
  if (!product) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${product.printfulProductId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      variant_ids: [variantId],
      files: [{
        placement: product.printPlacement,
        image_url: imageUrl,
        position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
      }],
    }),
  });

  const data = await res.json();
  const taskKey = data?.result?.task_key;

  if (!taskKey) {
    return NextResponse.json({ error: 'Failed to create mockup task', detail: data }, { status: 502 });
  }

  return NextResponse.json({ taskKey });
}

// GET — poll task status, return mockupUrl when ready
export async function GET(req: NextRequest) {
  const taskKey = req.nextUrl.searchParams.get('task_key');

  if (!taskKey) {
    return NextResponse.json({ error: 'Missing task_key' }, { status: 400 });
  }

  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json({ error: 'Printful API key not configured' }, { status: 503 });
  }

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`, {
    headers: headers(),
  });

  const data = await res.json();
  const status = data?.result?.status;

  if (status === 'completed') {
    const mockupUrl = data?.result?.mockups?.[0]?.mockup_url ?? null;
    return NextResponse.json({ status: 'completed', mockupUrl });
  }

  if (status === 'failed') {
    return NextResponse.json({ status: 'failed' });
  }

  return NextResponse.json({ status: status ?? 'pending' });
}
