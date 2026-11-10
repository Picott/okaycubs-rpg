import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import { fulfillStripeSession } from '@/lib/fulfillStripe';
import { getOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

// Stripe lands here with ?session_id=…; the SOL flow with ?method=sol&order=…&pf=…(&attention=1).
// For Stripe this page is also the webhook's safety net: it reads the session and, if it is paid
// and no order exists yet, places the Printful order itself (idempotent with the webhook).
async function settleStripe(sessionId: string): Promise<{ pf: number | null; attention: boolean; pending: boolean }> {
  try {
    const existing = await getOrder(`stripe-${sessionId}`);
    if (existing?.printfulOrderId) return { pf: existing.printfulOrderId, attention: false, pending: false };
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const outcome = await fulfillStripeSession(session);
    if (outcome.status === 'created' || outcome.status === 'duplicate') return { pf: outcome.order.printfulOrderId, attention: false, pending: false };
    if (outcome.status === 'in_progress' || outcome.status === 'unpaid') return { pf: null, attention: false, pending: true };
    console.error('[success] could not settle session', sessionId, outcome);
    return { pf: null, attention: true, pending: false };
  } catch (e) {
    console.error('[success] settle failed', sessionId, e instanceof Error ? e.message : e);
    return { pf: null, attention: false, pending: true };
  }
}

export default async function OrderSuccess({ searchParams }: { searchParams: { session_id?: string; method?: string; order?: string; pf?: string; attention?: string } }) {
  const sol = searchParams.method === 'sol';
  let pf: string | null = searchParams.pf ?? null;
  let attention = searchParams.attention === '1';
  let pending = false;
  if (!sol && searchParams.session_id && /^cs_[A-Za-z0-9_]+$/.test(searchParams.session_id)) {
    const s = await settleStripe(searchParams.session_id);
    pf = s.pf ? String(s.pf) : null; attention = s.attention; pending = s.pending;
  }
  const ref = pf ? `Printful order #${pf}` : searchParams.order ? `Order ${searchParams.order}` : searchParams.session_id ? `Reference ${searchParams.session_id.slice(-8)}` : null;
  return (
    <main className="text-center py-20 animate-fade-up">
      <div className="text-5xl mb-6">⛏</div>
      <h2 className="gold-text font-cinzel-deco text-3xl font-black mb-3">{attention ? 'Payment received' : pending ? 'Payment received' : 'Order Confirmed'}</h2>
      <div className="rule" />
      <p className="font-crimson text-silver/60 text-lg italic mb-2">
        {attention ? 'Your payment is in. We are placing the order by hand and will email you.' : pending ? 'Your order is being placed. Refresh this page in a minute to see its number.' : 'Your Cub has been forged into merch.'}
      </p>
      {ref && <p className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-70 uppercase mb-3">{ref}</p>}
      <p className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-50 uppercase mb-10 max-w-md mx-auto leading-relaxed">
        {attention
          ? 'Keep this page or screenshot it. Questions: reply to the email you receive.'
          : `Printing takes 2–5 business days. You'll get an email with tracking when it ships${sol ? ' — sent to the address you entered' : ''}.`}
      </p>
      <Link href="/" className="btn-gold inline-block">
        Back to Store
      </Link>
    </main>
  );
}
