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

// Mockup URL cache (key → mockupUrl). Module-level, persists across requests
// within the same warm serverless instance. Dramatically reduces Printful rate-limit hits.
const mockupCache = new Map<string, string>();
// In-flight task cache (key → taskKey) so duplicate requests reuse the same task.
const pendingTasks = new Map<string, string>();
// Reverse lookup: taskKey → cache key, so GET handler can populate mockupCache on completion.
const taskKeyToCacheKey = new Map<string, string>();

function mockupCacheKey(productId: number, variantId: number, imageUrl: string): string {
  return `${productId}:${variantId}:${imageUrl}`;
}

async function getStoreId(): Promise<number | null> {
  if (process.env.PRINTFUL_STORE_ID) return parseInt(process.env.PRINTFUL_STORE_ID);
  if (cachedStoreId) return cachedStoreId;

  // Try /store (store-level key) then /stores (OAuth / team key)
  for (const path of ['/store', '/stores']) {
    try {
      const res = await fetch(`${PRINTFUL_API}${path}`, { headers: headers() });
      const data = await res.json();
      console.log(`[Printful] ${path} status=${res.status} body=${JSON.stringify(data).slice(0, 300)}`);
      const result = data?.result;
      // /store returns { id }, /stores returns [{ id }, ...]
      const id = Array.isArray(result) ? result?.[0]?.id : result?.id;
      if (typeof id === 'number') {
        cachedStoreId = id;
        console.log(`[Printful] using store_id=${id} (from ${path})`);
        return id;
      }
    } catch (e) {
      console.error(`[Printful] ${path} fetch failed:`, e);
    }
  }
  console.error('[Printful] could not determine store_id from either endpoint — set PRINTFUL_STORE_ID env var');
  return null;
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

  // Proxy IPFS / external images through our own domain so Printful can reliably download them.
  // IMPORTANT: force https — on Vercel, req.nextUrl.protocol returns 'http:' behind the
  // load balancer, but the public URL is always HTTPS. If we send http:// to Printful,
  // Vercel 301-redirects to https:// and Printful doesn't follow redirects → task stuck pending.
  const baseUrl = `https://${req.nextUrl.host}`;
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

  // Cache check: if we already generated this mockup, return URL immediately
  const cacheKey = mockupCacheKey(product.printfulProductId, variantId, printfulImageUrl);
  const cachedUrl = mockupCache.get(cacheKey);
  if (cachedUrl) {
    console.log('[Printful] mockup cache hit for', cacheKey);
    return NextResponse.json({ mockupUrl: cachedUrl, cached: true });
  }
  // In-flight dedup: if an identical request is already pending, reuse its taskKey
  const pendingTaskKey = pendingTasks.get(cacheKey);
  if (pendingTaskKey) {
    console.log('[Printful] reusing in-flight taskKey for', cacheKey);
    return NextResponse.json({ taskKey: pendingTaskKey });
  }

  const storeId = await getStoreId();
  if (!storeId) {
    return NextResponse.json({ error: 'Could not determine Printful store_id' }, { status: 503 });
  }

  const reqBody = {
    store_id: storeId,
    variant_ids: [variantId],
    files: [fileEntry],
  };
  console.log('[Printful POST] image_url sent to Printful:', printfulImageUrl);
  console.log('[Printful POST] full body:', JSON.stringify(reqBody));

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${product.printfulProductId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(reqBody),
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

  // Track this task for dedup + later cache population
  pendingTasks.set(cacheKey, taskKey);
  taskKeyToCacheKey.set(taskKey, cacheKey);

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
    // Populate cache so subsequent identical requests skip Printful entirely
    if (mockupUrl) {
      const cacheKey = taskKeyToCacheKey.get(taskKey);
      if (cacheKey) {
        mockupCache.set(cacheKey, mockupUrl);
        pendingTasks.delete(cacheKey);
        taskKeyToCacheKey.delete(taskKey);
      }
    }
    return NextResponse.json({ status: 'completed', mockupUrl });
  }

  if (status === 'failed') {
    const reason = data?.result?.error ?? data?.result ?? data;
    console.error('[Printful mockup] task failed:', JSON.stringify(reason));
    const cacheKey = taskKeyToCacheKey.get(taskKey);
    if (cacheKey) {
      pendingTasks.delete(cacheKey);
      taskKeyToCacheKey.delete(taskKey);
    }
    return NextResponse.json({ status: 'failed', reason });
  }

  return NextResponse.json({ status: status ?? 'pending' });
}
