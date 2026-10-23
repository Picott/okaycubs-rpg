import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Public game config the static game.html cannot read from env itself
export async function GET() {
  return NextResponse.json({
    merchantWallet: process.env.MERCHANT_SOLANA_WALLET || null,
    revivePriceSol: Number(process.env.REVIVE_PRICE_SOL || '0.01'),
  });
}
