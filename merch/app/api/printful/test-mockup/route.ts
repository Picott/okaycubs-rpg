import { NextResponse } from 'next/server';

const PRINTFUL_API = 'https://api.printful.com';

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// GET /api/printful/test-mockup
// Creates a mockup with a well-known public test image, then polls once.
// Use this to test if Printful mockup generation works AT ALL.
export async function GET() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 503 });

  // Use a well-known public PNG (Printful sample — 1000×1000 placeholder)
  const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/800px-Good_Food_Display_-_NCI_Visuals_Online.jpg';

  // Determine store_id — try env, then /store, then /stores
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

  // Create task for hoodie product 380, variant 10779 (Black S)
  const body = {
    store_id: storeId,
    variant_ids: [10779],
    files: [{
      placement: 'front',
      image_url: testImageUrl,
      position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
    }],
  };

  const createRes = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/380`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const createData = await createRes.json();
  const taskKey = createData?.result?.task_key;

  if (!taskKey) {
    return NextResponse.json({
      step: 'create-task',
      httpStatus: createRes.status,
      response: createData,
      bodySent: body,
    });
  }

  // Poll 10 times, 3s apart (30s total)
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`, {
      headers: headers(),
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
    message: 'Task still pending after 30s polling',
  });
}
