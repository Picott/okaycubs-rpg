import Link from 'next/link';

export default function OrderSuccess() {
  return (
    <main className="text-center py-20 animate-fade-up">
      <div className="text-5xl mb-6">⛏</div>
      <h2 className="gold-text font-cinzel-deco text-3xl font-black mb-3">Order Confirmed</h2>
      <div className="rule" />
      <p className="font-crimson text-silver/60 text-lg italic mb-2">
        Your Cub has been forged into merch.
      </p>
      <p className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-50 uppercase mb-10">
        Printful is preparing your order. You'll receive an email shortly.
      </p>
      <Link href="/" className="btn-gold inline-block">
        Back to Store
      </Link>
    </main>
  );
}
