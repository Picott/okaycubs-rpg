import Link from 'next/link';

export const metadata = {
  title: 'πcott — DJ & producer · Press kit',
  description: 'πcott: DJ, producer and collector. Music, bio, booking and The Honey Chronicles.',
};

// Electronic press kit for πcott, living inside okaycubs.space so the artist, the game and the
// merch collection are one brand. Copy marked TODO is waiting for Juan's text.
const LINKS: { label: string; href: string }[] = [
  { label: 'SoundCloud', href: 'https://soundcloud.com/juan-b-picott' },
  // TODO: Spotify, Apple Music, YouTube, Instagram, TikTok, Beatport — pending from Juan
];

export default function PicottPage() {
  const player = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent('https://soundcloud.com/juan-b-picott/tracks')
    + '&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false';
  return (
    <main className="animate-fade-up space-y-14">
      {/* Hero */}
      <section className="text-center">
        <div className="font-cinzel text-[10px] tracking-[6px] text-gold opacity-60 uppercase mb-3">DJ · Producer · Collector</div>
        <h2 className="gold-text font-cinzel-deco font-black" style={{ fontSize: 'clamp(40px, 9vw, 84px)', lineHeight: 1 }}>πcott</h2>
        <p className="font-crimson italic text-silver/70 text-lg mt-4 max-w-xl mx-auto">
          {/* TODO one-liner from Juan, e.g. "Melodic house from Bucaramanga, Colombia." */}
          One-liner coming soon.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener" className="font-cinzel text-[10px] tracking-[3px] uppercase px-5 py-2 border border-gold/40 text-gold/80 hover:border-gold hover:text-gold transition-all">{l.label}</a>
          ))}
          <Link href="/" className="btn-gold">Shop the collection</Link>
        </div>
      </section>

      {/* Music */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">✦ Listen ✦</div>
        <div className="card-border p-2">
          <iframe title="πcott on SoundCloud" width="100%" height="360" scrolling="no" frameBorder="no" allow="autoplay" src={player} />
        </div>
      </section>

      {/* Latest release — TODO: the EP */}
      <section className="card-border p-8 text-center">
        <div className="font-cinzel text-[10px] tracking-[5px] text-gold opacity-55 uppercase mb-3">Latest release</div>
        <div className="font-cinzel-deco text-2xl text-quartz mb-2">EP title · TODO</div>
        <p className="font-crimson text-silver/60 italic max-w-lg mx-auto">Cover, release date, label and streaming links pending.</p>
      </section>

      {/* Bio */}
      <section className="grid md:grid-cols-2 gap-8 items-start">
        <div className="card-border p-7">
          <div className="font-cinzel text-[10px] tracking-[5px] text-gold opacity-55 uppercase mb-4">Bio</div>
          <p className="font-crimson text-silver/75 leading-relaxed">TODO English bio.</p>
        </div>
        <div className="card-border p-7">
          <div className="font-cinzel text-[10px] tracking-[5px] text-gold opacity-55 uppercase mb-4">Biografía</div>
          <p className="font-crimson text-silver/75 leading-relaxed">TODO bio en español.</p>
        </div>
      </section>

      {/* Press photos — TODO */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">✦ Press photos ✦</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-border aspect-[4/5] flex items-center justify-center font-cinzel text-[9px] tracking-[3px] text-gold/40 uppercase">photo {i} · pending</div>
          ))}
        </div>
      </section>

      {/* The Honey Chronicles */}
      <section className="card-border p-8 text-center">
        <div className="font-cinzel text-[10px] tracking-[5px] text-gold opacity-55 uppercase mb-3">Also by πcott</div>
        <div className="font-cinzel-deco text-xl text-quartz mb-2">The Honey Chronicles</div>
        <p className="font-crimson text-silver/60 italic max-w-lg mx-auto mb-5">A browser action game across six geological eras, with its own synthesized soundtrack, and a merch collection of the 50 OkayCubs he holds.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="/game.html" className="font-cinzel text-[10px] tracking-[3px] uppercase px-5 py-2 border border-gold/40 text-gold/80 hover:border-gold hover:text-gold transition-all">Play</a>
          <Link href="/" className="font-cinzel text-[10px] tracking-[3px] uppercase px-5 py-2 border border-gold/40 text-gold/80 hover:border-gold hover:text-gold transition-all">Merch</Link>
        </div>
      </section>

      {/* Booking */}
      <section className="text-center">
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase mb-3">✦ Booking & press ✦</div>
        <p className="font-crimson text-silver/60 italic">TODO booking email / WhatsApp / management.</p>
      </section>
    </main>
  );
}
