import type { PrintPosition } from './products';

const PRINTFUL_API = 'https://api.printful.com';

function headers() {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (process.env.PRINTFUL_STORE_ID) h['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
  return h;
}

export interface PrintfulOrderItem {
  variantId: number;
  quantity: number;
  files: { url: string; placement: string; position?: PrintPosition }[];
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export class PrintfulError extends Error {
  constructor(message: string, public status: number, public body?: unknown) { super(message); }
}

/**
 * Creates AND confirms the order (confirm=true) so it goes to production without a manual step.
 * Throws PrintfulError on any non-2xx answer so callers can retry or alert instead of assuming success.
 */
export async function createOrder(items: PrintfulOrderItem[], shipping: ShippingAddress, externalId: string) {
  if (!process.env.PRINTFUL_API_KEY) throw new PrintfulError('PRINTFUL_API_KEY not set', 503);
  const recipient: Record<string, string> = {
    name: shipping.name, address1: shipping.address1, city: shipping.city,
    country_code: shipping.country_code, zip: shipping.zip,
  };
  if (shipping.address2) recipient.address2 = shipping.address2;
  if (shipping.state_code) recipient.state_code = shipping.state_code;
  if (shipping.email) recipient.email = shipping.email;
  if (shipping.phone) recipient.phone = shipping.phone;

  const body = {
    external_id: externalId,
    shipping: 'STANDARD',
    recipient,
    items: items.map(i => ({
      variant_id: i.variantId,
      quantity: i.quantity,
      files: i.files.map(f => ({ type: f.placement, url: f.url, ...(f.position ? { position: f.position } : {}) })),
    })),
  };

  const res = await fetch(`${PRINTFUL_API}/orders?confirm=true`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(25_000),
  });
  const data = await res.json().catch(() => ({})) as { code?: number; result?: { id?: number; status?: string } | string; error?: { message?: string } };
  if (!res.ok || typeof data.result === 'string' || !data.result?.id) {
    const msg = (data.error?.message) || (typeof data.result === 'string' ? data.result : `Printful ${res.status}`);
    throw new PrintfulError(msg, res.status || 502, data);
  }
  return data.result as { id: number; status?: string };
}

/** Lightweight status read for Ops (tracking, shipments). */
export async function getOrder(printfulOrderId: number) {
  const res = await fetch(`${PRINTFUL_API}/orders/${printfulOrderId}`, { headers: headers(), signal: AbortSignal.timeout(15_000) });
  const data = await res.json().catch(() => ({})) as { result?: { id: number; status: string; shipments?: { tracking_number?: string; tracking_url?: string; carrier?: string }[] } };
  if (!res.ok || !data.result) throw new PrintfulError(`Printful ${res.status}`, res.status || 502, data);
  return data.result;
}
