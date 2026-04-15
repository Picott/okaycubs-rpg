import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS, ProductType } from '@/lib/products';

const PRINTFUL_API = 'https://api.printful.com';

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Cache the store_id so we only fetch it once per cold start
let cachedStoreId: number | null = null;

async function getStoreId(): Promise<number | null> {
  if (process.env.PRINTFUL_STORE_ID) return parseInt(process.env.PRINTFUL_STORE_ID);
  if (cachedStoreId) return cachedStoreId;
  try {
    const res = await fetch(`${PRINTFUL_API}/stores`, { headers: headers() });
    const data = await res.json() as { result?: Array<{ id: number }> };
    cachedStoreId = data?.result?.[0]?.id ?? null;
    console.log('[Printful] auto-fetched store_id:', cachedStoreId);
    return cachedStoreId;
  } catch {
    console.error('[Printful] failed to fetch store_id');
    return null;
  }
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

  // Proxy IPFS / external images through our own domain so Printful can reliably download them
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const printfulImageUrl = imageUrl.startsWith(baseUrl)
    ? imageUrl
    : `${baseUrl}/api/printful/proxy-image?url=${encodeURIComponent(imageUrl)}`;

  // Build file entry — only include position when explicitly configured
  // (omitting it lets Printful use the default center placement, which works for caps/joggers)
  const fileEntry: Record<string, unknown> = {
    placement: product.printPlacement,
    image_url: printfulImageUrl,
  };
  if (product.printPosition) {
    fileEntry.position = product.printPosition;
  }

  const storeId = await getStoreId();
  if (!storeId) {
    return NextResponse.json({ error: 'Could not determine Printful store_id' }, { status: 503 });
  }

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${product.printfulProductId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      store_id: storeId,
      variant_ids: [variantId],
      files: [fileEntry],
    }),
  });

  const data = await res.json();
  console.log('[Printful POST]', res.status, JSON.stringify(data));
  const taskKey = data?.result?.task_key;

  if (!taskKey) {
    // Propagate 429 with retry-after so the client can back off
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') ?? '60';
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: parseInt(retryAfter) },
        { status: 429 },
      );
    }
    // 400 = bad product/variant config — not retriable
    if (res.status === 400) {
      return NextResponse.json(
        { error: 'bad_config', detail: data?.result ?? data },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to create mockup task', printfulStatus: res.status, detail: data }, { status: 502 });
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
    const reason = data?.result?.error ?? data?.result ?? data;
    console.error('[Printful mockup] task failed:', JSON.stringify(reason));
    return NextResponse.json({ status: 'failed', reason });
  }

  return NextResponse.json({ status: status ?? 'pending' });
}
