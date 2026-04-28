import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { PRODUCTS, ProductType } from '@/lib/products';

const PRINTFUL_API = 'https://api.printful.com';

// Blob URL cache: original image URL → Vercel Blob URL.
// Persists across requests within the same warm instance so we don't re-upload the same image.
const blobUrlCache = new Map<string, string>();

// IPFS gateway list for fetching images server-side
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://nftstorage.link/ipfs/',
];

const IPFS_GATEWAY_PATTERN =
  /^https?:\/\/(?:nftstorage\.link|ipfs\.io|cloudflare-ipfs\.com|gateway\.pinata\.cloud|w3s\.link|dweb\.link|gateway\.ipfs\.io)\/ipfs\/(.+)/;

interface ReHostResult {
  url: string | null;
  failedStep?: 'download' | 'upload' | 'no_blob_token';
  detail?: string;
}

/**
 * Download an image from IPFS (trying multiple gateways) or any HTTPS URL,
 * then upload it to Vercel Blob so Printful gets a fast, reliable URL.
 */
async function reHostImage(imageUrl: string): Promise<ReHostResult> {
  // Check Blob token first
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { url: null, failedStep: 'no_blob_token', detail: 'BLOB_READ_WRITE_TOKEN env var not set. Create a Blob store in Vercel Dashboard → Storage.' };
  }

  // Already cached?
  const cached = blobUrlCache.get(imageUrl);
  if (cached) {
    console.log('[Blob] cache hit:', cached);
    return { url: cached };
  }

  // Build candidate URLs (multiple gateways for IPFS)
  let candidates: string[];
  const m = imageUrl.match(IPFS_GATEWAY_PATTERN);
  if (m) {
    const cidPath = m[1];
    candidates = IPFS_GATEWAYS.map(gw => `${gw}${cidPath}`);
  } else {
    candidates = [imageUrl];
  }

  // Try each candidate until one succeeds
  let imageBuffer: Buffer | null = null;
  let contentType = 'image/png';
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      console.log('[Blob] trying to download from:', url);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OkayCubs-Store/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        errors.push(`${url} → ${res.status}`);
        continue;
      }
      imageBuffer = Buffer.from(await res.arrayBuffer());
      contentType = res.headers.get('content-type') || 'image/png';
      console.log('[Blob] downloaded', imageBuffer.length, 'bytes from', url);
      break;
    } catch (e) {
      errors.push(`${url} → ${String(e)}`);
      console.warn('[Blob] failed to download from', url, e);
    }
  }

  if (!imageBuffer) {
    console.error('[Blob] all download attempts failed for', imageUrl);
    return { url: null, failedStep: 'download', detail: errors.join(' | ') };
  }

  // Upload to Vercel Blob (allowOverwrite so re-uploads of same Cub don't fail)
  try {
    const filename = m ? `cubs/${m[1].replace(/\//g, '-')}` : `cubs/${Date.now()}.png`;
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log('[Blob] uploaded to Vercel Blob:', blob.url);
    blobUrlCache.set(imageUrl, blob.url);
    return { url: blob.url };
  } catch (e) {
    console.error('[Blob] upload failed:', e);
    return { url: null, failedStep: 'upload', detail: String(e) };
  }
}

function headers(storeId?: number | null) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (storeId) h['X-PF-Store-Id'] = String(storeId);
  return h;
}

// Cache the store_id so we only fetch it once per cold start
let cachedStoreId: number | null = null;

// Mockup URL cache (key → mockupUrl). Module-level, persists across requests
// within the same warm serverless instance. Dramatically reduces Printful rate-limit hits.
const mockupCache = new Map<string, string>();
// In-flight task cache (key → {taskKey, createdAt}) so duplicate requests reuse the same task.
// Entries older than PENDING_TTL_MS are evicted to avoid stuck tasks blocking forever.
const PENDING_TTL_MS = 120_000; // 2 minutes
const pendingTasks = new Map<string, { taskKey: string; createdAt: number }>();
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

  const storeId = await getStoreId();
  if (!storeId) {
    return NextResponse.json({ error: 'Could not determine Printful store_id' }, { status: 503 });
  }

  // Resolve the actual image URL — if client sent a proxy URL, extract the original
  let originalImageUrl = imageUrl;
  if (imageUrl.includes('/api/printful/proxy-image')) {
    try {
      const u = new URL(imageUrl);
      const original = u.searchParams.get('url');
      if (original) originalImageUrl = original;
    } catch {}
  }

  // Download the image and re-host on Vercel Blob so Printful gets a fast, stable URL.
  // Printful cannot download from IPFS gateways (tasks stuck pending forever).
  const reHostResult = await reHostImage(originalImageUrl);
  if (!reHostResult.url) {
    return NextResponse.json({
      error: 'Failed to download and re-host image',
      step: reHostResult.failedStep,
      detail: reHostResult.detail,
      originalUrl: originalImageUrl,
    }, { status: 502 });
  }
  const printfulImageUrl = reHostResult.url;
  console.log('[Printful] image re-hosted for Printful:', printfulImageUrl);

  // Build file entry
  const fileEntry: Record<string, unknown> = {
    placement: product.printPlacement,
    image_url: printfulImageUrl,
  };
  if (product.printPosition) {
    fileEntry.position = product.printPosition;
  }

  // Cache check
  const cacheKey = mockupCacheKey(product.printfulProductId, variantId, printfulImageUrl);
  const cachedUrl = mockupCache.get(cacheKey);
  if (cachedUrl) {
    return NextResponse.json({ mockupUrl: cachedUrl, cached: true });
  }
  // In-flight dedup with TTL
  const pending = pendingTasks.get(cacheKey);
  if (pending) {
    if (Date.now() - pending.createdAt < PENDING_TTL_MS) {
      return NextResponse.json({ taskKey: pending.taskKey });
    }
    pendingTasks.delete(cacheKey);
    taskKeyToCacheKey.delete(pending.taskKey);
  }

  // Per OpenAPI spec: format is REQUIRED, store_id goes in X-PF-Store-Id header
  const reqBody = {
    variant_ids: [variantId],
    format: 'jpg',
    files: [fileEntry],
  };

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${product.printfulProductId}`, {
    method: 'POST',
    headers: headers(storeId),
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
  pendingTasks.set(cacheKey, { taskKey, createdAt: Date.now() });
  taskKeyToCacheKey.set(taskKey, cacheKey);

  return NextResponse.json({ taskKey, _debug_image_url: printfulImageUrl });
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

  // Must include X-PF-Store-Id header — without it Printful may not resolve the task
  const storeId = await getStoreId();

  const res = await fetch(`${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`, {
    headers: headers(storeId),
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
