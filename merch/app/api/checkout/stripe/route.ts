import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { PRODUCTS, ProductType } from '@/lib/products';
import { COUNTRY_CODES, quoteShipping } from '@/lib/shipping';

export async function POST(req: NextRequest) {
  const { productType, variantId, cubId, cubName, cubImage, mockupUrl, country, state, zip } = await req.json().catch(() => ({}));

  if (!productType || !variantId || !cubId || !cubImage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const product = PRODUCTS[productType as ProductType];
  if (!product) return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  // the price is the product's, never the client's — and the variant must belong to this product
  if (!product.variants.some(v => v.printfulVariantId === Number(variantId))) {
    return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
  }
  const dest = String(country || '').toUpperCase();
  if (!COUNTRY_CODES.has(dest)) return NextResponse.json({ error: 'We do not ship to that country yet' }, { status: 400 });

  const origin = req.nextUrl.origin;
  try {
    const shipping = await quoteShipping(productType, Number(variantId), { country: dest, state, zip });
    const days = shipping.minDays && shipping.maxDays ? ` · ${shipping.minDays}–${shipping.maxDays} business days` : '';
    const session = await createCheckoutSession({
      productName:   `${product.name} — ${cubName || cubId.slice(0, 8) + '…'}`,
      imageUrl:      mockupUrl || cubImage || `${origin}/logo.png`,
      amountCents:   product.basePrice,
      shippingCents: shipping.cents,
      shippingLabel: `Standard shipping to ${dest}${days}${shipping.customs ? ' · import duties may apply on delivery' : ''}`,
      country:       dest,
      cubId,
      cubImage,
      productType,
      variantId:     Number(variantId),
      successUrl:    `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:     `${origin}/products/${productType}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    // surface Stripe's own reason (no secrets in it) so a misconfigured key or an unactivated account is visible
    const e = err as { type?: string; code?: string; message?: string; statusCode?: number };
    const reason = e?.type?.startsWith('Stripe') ? `${e.type}${e.code ? ` (${e.code})` : ''}: ${e.message ?? ''}`.slice(0, 300) : undefined;
    return NextResponse.json({ error: 'Checkout creation failed', reason }, { status: 500 });
  }
}
