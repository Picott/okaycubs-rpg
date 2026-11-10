import Link from 'next/link';

export const metadata = {
  title: 'πcott — DJ / Producer · Santander, Colombia',
  description: 'πcott — DJ and producer based in Santander, Colombia. Tech House. Latin House. Shaped in the Washington D.C. scene with the Sunday at Backyard series.',
  openGraph: { title: 'πcott — DJ EPK', description: 'Tech House. Latin House. Global Sounds. Based in Santander, Colombia.', images: ['/picott/logo.png'] },
};

// Electronic press kit, ported from picott.netlify.app into okaycubs.space so the artist, the game
// and the merch collection are one brand. Content is Juan's; Spanish copy mirrors the English.
const IG = 'https://www.instagram.com/picot.tt/';
const EMAIL = 'Juandabpicott@gmail.com';

const VENUES = [
  ['Aura Fest · Cali', 'Festival'], ['BKR 48 · Bucaramanga', 'Club'], ['Flash DC', 'Club'], ['Culture', 'Club'], ['Artemis', 'Club'], ['Mala Fama', 'Club'],
  ['Arlo DC', 'Hotel'], ['Eaton Radio', 'Radio'], ['Rendez-Vous', 'Series'], ['Graffiti Museum', 'Culture'],
  ['Public Bar', 'Lounge'], ['Café Citron', 'Lounge'], ['12 After 12', 'Club'],
];

const BACKYARD = [
  { vol: 'VOL · 01', title: 'The Beginning', img: '/picott/vol01-beginning.jpg', href: 'https://www.instagram.com/p/DIkeXkcttXs/' },
  { vol: 'VOL · 02', title: 'Late London',   img: '/picott/vol02-momentum.jpg',  href: 'https://www.instagram.com/p/DJ5HfGhNQ-n/' },
  { vol: 'VOL · 03', title: 'The Vibe',      img: '/picott/vol03-vibe.jpg',      href: 'https://www.instagram.com/p/DLFhRMixsD4/' },
  { vol: 'VOL · 04', title: 'Consistency',   img: '/picott/vol04-consistency.jpg', href: 'https://www.instagram.com/p/DOe9SJakd3m/' },
];

const HIGHLIGHTS = [
  { k: 'Nov · 2026 · BKR 48',            t: 'Back in the House · Bucaramanga', img: '/picott/bkr48.jpg',    href: IG, cta: 'View' },
  { k: 'Sep · 2026 · Aura Fest',        t: 'Concept Vibes · Cali',     img: '/picott/aura-fest.jpg',       href: 'https://www.instagram.com/p/DdkZcMFEZFY/?img_index=9', cta: 'View' },
  { k: 'May · 2026 · Culture',          t: 'All Black Everything',     img: '/picott/culture.jpg',         href: 'https://www.instagram.com/reel/DYsDUMdRBJG/', cta: 'View' },
  { k: 'Mar · 2026 · Flash DC',         t: 'Connectribe · Live',       img: '/picott/flash-dc.jpg',        href: 'https://www.instagram.com/reel/DWbqna2Efxi/', cta: 'Watch' },
  { k: 'Themed · Día de los Muertos',   t: 'Latin · Global House',     img: '/picott/dia-muertos.jpg',     href: 'https://www.instagram.com/p/DB9KYCjPkOf/', cta: 'View' },
  { k: 'Culture · Art All Night',       t: 'Graffiti Museum',          img: '/picott/graffiti-museum.jpg', href: 'https://www.instagram.com/p/DAd0mBuJcvM/', cta: 'View' },
  { k: 'Throwback · The Artemis',       t: 'Escape With Us · Aug 9',   img: '/picott/artemis.jpg',         href: 'https://www.instagram.com/artemis_dc/', cta: 'View' },
  { k: 'Hotel · Sunset at Arlo',        t: 'Fuego Vibes × Myto',       img: '/picott/arlo-dc.jpg',         href: 'https://www.instagram.com/p/DQNROcEkSau/', cta: 'View' },
  { k: 'Broadcast · Eaton Radio',       t: 'Long Live GoGo',           img: '/picott/eaton-radio.jpg',     href: 'https://www.instagram.com/p/C_oiSDUplOD/', cta: 'View' },
  { k: 'Lounge · Public Bar',           t: 'Good Music Thursdays',     img: '/picott/public-bar.jpg',      href: 'https://www.instagram.com/p/DKkWn32JBwe/', cta: 'View' },
  { k: 'Live · Privé DC',               t: 'Rooftop · Live Set',       img: '/picott/prive-dc.jpg',        href: 'https://www.instagram.com/reel/DWbtWMdkb1t/', cta: 'Watch' },
];

// Latest release — links confirmed by Juan; cover, date and tracklist pending (not invented)
const EP = {
  title: 'Signals EP',
  // artwork: the first official visualizer's frame until Juan sends the cover file
  cover: 'https://i.ytimg.com/vi/GBLDiVPLHfg/maxresdefault.jpg',
  hasCover: true,
  playlist: 'PLV8Pcy9byc7A',
  // official visualizers, in playlist order; titles pending from Juan
  videos: ['GBLDiVPLHfg', 'aq23GqsMO5I', '2gPGaFAiUco', 'm3hcujTs_oA', 'dRc89rDwKag'],
  links: [
    { label: 'Spotify',     href: 'https://open.spotify.com/album/5nljTvEAjgdaGALJTaNfYs' },
    { label: 'Apple Music', href: 'https://music.apple.com/us/album/signals-ep/6828800477' },
    { label: 'YT Music',    href: 'https://music.youtube.com/playlist?list=PLV8Pcy9byc7A' },
    { label: 'Deezer',      href: 'https://www.deezer.com/us/album/1134600801' },
  ],
};

const TRACKS = [
  { n: '01', title: 'Paella',            href: 'https://music.youtube.com/watch?v=24z0-0wNnIU' },
  { n: '02', title: 'Top Of The Ladder', href: 'https://music.youtube.com/watch?v=RwprPfURwZA' },
];

const label = 'font-cinzel text-[10px] tracking-[5px] text-gold opacity-55 uppercase';
const pill  = 'font-cinzel text-[10px] tracking-[3px] uppercase px-5 py-2 border border-gold/40 text-gold/80 hover:border-gold hover:text-gold transition-all';

export default function PicottPage() {
  const player = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent('https://soundcloud.com/juan-b-picott/tracks')
    + '&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false';
  return (
    <main className="animate-fade-up space-y-16">
      {/* Hero */}
      <section className="text-center">
        <div className={label + ' mb-3'}>Now booking — 2026 · Santander · Colombia</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/picott/logo.png" alt="πcott" className="mx-auto h-14 sm:h-20 w-auto invert sepia saturate-[3] hue-rotate-[5deg] brightness-110 drop-shadow-[0_0_18px_rgba(212,175,55,.35)]" />
        <p className="font-cinzel text-[12px] tracking-[4px] text-silver/70 uppercase mt-5">Tech House · Latin House · Global Sounds</p>
        <p className="font-crimson italic text-silver/70 text-lg mt-3 max-w-xl mx-auto">Layered, intentional, built to hold a room. Est. since the cold rooms of D.C.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-7">
          <a href={`mailto:${EMAIL}?subject=Booking%20%CF%80cott`} className="btn-gold">Book now</a>
          <a href={IG} target="_blank" rel="noopener" className={pill}>Instagram · @picot.tt</a>
          <a href="https://soundcloud.com/juan-b-picott" target="_blank" rel="noopener" className={pill}>SoundCloud</a>
          <a href="/picott/map.html" className={pill}>The map · D.C. → Cali</a>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-10">
          {[['COL', 'Base · Santander'], ['12+', 'Venues trusted'], ['4', 'Backyard volumes']].map(([n, t]) => (
            <div key={t} className="card-border p-4"><div className="font-cinzel-deco text-gold text-2xl">{n}</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50 mt-1">{t}</div></div>
          ))}
        </div>
      </section>

      {/* Latest release */}
      <section className="card-border p-6 sm:p-8 grid sm:grid-cols-[200px_1fr] gap-7 items-center">
        <div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden bg-black/40 border border-gold/20 flex items-center justify-center">
          <div className="gold-text font-cinzel-deco font-black text-2xl tracking-[4px] text-center px-2">SIGNALS</div>
          {EP.hasCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={EP.cover} alt={`${EP.title} cover`} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <div className="text-center sm:text-left">
          <div className={label}>Latest release · EP</div>
          <div className="gold-text font-cinzel-deco text-3xl mt-2">{EP.title}</div>
          <p className="font-crimson italic text-silver/65 mt-2">πcott · Tech House · Latin House</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-5">
            {EP.links.map(l => <a key={l.href} href={l.href} target="_blank" rel="noopener" className={pill}>{l.label}</a>)}
          </div>
        </div>
        {/* official visualizers: the playlist embed plus one thumbnail per track */}
        <div className="sm:col-span-2 mt-2">
          <div className="aspect-video w-full overflow-hidden border border-gold/20 bg-black/40">
            <iframe title={`${EP.title} — official visualizers`} width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/videoseries?list=${EP.playlist}&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {EP.videos.map((id, i) => (
              <a key={id} href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener" className="group block overflow-hidden border border-gold/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt={`Visualizer ${i + 1}`} loading="lazy" className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                <div className="font-cinzel text-[8px] tracking-[2px] uppercase text-gold/60 text-center py-1">{String(i + 1).padStart(2, '0')}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Next up */}
      <section className="card-border p-7 grid sm:grid-cols-3 gap-6 items-center text-center sm:text-left">
        <div><div className={label}>Next up · 2026</div><div className="font-cinzel-deco text-xl text-quartz mt-2">Open dates · Q4 → 2027</div></div>
        <div className="font-crimson text-silver/70 italic">Colombia · U.S. · Festivals. Last played: BKR 48, Bucaramanga · 5 Nov (Back in the House) · Aura Fest, Cali · 26 Sep.</div>
        <div className="sm:text-right"><a href={`mailto:${EMAIL}?subject=Booking%20%CF%80cott`} className={pill}>Book →</a></div>
      </section>

      {/* About — English and Spanish */}
      <section className="grid md:grid-cols-2 gap-6 items-start">
        <div className="card-border p-7">
          <div className={label + ' mb-4'}>About</div>
          <p className="font-crimson text-silver/80 leading-relaxed">
            <strong className="text-quartz">πcott</strong> is a DJ and producer based in Santander, Colombia, shaped by years in the Washington D.C. scene. Known for seamless
            transitions and an ability to read diverse crowds, he bridges the gap between underground electronic beats and high-energy dancefloors, from high-end hotel lounges
            like Arlo and Eaton to high-volume clubs.
          </p>
          <p className="font-crimson text-silver/80 leading-relaxed mt-4">
            As part of the <em>Sunday at Backyard</em> series with the Connectribe collective, he helped shape the party culture in D.C. In September 2026 he played the
            Concept Vibes stage at Aura Fest&apos;s second anniversary in Cali, Colombia, a slot won as one of the winners of the Concept Academy DJ Contest, out of 40+ sets. Back home in Santander he opened November 2026 at BKR 48 in Bucaramanga with <em>Back in the House</em>.
          </p>
        </div>
        <div className="card-border p-7">
          <div className={label + ' mb-4'}>Biografía</div>
          <p className="font-crimson text-silver/80 leading-relaxed">
            <strong className="text-quartz">πcott</strong> es DJ y productor radicado en Santander, Colombia, formado durante años en la escena de Washington D.C. Reconocido por
            sus transiciones impecables y su lectura de públicos diversos, une el beat electrónico underground con pistas de alta energía: de lounges de hotel como Arlo y Eaton
            a clubes de gran aforo.
          </p>
          <p className="font-crimson text-silver/80 leading-relaxed mt-4">
            Como parte de la serie <em>Sunday at Backyard</em> con el colectivo Connectribe ayudó a dar forma a la cultura de fiesta de D.C. En septiembre de 2026 tocó en el
            escenario Concept Vibes del segundo aniversario de Aura Fest en Cali, un cupo ganado como uno de los ganadores del Concept Academy DJ Contest entre más de 40 sets. De vuelta en Santander abrió noviembre de 2026 en BKR 48, Bucaramanga, con <em>Back in the House</em>.
          </p>
        </div>
      </section>

      {/* Listen */}
      <section>
        <div className={label + ' text-center mb-5'}>✦ Listen ✦</div>
        <div className="card-border p-2">
          <iframe title="πcott on SoundCloud" width="100%" height="360" scrolling="no" frameBorder="no" allow="autoplay" src={player} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {TRACKS.map(t => (
            <a key={t.n} href={t.href} target="_blank" rel="noopener" className="card-border p-5 flex items-center justify-between group">
              <div><div className={label}>Track · {t.n}</div><div className="font-cinzel-deco text-lg text-quartz group-hover:text-gold transition-colors">{t.title}</div></div>
              <div className="font-cinzel text-[9px] tracking-[2px] uppercase text-gold/70">▸ YT Music</div>
            </a>
          ))}
        </div>
      </section>

      {/* Trusted by venues */}
      <section>
        <div className={label + ' text-center mb-5'}>✦ Trusted by venues ✦</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {VENUES.map(([v, k]) => (
            <div key={v} className="card-border px-4 py-2 text-center"><div className="font-cinzel text-[11px] text-quartz">{v}</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-45">{k}</div></div>
          ))}
        </div>
      </section>

      {/* Sunday at Backyard */}
      <section>
        <div className={label + ' text-center mb-2'}>Collective · Series</div>
        <h3 className="gold-text font-cinzel-deco text-3xl text-center">Sunday at Backyard.</h3>
        <p className="font-crimson italic text-silver/60 text-center mt-2 mb-6">A daytime ritual at Rendez-Vous DC. Four chapters and counting.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BACKYARD.map(b => (
            <a key={b.vol} href={b.href} target="_blank" rel="noopener" className="card-border overflow-hidden group">
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.img} alt={`${b.vol} ${b.title}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-3"><div className={label}>{b.vol}</div><div className="font-cinzel text-[12px] text-quartz group-hover:text-gold transition-colors">{b.title}</div></div>
            </a>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section>
        <div className={label + ' text-center mb-2'}>Past events · Selected</div>
        <h3 className="gold-text font-cinzel-deco text-3xl text-center mb-6">Recent highlights.</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {HIGHLIGHTS.map(h => (
            <a key={h.k} href={h.href} target="_blank" rel="noopener" className="card-border overflow-hidden group">
              <div className="aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.img} alt={h.t} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-3"><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50">{h.k}</div><div className="font-cinzel text-[11px] text-quartz group-hover:text-gold transition-colors mt-1">{h.t}</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase text-gold/60 mt-2">{h.cta} ↗</div></div>
            </a>
          ))}
        </div>
      </section>

      {/* Also by πcott */}
      <section className="card-border p-8 text-center">
        <div className={label + ' mb-3'}>Also by πcott</div>
        <div className="font-cinzel-deco text-xl text-quartz mb-2">The Honey Chronicles</div>
        <p className="font-crimson text-silver/60 italic max-w-lg mx-auto mb-5">A browser action game across six geological eras with its own synthesized soundtrack, and a merch collection of the 50 OkayCubs he holds.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="/game.html" className={pill}>Play</a>
          <Link href="/" className={pill}>Merch</Link>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center">
        <div className={label + ' mb-3'}>✦ Contact · Management ✦</div>
        <p className="font-crimson text-silver/70 italic">Available for club residencies, private events &amp; festivals.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <a href={`mailto:${EMAIL}`} className={pill}>{EMAIL}</a>
          <a href={IG} target="_blank" rel="noopener" className={pill}>@picot.tt</a>
        </div>
        <div className="font-cinzel text-[8px] tracking-[3px] uppercase opacity-35 mt-8">© 2026 πcott · Santander · Colombia</div>
      </section>
    </main>
  );
}
