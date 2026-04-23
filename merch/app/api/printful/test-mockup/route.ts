import { NextResponse } from 'next/server';

const PRINTFUL_API = 'https://api.printful.com';

function headers(storeId?: number | null) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (storeId) h['X-PF-Store-Id'] = String(storeId);
  return h;
}

// GET /api/printful/test-mockup
// Per OpenAPI spec: format is REQUIRED, store_id goes in X-PF-Store-Id header.
// No /files upload — Printful only accepts URLs, not binary data.
export async function GET(req: Request) {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 503 });

  // Accept ?image= param to test different image sources
  const reqUrl = new URL(req.url);
  const imageParam = reqUrl.searchParams.get('image') || 'test';
  let testImageUrl: string;
  if (imageParam === 'blob') {
    // Real Cub image already on Vercel Blob
    testImageUrl = 'https://fjunpxifit7n56gn.public.blob.vercel-storage.com/cubs/QmZsTzg9Y88239r1uU2zkvdBYooJZNteu5NuUwLcFQYoqf-4898.png';
  } else if (imageParam.startsWith('http')) {
    // Custom URL passed directly
    testImageUrl = imageParam;
  } else {
    // Default: our tiny self-hosted test image
    testImageUrl = `${reqUrl.origin}/api/printful/test-image`;
  }

  // Determine store_id
  let storeId: number | null = process.env.PRINTFUL_STORE_ID ? parseInt(process.env.PRINTFUL_STORE_ID) : null;
  if (!storeId) {
    for (const path of ['/store', '/stores']) {
      try {
        const r = await fetch(`${PRINTFUL_API}${path}`, { headers: headers() });
        const d = await r.json();
        const result = d?.result;
        const id = Array.isArray(result) ? result?.[0]?.id : result?.id;
        if (typeof id === 'number') { storeId = id; break; }
      } catch {}
    }
  }

  // Create task — per OpenAPI spec: format is required, store_id in header
  const body = {
    variant_ids: [10779],
    format: 'jpg',
    files: [{
      placement: 'front',
      image_url: testImageUrl,
      position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
    }],
  };

  const createRes = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/380`, {
    method: 'POST',
    headers: headers(storeId),
    body: JSON.stringify(body),
  });
  const createData = await createRes.json();
  const taskKey = createData?.result?.task_key;

  if (!taskKey) {
    return NextResponse.json({
      step: 'create-task-failed',
      httpStatus: createRes.status,
      response: createData,
      bodySent: body,
      storeId,
    });
  }

  // Poll 15 times, 3s apart (45s total)
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`, {
      headers: headers(storeId),
    });
    const pollData = await pollRes.json();
    const status = pollData?.result?.status;

    if (status === 'completed') {
      return NextResponse.json({
        step: 'completed',
        attempt: i + 1,
        taskKey,
        mockupUrl: pollData?.result?.mockups?.[0]?.mockup_url,
        storeId,
        imageUrlSent: testImageUrl,
      });
    }
    if (status === 'failed') {
      return NextResponse.json({
        step: 'failed',
        attempt: i + 1,
        taskKey,
        reason: pollData?.result?.error ?? pollData?.result,
        storeId,
        imageUrlSent: testImageUrl,
      });
    }
  }

  return NextResponse.json({
    step: 'timeout',
    taskKey,
    storeId,
    imageUrlSent: testImageUrl,
    message: 'Task still pending after 45s polling',
  });
}
