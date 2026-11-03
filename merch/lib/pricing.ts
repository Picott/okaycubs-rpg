import { kv, kvConfigured } from './kv';

// The SOL price is fetched on the server so the customer can never set it. Two public sources,
// cached for a minute (Redis when configured, otherwise this instance's memory).
let memo: { price: number; at: number } | null = null;
const TTL_MS = 60_000;

async function fetchSolPrice(): Promise<number> {
  const sources: (() => Promise<number>)[] = [
    async () => {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      const d = await r.json() as { solana?: { usd?: number } };
      return Number(d?.solana?.usd);
    },
    async () => {
      const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      const d = await r.json() as { price?: string };
      return Number(d?.price);
    },
  ];
  for (const s of sources) {
    try { const p = await s(); if (Number.isFinite(p) && p > 1) return p; } catch {}
  }
  throw new Error('sol_price_unavailable');
}

export async function getSolPriceUsd(): Promise<number> {
  const now = Date.now();
  // local testing only (no outbound network): SOL_PRICE_USD_FIXED=150
  if (process.env.SOL_PRICE_USD_FIXED && process.env.NODE_ENV !== 'production') return Number(process.env.SOL_PRICE_USD_FIXED);
  if (memo && now - memo.at < TTL_MS) return memo.price;
  if (kvConfigured) {
    const cached = await kv.get<number>('solprice:usd').catch(() => null);
    if (cached && cached > 1) { memo = { price: cached, at: now }; return cached; }
  }
  const price = await fetchSolPrice();
  memo = { price, at: now };
  if (kvConfigured) await kv.set('solprice:usd', price, 60).catch(() => {});
  return price;
}

/** Lamports for a USD amount at the given SOL price, rounded up so we never under-collect. */
export function usdToLamports(usdCents: number, solPriceUsd: number): number {
  return Math.ceil((usdCents / 100 / solPriceUsd) * 1_000_000_000);
}
