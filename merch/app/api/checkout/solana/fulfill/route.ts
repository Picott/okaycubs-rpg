import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { createOrder } from '@/lib/printful';
import { PRODUCTS, ProductType } from '@/lib/products';

const RPC_ENDPOINT = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const MERCHANT_WALLET = process.env.MERCHANT_SOLANA_WALLET!;

export async function POST(req: NextRequest) {
  const {
    reference,    // base58 reference key from Solana Pay URL
    lamports,     // expected lamports
    productType,
    variantId,
    cubId,
    cubImage,
    shipping,     // { name, address1, city, state, country, zip }
  } = await req.json();

  if (!reference || !lamports || !productType || !variantId || !shipping) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const product = PRODUCTS[productType as ProductType];
  if (!product) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  // 1. Verify payment on-chain
  try {
    const connection  = new Connection(RPC_ENDPOINT, 'confirmed');
    const refKey      = new PublicKey(reference);
    const merchant    = new PublicKey(MERCHANT_WALLET);
    const solAmount   = new BigNumber(lamports / LAMPORTS_PER_SOL);

    const sig = await findReference(connection, refKey, { finality: 'confirmed' });
    await validateTransfer(
      connection,
      sig.signature,
      { recipient: merchant, amount: solAmount },
      { commitment: 'confirmed' }
    );

    // 2. Payment verified — create Printful order
    const result = await createOrder(
      [{
        variantId: Number(variantId),
        quantity:  1,
        files:     [{ url: cubImage || '', placement: product.printPlacement }],
      }],
      {
        name:         shipping.name,
        address1:     shipping.address1,
        city:         shipping.city,
        state_code:   shipping.state  || '',
        country_code: shipping.country,
        zip:          shipping.zip    || '',
      },
      `solana-${sig.signature.slice(0, 16)}-${cubId}`
    );

    return NextResponse.json({
      verified:        true,
      signature:       sig.signature,
      printfulOrderId: result?.result?.id ?? null,
    });

  } catch (err) {
    // findReference throws if payment not found yet
    const msg = err instanceof Error ? err.message : String(err);
    const notFound = msg.includes('not found') || msg.includes('No records found');
    return NextResponse.json(
      { verified: false, pending: notFound, error: notFound ? 'Payment not confirmed yet' : msg },
      { status: notFound ? 202 : 400 }
    );
  }
}
