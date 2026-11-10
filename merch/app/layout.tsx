import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'OkayCubs by πcott — The Honey Chronicles Merch',
  description: 'The πcott collection: 50 OkayCubs on hoodies, crewnecks, joggers, tees, beanies and caps. Independent merch by a collector. Pay with SOL or card.',
  openGraph: {
    title: 'OkayCubs by πcott',
    description: 'Wear a Cub from the πcott collection. Pay with SOL or card.',
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
              🍯 πcott · The Honey Chronicles
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
              by πcott · Wear a Cub
            </div>
            <div className="rule" />
            {/* Back to RPG */}
            <nav className="flex gap-5 justify-center">
              <a href="/game.html" className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase">Play</a>
              <a href="/" className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase">Merch</a>
              <a href="/picott" className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase">πcott · EPK</a>
            </nav>
          </header>

          {children}
        </div>

        {/* πcott on SoundCloud — same music bar as the game and the Honey Roads */}
        <Script src="/music.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
