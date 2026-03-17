import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { PRODUCTS, ProductType } from '@/lib/products';

export async function POST(req: NextRequest) {
  const { productType, variantId, cubId, cubImage, mockupUrl } = await req.json();

  if (!productType || !variantId || !cubId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const product = PRODUCTS[productType as ProductType];
  if (!product) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      productName:  `${product.name} — ${cubId}`,
      imageUrl:     mockupUrl || cubImage || `${origin}/logo.png`,
      amountCents:  product.basePrice,
      cubId,
      cubImage:     cubImage || '',
      productType,
      variantId,
      successUrl:   `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:    `${origin}/products/${productType}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: 'Checkout creation failed' }, { status: 500 });
  }
}
