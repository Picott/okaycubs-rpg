import Link from 'next/link';

// Stripe lands here with ?session_id=…; the SOL flow with ?method=sol&order=…&pf=…(&attention=1).
export default function OrderSuccess({ searchParams }: { searchParams: { session_id?: string; method?: string; order?: string; pf?: string; attention?: string } }) {
  const sol = searchParams.method === 'sol';
  const ref = searchParams.pf ? `Printful order #${searchParams.pf}` : searchParams.order ? `Order ${searchParams.order}` : searchParams.session_id ? `Reference ${searchParams.session_id.slice(-8)}` : null;
  const attention = searchParams.attention === '1';
  return (
    <main className="text-center py-20 animate-fade-up">
      <div className="text-5xl mb-6">⛏</div>
      <h2 className="gold-text font-cinzel-deco text-3xl font-black mb-3">{attention ? 'Payment received' : 'Order Confirmed'}</h2>
      <div className="rule" />
      <p className="font-crimson text-silver/60 text-lg italic mb-2">
        {attention ? 'Your payment is in. We are placing the order by hand and will email you.' : 'Your Cub has been forged into merch.'}
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
