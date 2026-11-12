import Script from 'next/script';
import type { Metadata } from 'next';
import SiteHeader from './SiteHeader';
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
          <SiteHeader />

          {children}

          <footer className="text-center pt-14 pb-24 font-cinzel text-[8px] tracking-[3px] uppercase opacity-30">sounds by πcott</footer>
        </div>

        {/* πcott on SoundCloud — same music bar as the game and the Honey Roads */}
        {/* πcott on SoundCloud — floating music button in the corner, same on every page */}
        <Script src="/music.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
