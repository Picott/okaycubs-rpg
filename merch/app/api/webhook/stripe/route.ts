import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createOrder, PrintfulError } from '@/lib/printful';
import { PRODUCTS, ProductType } from '@/lib/products';
import { printReadyImageUrl } from '@/lib/images';
import { kv, kvConfigured } from '@/lib/kv';
import { getOrder, recordOrder } from '@/lib/orders';

// Stripe requires the raw body for signature verification — don't parse JSON first.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig     = req.headers.get('stripe-signature') ?? '';
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET env var not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });

  const session     = event.data.object as Stripe.Checkout.Session;
  const meta        = session.metadata ?? {};
  const variantId   = parseInt(meta.variantId ?? '');
  const productType = (meta.productType ?? '') as ProductType;
  const cubId       = meta.cubId ?? '';
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

  const product = PRODUCTS[productType];
  if (!product || !variantId || !meta.cubImage || !product.variants.some(v => v.printfulVariantId === variantId)) {
    console.error('[webhook] Missing or invalid metadata — cannot place Printful order', meta);
    return NextResponse.json({ error: 'Missing order metadata' }, { status: 422 });
  }

  const addr  = session.shipping_details?.address;
  const name  = session.shipping_details?.name ?? session.customer_details?.name ?? 'OkayCubs Customer';
  const email = session.customer_details?.email ?? undefined;
  const phone = session.customer_details?.phone ?? undefined;
  if (!addr?.line1 || !addr.city || !addr.country) {
    console.error('[webhook] No shipping address on session', session.id);
    return NextResponse.json({ error: 'No shipping address' }, { status: 422 });
  }

  // Stripe retries webhooks; one order per session no matter how many deliveries arrive
  const orderId = `stripe-${session.id}`;
  const existing = await getOrder(orderId);
  if (existing?.printfulOrderId) return NextResponse.json({ received: true, duplicate: true });   // a failed attempt stays retryable
  if (kvConfigured && !(await kv.setNX(`fulfilling:${session.id}`, 1, 60))) return NextResponse.json({ received: true, inProgress: true });

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
    await recordOrder({ ...base, printfulOrderId: result.id, printfulStatus: result.status });
    console.log('[webhook] Printful order created:', result.id);
    return NextResponse.json({ received: true, printfulOrderId: result.id });
  } catch (err) {
    const msg = err instanceof PrintfulError ? `${err.message} (${err.status})` : (err instanceof Error ? err.message : String(err));
    console.error('[webhook] Printful createOrder failed:', msg);
    // keep the paid order visible to Ops, release the lock and let Stripe retry (a 4xx from Printful will not fix itself, so record it and stop retrying)
    const permanent = err instanceof PrintfulError && err.status >= 400 && err.status < 500;
    await recordOrder({ ...base, printfulOrderId: null, error: msg });
    if (kvConfigured) await kv.del(`fulfilling:${session.id}`).catch(() => {});
    return NextResponse.json({ error: 'Printful order failed', detail: msg }, { status: permanent ? 200 : 500 });
  }
}
