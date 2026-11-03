import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { recentOrders } from '@/lib/orders';
import { getOrder as getPrintfulOrder } from '@/lib/printful';

export const dynamic = 'force-dynamic';

// GET /api/orders?limit=50&live=1  (admin) — recent paid orders; live=1 also pulls status + tracking
// from Printful. This is what the daily "orders without tracking" routine reads.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 50));
  const live = req.nextUrl.searchParams.get('live') === '1';
  const orders = await recentOrders(limit);
  if (live) {
    for (const o of orders) {
      if (!o.printfulOrderId) continue;
      try {
        const pf = await getPrintfulOrder(o.printfulOrderId);
        Object.assign(o, { printfulStatus: pf.status, shipments: pf.shipments ?? [] });
      } catch (e) { Object.assign(o, { printfulStatus: 'unknown', liveError: e instanceof Error ? e.message : String(e) }); }
    }
  }
  const twoDays = Date.now() - 48 * 3600 * 1000;
  const attention = orders.filter(o => !o.printfulOrderId || (live && o.createdAt < twoDays && !(o as { shipments?: unknown[] }).shipments?.length));
  return NextResponse.json({ count: orders.length, attention: attention.map(o => o.id), orders });
}
