import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { kv } from '@/lib/kv';
import { Engine, jsonError, requireSession, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

const RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL ??
  (process.env.HELIUS_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}` : 'https://api.mainnet-beta.solana.com');
const MERCHANT_WALLET = process.env.MERCHANT_SOLANA_WALLET;
const PRICE_SOL = Number(process.env.REVIVE_PRICE_SOL || '0.01');

// Confirms that `signature` paid at least the revive price to the merchant wallet.
async function verifyPayment(signature: string): Promise<string | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  let lastError = 'Payment not found';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await validateTransfer(connection, signature,
        { recipient: new PublicKey(MERCHANT_WALLET!), amount: new BigNumber(PRICE_SOL) },
        { commitment: 'confirmed' });
      return null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  return lastError;
}

// Revive a Cub from cooldown — with honey, or with a SOL payment verified on-chain (each signature usable once)
export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { cubId, method, signature } = await req.json().catch(() => ({}));
  if (typeof cubId !== 'string' || (method !== 'honey' && method !== 'sol')) return jsonError(400, 'bad_request');

  if (method === 'sol') {
    if (!MERCHANT_WALLET) return jsonError(503, 'payments_not_configured');
    if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,120}$/.test(signature)) return jsonError(400, 'bad_request');
    if (!(await kv.setNX(`tx:${signature}`, { wallet: s.wallet, cubId, t: Date.now() }, 90 * 86400))) return jsonError(409, 'signature_used');
    const err = await verifyPayment(signature);
    if (err) { await kv.del(`tx:${signature}`); return jsonError(402, 'payment_not_verified', { detail: err }); }
  }

  return withProfile(s.wallet, async p => {
    const r = method === 'honey' ? Engine.reviveWithHoney(p, cubId, Date.now()) : Engine.clearCooldown(p, cubId);
    if (!r.ok) return jsonError(400, r.error);
    return { method, cost: r.cost ?? 0 };
  });
}
