'use client';

import { usePathname } from 'next/navigation';

// One header for the whole site: πcott is the brand; the merch line and the game sit under it.
// The subtitle changes with the section so the hierarchy reads the same everywhere.
export default function SiteHeader() {
  const path = usePathname() || '/';
  const onEpk = path.startsWith('/picott');
  const link = (href: string, label: string, active: boolean) => (
    <a href={href} className={`font-cinzel text-[9px] tracking-[3px] uppercase transition-opacity ${active ? 'text-gold opacity-90' : 'text-gold opacity-40 hover:opacity-70'}`}>{label}</a>
  );
  return (
    <header className="text-center pt-10 pb-8">
      <a href="/picott" className="inline-block" aria-label="πcott">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/picott/logo.png" alt="πcott" className="mx-auto h-12 sm:h-16 w-auto invert sepia saturate-[3] hue-rotate-[5deg] brightness-110 drop-shadow-[0_0_16px_rgba(212,175,55,.3)]" />
      </a>
      {onEpk ? (
        <div className="font-cinzel text-[10px] tracking-[5px] text-silver opacity-55 uppercase mt-4">DJ · Producer · Santander, Colombia</div>
      ) : (
        <div className="mt-4">
          <a href="/" className="font-cinzel text-[12px] tracking-[5px] text-quartz uppercase hover:text-gold transition-colors">OkayCubs merch</a>
          <div className="font-cinzel text-[9px] tracking-[3px] text-silver opacity-45 uppercase mt-1">The πcott collection · 50 Cubs · The Honey Chronicles</div>
        </div>
      )}
      <div className="rule" />
      <nav className="flex gap-6 justify-center">
        {link('/game.html', 'Play', false)}
        {link('/', 'Merch', !onEpk && !path.startsWith('/order'))}
        {link('/picott', 'EPK', onEpk)}
      </nav>
    </header>
  );
}
