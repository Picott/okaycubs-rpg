const PRINTFUL_API = 'https://api.printful.com';
const KEY = process.env.PRINTFUL_API_KEY!;

function headers() {
  return {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function generateMockup(
  productId: number,
  variantId: number,
  placement: string,
  imageUrl: string
): Promise<string | null> {
  // Step 1: create mockup generation task
  const task = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      variant_ids: [variantId],
      files: [{ placement, image_url: imageUrl, position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 } }],
    }),
  });

  const taskData = await task.json();
  const taskKey = taskData?.result?.task_key;
  if (!taskKey) return null;

  // Step 2: poll until done (max ~15s)
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const result = await fetch(
      `${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`,
      { headers: headers() }
    );
    const data = await result.json();
    if (data?.result?.status === 'completed') {
      return data?.result?.mockups?.[0]?.mockup_url ?? null;
    }
    if (data?.result?.status === 'failed') return null;
  }

  return null;
}

export interface PrintfulOrderItem {
  variantId: number;
  quantity: number;
  files: { url: string; placement: string }[];
}

export interface ShippingAddress {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
}

export async function createOrder(
  items: PrintfulOrderItem[],
  shipping: ShippingAddress,
  externalId: string
) {
  const body = {
    external_id: externalId,
    shipping: 'STANDARD',
    recipient: shipping,
    items: items.map(i => ({
      variant_id: i.variantId,
      quantity: i.quantity,
      files: i.files.map(f => ({ type: f.placement, url: f.url })),
    })),
  };

  const res = await fetch(`${PRINTFUL_API}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  return res.json();
}
