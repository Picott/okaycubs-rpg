import { NextRequest, NextResponse } from 'next/server';
import { createPaymentURL, verifySolanaPayment } from '@/lib/solana';
import { PRODUCTS, ProductType } from '@/lib/products';
import { COUNTRY_CODES, STATE_REQUIRED, quoteShipping } from '@/lib/shipping';
import { getSolPriceUsd, usdToLamports } from '@/lib/pricing';
import { kv, kvConfigured } from '@/lib/kv';
import { INTENT_TTL, intentKey, type SolIntent } from '@/lib/solIntent';

export const dynamic = 'force-dynamic';

// GET — verify a payment by reference (status only; fulfilment is the POST on /fulfill)
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('reference');
  if (!ref || !kvConfigured) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  const intent = await kv.get<SolIntent>(intentKey(ref));
  if (!intent) return NextResponse.json({ error: 'Unknown or expired payment' }, { status: 404 });
  const result = await verifySolanaPayment(ref, intent.lamports);
  return NextResponse.json(result);
}

// POST — create a Solana Pay URL for product + shipping
export async function POST(req: NextRequest) {
  if (!kvConfigured) return NextResponse.json({ error: 'SOL checkout is not available right now' }, { status: 503 });
  const { productType, variantId, cubId, cubImage, shipping } = await req.json().catch(() => ({}));
  if (!productType || !variantId || !cubId || !cubImage || !shipping) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const product = PRODUCTS[productType as ProductType];
  if (!product) return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  if (!product.variants.some(v => v.printfulVariantId === Number(variantId))) return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });

  const s = shipping as Record<string, string>;
  const country = String(s.country || '').toUpperCase();
  const clean = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);
  const addr = { name: clean(s.name), email: clean(s.email), address1: clean(s.address1), address2: clean(s.address2) || undefined, city: clean(s.city, 60), state: clean(s.state, 3).toUpperCase(), country, zip: clean(s.zip, 12), phone: clean(s.phone, 30) || undefined };
  if (!addr.name || !addr.address1 || !addr.city || !COUNTRY_CODES.has(country)) return NextResponse.json({ error: 'Incomplete shipping address' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr.email)) return NextResponse.json({ error: 'A valid email is required for shipping updates' }, { status: 400 });
  if (STATE_REQUIRED.has(country) && !addr.state) return NextResponse.json({ error: 'State / province is required for this country' }, { status: 400 });

  let solPrice: number;
  try { solPrice = await getSolPriceUsd(); } catch { return NextResponse.json({ error: 'SOL price unavailable, try again in a minute' }, { status: 503 }); }
  const ship = await quoteShipping(productType, Number(variantId), { country, state: addr.state, zip: addr.zip, city: addr.city, address1: addr.address1 });
  const itemCents = product.basePrice, totalCents = itemCents + ship.cents;
  const lamports = usdToLamports(totalCents, solPrice);

  const memo = `okaycubs-${String(cubId).slice(0, 24)}-${productType}`;
  const { url, reference } = createPaymentURL({ lamports, label: 'OkayCubs Merch', message: `${product.name} — ${cubId}`, memo });
  const intent: SolIntent = {
    reference: reference.toBase58(), lamports, solPrice,
    productType, variantId: Number(variantId), cubId: String(cubId), cubImage: String(cubImage),
    itemCents, shippingCents: ship.cents, totalCents, shipping: addr, createdAt: Date.now(),
  };
  await kv.set(intentKey(intent.reference), intent, INTENT_TTL);

  return NextResponse.json({
    url: url.toString(), reference: intent.reference,
    solAmount: (lamports / 1e9).toFixed(6), lamports, solPrice,
    itemCents, shippingCents: ship.cents, totalCents, estimated: ship.estimated, customs: ship.customs,
  });
}
