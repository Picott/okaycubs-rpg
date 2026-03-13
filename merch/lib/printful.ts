const PRINTFUL_API = 'https://api.printful.com';

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
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
