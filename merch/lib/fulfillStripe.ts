import type Stripe from 'stripe';
import { createOrder, PrintfulError } from './printful';
import { PRODUCTS, ProductType } from './products';
import { printReadyImageUrl } from './images';
import { kv, kvConfigured } from './kv';
import { getOrder, recordOrder, type OrderRecord } from './orders';

export type FulfillOutcome =
  | { status: 'created'; order: OrderRecord }
  | { status: 'duplicate'; order: OrderRecord }
  | { status: 'in_progress' }
  | { status: 'unpaid' }
  | { status: 'invalid'; reason: string }
  | { status: 'failed'; order: OrderRecord; permanent: boolean; error: string };

/**
 * Turns a paid Stripe Checkout Session into a Printful order, exactly once. Shared by the webhook
 * and by the success page (which acts as a fallback when the webhook never arrives).
 */
export async function fulfillStripeSession(session: Stripe.Checkout.Session): Promise<FulfillOutcome> {
  if (session.payment_status !== 'paid') return { status: 'unpaid' };
  const meta        = session.metadata ?? {};
  const variantId   = parseInt(meta.variantId ?? '');
  const productType = (meta.productType ?? '') as ProductType;
  const cubId       = meta.cubId ?? '';
  const product     = PRODUCTS[productType];
  if (!product || !variantId || !meta.cubImage || !product.variants.some(v => v.printfulVariantId === variantId)) {
    return { status: 'invalid', reason: 'missing or invalid order metadata' };
  }
  const addr  = session.shipping_details?.address;
  const name  = session.shipping_details?.name ?? session.customer_details?.name ?? 'OkayCubs Customer';
  const email = session.customer_details?.email ?? undefined;
  const phone = session.customer_details?.phone ?? undefined;
  if (!addr?.line1 || !addr.city || !addr.country) return { status: 'invalid', reason: 'no shipping address on session' };

  const orderId = `stripe-${session.id}`;
  const existing = await getOrder(orderId);
  if (existing?.printfulOrderId) return { status: 'duplicate', order: existing };   // a failed attempt stays retryable
  if (kvConfigured && !(await kv.setNX(`fulfilling:${session.id}`, 1, 60))) return { status: 'in_progress' };

  const image = await printReadyImageUrl(meta.cubImage);
  const shippingCents = parseInt(meta.shippingCents ?? '0') || 0;
  const base = {
    id: orderId, method: 'stripe' as const, createdAt: Date.now(),
    productType, variantId, cubId, cubImage: image.url, email, name, country: addr.country,
    itemCents: product.basePrice, shippingCents, totalCents: session.amount_total ?? product.basePrice + shippingCents,
    stripeSessionId: session.id,
  };
  try {
    const result = await createOrder(
      [{ variantId, quantity: 1, files: [{ url: image.url, placement: product.printPlacement, position: product.printPosition }] }],
      {
        name, address1: addr.line1, address2: addr.line2 ?? undefined, city: addr.city,
        state_code: addr.state ?? '', country_code: addr.country, zip: addr.postal_code ?? '', email, phone,
      },
      `${orderId}-${cubId.slice(0, 12)}`,
    );
    const order: OrderRecord = { ...base, printfulOrderId: result.id, printfulStatus: result.status };
    await recordOrder(order);
    return { status: 'created', order };
  } catch (err) {
    const msg = err instanceof PrintfulError ? `${err.message} (${err.status})` : (err instanceof Error ? err.message : String(err));
    const permanent = err instanceof PrintfulError && err.status >= 400 && err.status < 500;
    const order: OrderRecord = { ...base, printfulOrderId: null, error: msg };
    await recordOrder(order);
    if (kvConfigured) await kv.del(`fulfilling:${session.id}`).catch(() => {});
    return { status: 'failed', order, permanent, error: msg };
  }
}
