import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createOrder } from '@/lib/printful';
import { PRODUCTS, ProductType } from '@/lib/products';

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

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session     = event.data.object as Stripe.Checkout.Session;
  const meta        = session.metadata ?? {};
  const variantId   = parseInt(meta.variantId ?? '');
  const cubImage    = meta.cubImage ?? '';
  const productType = (meta.productType ?? '') as ProductType;
  const cubId       = meta.cubId ?? '';

  // Only act on paid sessions
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  const product = PRODUCTS[productType];
  if (!product || !variantId || !cubImage) {
    console.error('[webhook] Missing metadata — cannot place Printful order', meta);
    return NextResponse.json({ error: 'Missing order metadata' }, { status: 422 });
  }

  // Extract shipping from Stripe's collected address
  const addr = session.shipping_details?.address;
  const name = session.shipping_details?.name ?? session.customer_details?.name ?? 'OkayCubs Customer';

  if (!addr?.line1 || !addr.city || !addr.country) {
    console.error('[webhook] No shipping address on session', session.id);
    return NextResponse.json({ error: 'No shipping address' }, { status: 422 });
  }

  try {
    const result = await createOrder(
      [
        {
          variantId,
          quantity: 1,
          files: [{ url: cubImage, placement: product.printPlacement }],
        },
      ],
      {
        name,
        address1:     addr.line1 + (addr.line2 ? ` ${addr.line2}` : ''),
        city:         addr.city,
        state_code:   addr.state ?? '',
        country_code: addr.country,
        zip:          addr.postal_code ?? '',
      },
      // Use Stripe session ID as the external ID so we can trace it
      `stripe-${session.id}-${cubId}`,
    );

    console.log('[webhook] Printful order created:', result?.result?.id ?? result);
    return NextResponse.json({ received: true, printfulOrderId: result?.result?.id });
  } catch (err) {
    console.error('[webhook] Printful createOrder failed:', err);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: 'Printful order failed' }, { status: 500 });
  }
}
