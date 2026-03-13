import { NextRequest, NextResponse } from 'next/server';
import { createPaymentURL, verifySolanaPayment } from '@/lib/solana';
import { PRODUCTS, ProductType } from '@/lib/products';

// GET — verify a payment by reference key
export async function GET(req: NextRequest) {
  const ref      = req.nextUrl.searchParams.get('reference');
  const lamports = req.nextUrl.searchParams.get('lamports');

  if (!ref || !lamports) {
    return NextResponse.json({ error: 'Missing reference or lamports' }, { status: 400 });
  }

  const result = await verifySolanaPayment(ref, parseInt(lamports));
  return NextResponse.json(result);
}

// POST — create a Solana Pay URL
export async function POST(req: NextRequest) {
  const { productType, cubId, solPriceUsd } = await req.json();

  if (!productType || !cubId || !solPriceUsd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const product = PRODUCTS[productType as ProductType];
  if (!product) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  const amountUsd = product.basePrice / 100;
  const memo      = `okaycubs-${cubId}-${productType}-${Date.now()}`;

  const url = createPaymentURL({
    amountUsd,
    solPriceUsd,
    label:   'OkayCubs Merch',
    message: `${product.name} — ${cubId}`,
    memo,
  });

  const solAmount = (amountUsd / solPriceUsd).toFixed(6);

  return NextResponse.json({ url: url.toString(), solAmount, memo });
}
