import { NextRequest, NextResponse } from 'next/server';
import { verifySolanaPayment } from '@/lib/solana';
import { createOrder, externalIdFor, PrintfulError } from '@/lib/printful';
import { PRODUCTS } from '@/lib/products';
import { printReadyImageUrl } from '@/lib/images';
import { kv, kvConfigured } from '@/lib/kv';
import { recordOrder, getOrder } from '@/lib/orders';
import { buildOrderItem } from '@/lib/orderItem';
import { intentKey, type SolIntent } from '@/lib/solIntent';

export const dynamic = 'force-dynamic';

// The browser polls this with the reference only. Everything else comes from the stored intent, the
// payment is verified on-chain against the intent's lamports, and the order is created exactly once.
export async function POST(req: NextRequest) {
  if (!kvConfigured) return NextResponse.json({ error: 'SOL checkout is not available right now' }, { status: 503 });
  const { reference } = await req.json().catch(() => ({}));
  if (typeof reference !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(reference)) {
    return NextResponse.json({ error: 'Bad reference' }, { status: 400 });
  }
  const orderId = `sol-${reference}`;

  // already fulfilled → same answer every time
  const existing = await getOrder(orderId);
  if (existing?.printfulOrderId) return NextResponse.json({ verified: true, signature: existing.txSignature, printfulOrderId: existing.printfulOrderId, orderId });

  const intent = await kv.get<SolIntent>(intentKey(reference));
  if (!intent) return NextResponse.json({ verified: false, error: 'Unknown or expired payment' }, { status: 404 });

  const pay = await verifySolanaPayment(reference, intent.lamports);
  if (!pay.verified) {
    return NextResponse.json({ verified: false, pending: pay.pending, error: pay.pending ? 'Payment not confirmed yet' : pay.error }, { status: pay.pending ? 202 : 400 });
  }

  // one fulfilment per reference, even with concurrent polls
  if (!(await kv.setNX(`fulfilling:${reference}`, 1, 60))) return NextResponse.json({ verified: true, pending: true, error: 'Order in progress' }, { status: 202 });

  const product = PRODUCTS[intent.productType];
  const image = await printReadyImageUrl(intent.cubImage);
  const base = {
    id: orderId, method: 'sol' as const, createdAt: Date.now(),
    productType: intent.productType, variantId: intent.variantId, cubId: intent.cubId, cubImage: image.url,
    email: intent.shipping.email, name: intent.shipping.name, country: intent.shipping.country,
    itemCents: intent.itemCents, shippingCents: intent.shippingCents, totalCents: intent.totalCents,
    lamports: intent.lamports, txSignature: pay.signature,
  };
  try {
    const result = await createOrder(
      [await buildOrderItem(product, intent.variantId, image.url)],
      {
        name: intent.shipping.name, address1: intent.shipping.address1, address2: intent.shipping.address2, city: intent.shipping.city,
        state_code: intent.shipping.state, country_code: intent.shipping.country, zip: intent.shipping.zip,
        email: intent.shipping.email, phone: intent.shipping.phone,
      },
      externalIdFor(orderId),
    );
    await recordOrder({ ...base, printfulOrderId: result.id, printfulStatus: result.status });
    await kv.del(intentKey(reference)).catch(() => {});
    return NextResponse.json({ verified: true, signature: pay.signature, printfulOrderId: result.id, orderId });
  } catch (err) {
    // paid but not produced: keep a record flagged with the error so Ops can place it by hand
    const msg = err instanceof PrintfulError ? `${err.message} (${err.status})` : (err instanceof Error ? err.message : String(err));
    console.error('[solana/fulfill] Printful order failed for', orderId, msg);
    await recordOrder({ ...base, printfulOrderId: null, error: msg });
    await kv.del(`fulfilling:${reference}`).catch(() => {});
    return NextResponse.json({ verified: true, signature: pay.signature, printfulOrderId: null, orderId, needsAttention: true });
  }
}
