import { kv, kvConfigured } from './kv';

// Every paid order is written to Redis so Ops can list them (orders without tracking, refunds…).
// Printful remains the source of truth for production and shipping status.
export interface OrderRecord {
  id: string;                      // our id: stripe-<session> | sol-<reference>
  method: 'stripe' | 'sol';
  createdAt: number;
  productType: string;
  variantId: number;
  cubId: string;
  cubImage: string;
  email?: string;
  name: string;
  country: string;
  itemCents: number;
  shippingCents: number;
  totalCents: number;
  lamports?: number;
  txSignature?: string;
  stripeSessionId?: string;
  printfulOrderId: number | null;
  printfulStatus?: string;
  error?: string;
}

const RECENT = 'orders:recent';
const KEEP = 500;

export async function recordOrder(order: OrderRecord) {
  if (!kvConfigured) { console.log('[orders] KV not configured, order not persisted:', order.id); return; }
  const existed = await kv.get<OrderRecord>(`order:${order.id}`).catch(() => null);
  await kv.set(`order:${order.id}`, order);
  if (!existed) {   // retries update the record without duplicating it in the list
    await kv.lpush(RECENT, order.id).catch(() => {});
    await kv.ltrim(RECENT, 0, KEEP - 1).catch(() => {});
  }
}

export async function getOrder(id: string) { return kvConfigured ? kv.get<OrderRecord>(`order:${id}`) : null; }

export async function recentOrders(limit = 50): Promise<OrderRecord[]> {
  if (!kvConfigured) return [];
  const ids = await kv.lrange(RECENT, 0, limit - 1);
  const out: OrderRecord[] = [];
  for (const id of ids) { const o = await kv.get<OrderRecord>(`order:${id}`); if (o) out.push(o); }
  return out;
}
