import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { fulfillStripeSession } from '@/lib/fulfillStripe';

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

  const outcome = await fulfillStripeSession(event.data.object as Stripe.Checkout.Session);
  switch (outcome.status) {
    case 'created':     console.log('[webhook] Printful order created:', outcome.order.printfulOrderId); return NextResponse.json({ received: true, printfulOrderId: outcome.order.printfulOrderId });
    case 'duplicate':   return NextResponse.json({ received: true, duplicate: true });
    case 'in_progress': return NextResponse.json({ received: true, inProgress: true });
    case 'unpaid':      return NextResponse.json({ received: true });
    case 'invalid':     console.error('[webhook]', outcome.reason); return NextResponse.json({ error: outcome.reason }, { status: 422 });
    case 'failed':
      console.error('[webhook] Printful createOrder failed:', outcome.error);
      // a 4xx from Printful will not fix itself: record it and stop Stripe's retries; anything else, let Stripe retry
      return NextResponse.json({ error: 'Printful order failed', detail: outcome.error }, { status: outcome.permanent ? 200 : 500 });
  }
}
