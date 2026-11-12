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
        <div className="font-cinzel text-[10px] tracking-[5px] text-silver opacity-55 uppercase mt-4">DJ · Producer · Tech House · Latin House</div>
      ) : (
        <div className="mt-6 max-w-md mx-auto">
          <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-70 uppercase mb-2">New single · Out now</div>
          <div className="gold-text font-cinzel-deco text-3xl mb-3">Kiss</div>
          <iframe title="πcott — Kiss" width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fjuan-b-picott%2Fkiss-pcott&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false" />
          <div className="font-cinzel text-[9px] tracking-[3px] text-silver opacity-45 uppercase mt-3">OkayCubs × πcott · Partnership merch</div>
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
