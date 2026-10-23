import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

export const dynamic = 'force-dynamic';

const RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL ??
  (process.env.HELIUS_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}` : 'https://api.mainnet-beta.solana.com');
const MERCHANT_WALLET = process.env.MERCHANT_SOLANA_WALLET;
const PRICE_SOL = Number(process.env.REVIVE_PRICE_SOL || '0.01');

// Confirms that `signature` paid at least the revive price to the merchant wallet.
// The client already waited for confirmation, so a couple of quick retries cover RPC lag.
export async function POST(req: NextRequest) {
  const { signature } = await req.json().catch(() => ({}));
  if (!signature || typeof signature !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing signature' }, { status: 400 });
  }
  if (!MERCHANT_WALLET) {
    return NextResponse.json({ ok: false, error: 'Revive payments are not configured' }, { status: 503 });
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  let lastError = 'Payment not found';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await validateTransfer(
        connection,
        signature,
        { recipient: new PublicKey(MERCHANT_WALLET), amount: new BigNumber(PRICE_SOL) },
        { commitment: 'confirmed' },
      );
      return NextResponse.json({ ok: true, signature });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  return NextResponse.json({ ok: false, error: lastError }, { status: 402 });
}
