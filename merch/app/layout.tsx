import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OkayCubs Merch — Geological Chronicles',
  description: 'Official OkayCubs merch store. Print-on-demand hoodies, joggers and caps. Pay with SOL or card.',
  openGraph: {
    title: 'OkayCubs Merch',
    description: 'Wear your Cub. Pay with SOL or card.',
    siteName: 'OkayCubs',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Background layers matching RPG */}
        <div className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, #1a0f3c22 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 100%, #3c0f0f22 0%, transparent 60%),
                         linear-gradient(180deg, #07080f 0%, #0a0b12 50%, #0d0508 100%)`,
          }}
        />
        <div className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              180deg, transparent 0, transparent 59px,
              rgba(212,175,55,0.03) 59px, rgba(212,175,55,0.03) 60px
            )`,
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-5 pb-20">
          {/* Shared header */}
          <header className="text-center pt-12 pb-8">
            <div className="font-cinzel text-[10px] tracking-[7px] text-gold opacity-65 uppercase mb-3">
              ⛏ Geological Chronicles · Merch
            </div>
            <a href="/" className="block">
              <h1
                className="gold-text font-cinzel-deco font-black"
                style={{ fontSize: 'clamp(26px, 6vw, 48px)', lineHeight: 1.1 }}
              >
                OkayCubs
              </h1>
            </a>
            <div className="font-cinzel text-[11px] tracking-[4px] text-silver opacity-50 mt-2">
              Wear the Strata
            </div>
            <div className="rule" />
            {/* Back to RPG */}
            <a
              href="../index.html"
              className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase"
            >
              ← Back to RPG
            </a>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
