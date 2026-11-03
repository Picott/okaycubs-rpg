import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS, ProductType } from '@/lib/products';
import { COUNTRY_CODES, STATE_REQUIRED, quoteShipping } from '@/lib/shipping';
import { getSolPriceUsd, usdToLamports } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// GET /api/shipping/quote?productType=hoodie&variantId=10779&country=CO&state=&zip=
// Standard shipping for one unit plus the SOL conversion of the total, so the product page can show
// "item + shipping = total" before any payment starts. The same function prices the real checkout.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const productType = q.get('productType') as ProductType, variantId = Number(q.get('variantId'));
  const country = (q.get('country') || '').toUpperCase(), state = q.get('state') || '', zip = q.get('zip') || '';
  const product = PRODUCTS[productType];
  if (!product) return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  if (!product.variants.some(v => v.printfulVariantId === variantId)) return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
  if (!COUNTRY_CODES.has(country)) return NextResponse.json({ error: 'We do not ship to that country yet' }, { status: 400 });

  const shipping = await quoteShipping(productType, variantId, { country, state, zip });
  const itemCents = product.basePrice, totalCents = itemCents + shipping.cents;
  let solPrice: number | null = null, lamports: number | null = null;
  try { solPrice = await getSolPriceUsd(); lamports = usdToLamports(totalCents, solPrice); } catch {}

  return NextResponse.json({
    itemCents, shippingCents: shipping.cents, totalCents,
    estimated: shipping.estimated, customs: shipping.customs, minDays: shipping.minDays ?? null, maxDays: shipping.maxDays ?? null,
    stateRequired: STATE_REQUIRED.has(country),
    solPrice, lamports, totalSol: lamports ? (lamports / 1e9).toFixed(4) : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
