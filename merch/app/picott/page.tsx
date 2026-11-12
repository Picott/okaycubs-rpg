import Link from 'next/link';
import LangToggle from './LangToggle';

export const metadata = {
  title: 'πcott — DJ / Producer',
  description: 'πcott — DJ and producer. Tech House. Latin House. Debut EP Signals out now. Shaped in the Washington D.C. scene with the Sunday at Backyard series; based in Colombia.',
  openGraph: { title: 'πcott — DJ EPK', description: 'Tech House. Latin House. Global Sounds.', images: ['/picott/logo.png'] },
};

// Electronic press kit, ported from picott.netlify.app into okaycubs.space so the artist, the game and
// the merch collection are one brand. Both languages are rendered; LangToggle + globals.css show one.
const L = ({ en, es }: { en: React.ReactNode; es: React.ReactNode }) => <><span className="lang-en">{en}</span><span className="lang-es">{es}</span></>;

const IG = 'https://www.instagram.com/picot.tt/';
const EMAIL = 'Juandabpicott@gmail.com';
const BOOK = `mailto:${EMAIL}?subject=Booking%20%CF%80cott`;

const EP = {
  title: 'Signals',
  released: { en: 'Released 30 Oct 2026', es: 'Lanzado el 30 oct 2026' },
  cover: 'https://i.ytimg.com/vi/GBLDiVPLHfg/maxresdefault.jpg',   // first visualizer frame until the artwork file arrives
  playlist: 'PLV8Pcy9byc7A',
  videos: ['GBLDiVPLHfg', 'aq23GqsMO5I', '2gPGaFAiUco', 'm3hcujTs_oA', 'dRc89rDwKag'],
  tracks: ['Você Vai', 'Voicemail', 'Deep', 'Feel So Good', 'Breath'],
  links: [
    { label: 'Spotify',     href: 'https://open.spotify.com/album/5nljTvEAjgdaGALJTaNfYs' },
    { label: 'Apple Music', href: 'https://music.apple.com/us/album/signals-ep/6828800477' },
    { label: 'YT Music',    href: 'https://music.youtube.com/playlist?list=PLV8Pcy9byc7A' },
    { label: 'Deezer',      href: 'https://www.deezer.com/us/album/1134600801' },
  ],
};

const VENUES: [string, string, string][] = [
  ['Aura Fest · Cali', 'Festival', 'Festival'], ['BKR 48 · Bucaramanga', 'Club', 'Club'], ['Flash DC', 'Club', 'Club'], ['Culture', 'Club', 'Club'],
  ['Artemis', 'Club', 'Club'], ['Mala Fama', 'Club', 'Club'], ['Arlo DC', 'Hotel', 'Hotel'], ['Eaton Radio', 'Radio', 'Radio'],
  ['Rendez-Vous', 'Series', 'Serie'], ['Graffiti Museum', 'Culture', 'Cultura'], ['Public Bar', 'Lounge', 'Lounge'], ['Café Citron', 'Lounge', 'Lounge'], ['12 After 12', 'Club', 'Club'],
];

const BACKYARD = [
  { vol: 'VOL · 01', title: 'The Beginning', img: '/picott/vol01-beginning.jpg',   href: 'https://www.instagram.com/p/DIkeXkcttXs/' },
  { vol: 'VOL · 02', title: 'Late London',   img: '/picott/vol02-momentum.jpg',    href: 'https://www.instagram.com/p/DJ5HfGhNQ-n/' },
  { vol: 'VOL · 03', title: 'The Vibe',      img: '/picott/vol03-vibe.jpg',        href: 'https://www.instagram.com/p/DLFhRMixsD4/' },
  { vol: 'VOL · 04', title: 'Consistency',   img: '/picott/vol04-consistency.jpg', href: 'https://www.instagram.com/p/DOe9SJakd3m/' },
];

const HIGHLIGHTS = [
  { k: { en: 'Nov · 2026 · BKR 48', es: 'Nov · 2026 · BKR 48' },                     t: 'Back in the House · Bucaramanga', img: '/picott/bkr48.jpg',           href: IG, cta: 'View' },
  { k: { en: 'Sep · 2026 · Aura Fest', es: 'Sep · 2026 · Aura Fest' },               t: 'Concept Vibes · Cali',            img: '/picott/aura-fest.jpg',       href: 'https://www.instagram.com/p/DdkZcMFEZFY/?img_index=9', cta: 'View' },
  { k: { en: 'May · 2026 · Culture', es: 'May · 2026 · Culture' },                   t: 'All Black Everything',            img: '/picott/culture.jpg',         href: 'https://www.instagram.com/reel/DYsDUMdRBJG/', cta: 'View' },
  { k: { en: 'Mar · 2026 · Flash DC', es: 'Mar · 2026 · Flash DC' },                 t: 'Connectribe · Live',              img: '/picott/flash-dc.jpg',        href: 'https://www.instagram.com/reel/DWbqna2Efxi/', cta: 'Watch' },
  { k: { en: 'Themed · Día de los Muertos', es: 'Temática · Día de los Muertos' },   t: 'Latin · Global House',            img: '/picott/dia-muertos.jpg',     href: 'https://www.instagram.com/p/DB9KYCjPkOf/', cta: 'View' },
  { k: { en: 'Culture · Art All Night', es: 'Cultura · Art All Night' },             t: 'Graffiti Museum',                 img: '/picott/graffiti-museum.jpg', href: 'https://www.instagram.com/p/DAd0mBuJcvM/', cta: 'View' },
  { k: { en: 'Throwback · The Artemis', es: 'Recuerdo · The Artemis' },              t: 'Escape With Us · Aug 9',          img: '/picott/artemis.jpg',         href: 'https://www.instagram.com/artemis_dc/', cta: 'View' },
  { k: { en: 'Hotel · Sunset at Arlo', es: 'Hotel · Sunset at Arlo' },               t: 'Fuego Vibes × Myto',              img: '/picott/arlo-dc.jpg',         href: 'https://www.instagram.com/p/DQNROcEkSau/', cta: 'View' },
  { k: { en: 'Broadcast · Eaton Radio', es: 'Radio · Eaton Radio' },                 t: 'Long Live GoGo',                  img: '/picott/eaton-radio.jpg',     href: 'https://www.instagram.com/p/C_oiSDUplOD/', cta: 'View' },
  { k: { en: 'Lounge · Public Bar', es: 'Lounge · Public Bar' },                     t: 'Good Music Thursdays',            img: '/picott/public-bar.jpg',      href: 'https://www.instagram.com/p/DKkWn32JBwe/', cta: 'View' },
  { k: { en: 'Live · Privé DC', es: 'En vivo · Privé DC' },                          t: 'Boat Party · Live Set',              img: '/picott/prive-dc.jpg',        href: 'https://www.instagram.com/reel/DWbtWMdkb1t/', cta: 'Watch' },
];

// Newest single on SoundCloud: shown first in Listen with its own player
const NEW_TRACK = { title: 'Kiss', url: 'https://soundcloud.com/juan-b-picott/kiss-pcott', date: { en: 'Out 12 Nov 2026', es: 'Salió el 12 nov 2026' } };

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
        <div className="flex justify-center mb-5"><LangToggle /></div>
        <div className={label + ' mb-3'}><L en="Now booking — 2026 · Worldwide" es="Reservas abiertas — 2026 · Todo el mundo" /></div>
        <p className="font-cinzel text-[12px] tracking-[4px] text-silver/70 uppercase mt-2">Tech House · Latin House · Global Sounds</p>
        <p className="font-crimson italic text-silver/70 text-lg mt-3 max-w-xl mx-auto">
          <L en="Layered, intentional, built to hold a room. Est. since the cold rooms of D.C." es="Por capas, con intención, hecho para sostener una pista. Forjado en los cuartos fríos de D.C." />
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-7">
          <a href={BOOK} className="btn-gold"><L en="Book now" es="Contratar" /></a>
          <a href={IG} target="_blank" rel="noopener" className={pill}>Instagram · @picot.tt</a>
          <a href="https://soundcloud.com/juan-b-picott" target="_blank" rel="noopener" className={pill}>SoundCloud</a>
          <a id="picott-map-link" href="/picott/map.html" className={pill}><L en="The map · D.C. → Cali" es="El mapa · D.C. → Cali" /></a>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-10">
          <div className="card-border p-4"><div className="font-cinzel-deco text-gold text-2xl">D.C. → COL</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50 mt-1"><L en="Two scenes, one sound" es="Dos escenas, un sonido" /></div></div>
          <div className="card-border p-4"><div className="font-cinzel-deco text-gold text-2xl">12+</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50 mt-1"><L en="Venues trusted" es="Venues que confían" /></div></div>
          <div className="card-border p-4"><div className="font-cinzel-deco text-gold text-2xl">4</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50 mt-1"><L en="Backyard volumes" es="Volúmenes Backyard" /></div></div>
        </div>
      </section>

      {/* Latest release */}
      <section className="card-border p-6 sm:p-8 grid sm:grid-cols-[200px_1fr] gap-7 items-center">
        <div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden bg-black/40 border border-gold/20 flex items-center justify-center">
          <div className="gold-text font-cinzel-deco font-black text-2xl tracking-[4px] text-center px-2">SIGNALS</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EP.cover} alt={`${EP.title} cover`} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="text-center sm:text-left">
          <div className={label}><L en="Latest release · Debut EP" es="Último lanzamiento · EP debut" /></div>
          <div className="gold-text font-cinzel-deco text-3xl mt-2">{EP.title}</div>
          <p className="font-crimson italic text-silver/65 mt-2"><L en={EP.released.en} es={EP.released.es} /> · ℗ πcott · <L en="self-released · 5 tracks" es="independiente · 5 pistas" /></p>
          <ol className="font-cinzel text-[11px] tracking-[1px] text-silver/80 mt-3 space-y-1">
            {EP.tracks.map((t, i) => <li key={t}><span className="text-gold/60 mr-2">{String(i + 1).padStart(2, '0')}</span>{t}</li>)}
          </ol>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-5">
            {EP.links.map(l => <a key={l.href} href={l.href} target="_blank" rel="noopener" className={pill}>{l.label}</a>)}
          </div>
        </div>
        <div className="sm:col-span-2 mt-2">
          <div className="aspect-video w-full overflow-hidden border border-gold/20 bg-black/40">
            <iframe title={`${EP.title} — official visualizers`} width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/videoseries?list=${EP.playlist}&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {EP.videos.map((id, i) => (
              <a key={id} href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener" className="group block overflow-hidden border border-gold/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt={`${EP.tracks[i]} — official visualizer`} loading="lazy" className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                <div className="font-cinzel text-[8px] tracking-[1px] uppercase text-gold/70 text-center py-1 truncate px-1">{EP.tracks[i]}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Next up */}
      <section className="card-border p-7 grid sm:grid-cols-3 gap-6 items-center text-center sm:text-left">
        <div><div className={label}><L en="Next up · 2026" es="Próximo · 2026" /></div><div className="font-cinzel-deco text-xl text-quartz mt-2"><L en="Open dates · Q4 → 2027" es="Fechas abiertas · Q4 → 2027" /></div></div>
        <div className="font-crimson text-silver/70 italic">
          <L en="Colombia · U.S. · Festivals. Last played: BKR 48, Bucaramanga · 5 Nov (Back in the House) · Aura Fest, Cali · 26 Sep."
             es="Colombia · EE. UU. · Festivales. Último toque: BKR 48, Bucaramanga · 5 nov (Back in the House) · Aura Fest, Cali · 26 sep." />
        </div>
        <div className="sm:text-right"><a href={BOOK} className={pill}><L en="Book →" es="Contratar →" /></a></div>
      </section>

      {/* About */}
      <section className="card-border p-7 max-w-3xl mx-auto">
        <div className={label + ' mb-4'}><L en="About" es="Biografía" /></div>
        <div className="lang-en">
          <p className="font-crimson text-silver/85 leading-relaxed text-[17px]">
            <strong className="text-quartz">πcott</strong> makes tech house with a Latin pulse: layered, intentional, built to hold a room.
            Raised between Colombia and Washington D.C. Debut EP <em>Signals</em>, out now.
          </p>
        </div>
        <div className="lang-es">
          <p className="font-crimson text-silver/85 leading-relaxed text-[17px]">
            <strong className="text-quartz">πcott</strong> hace tech house con pulso latino: por capas, con intención, hecho para sostener una pista.
            Colombia y Washington D.C. son sus escenas. EP debut <em>Signals</em>, ya disponible.
          </p>
        </div>
      </section>

      {/* Listen */}
      <section>
        <div className={label + ' text-center mb-5'}>✦ <L en="Listen" es="Escucha" /> ✦</div>
        <div className="card-border p-5 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div><span className={label}><L en="New single" es="Nuevo sencillo" /></span> <span className="gold-text font-cinzel-deco text-2xl ml-3">{NEW_TRACK.title}</span></div>
            <div className="font-crimson italic text-silver/60"><L en={NEW_TRACK.date.en} es={NEW_TRACK.date.es} /></div>
          </div>
          <iframe title={`πcott — ${NEW_TRACK.title}`} width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay"
            src={'https://w.soundcloud.com/player/?url=' + encodeURIComponent(NEW_TRACK.url) + '&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false'} />
          <a href={NEW_TRACK.url} target="_blank" rel="noopener" className={pill + ' inline-block mt-3'}><L en="Open on SoundCloud" es="Abrir en SoundCloud" /></a>
        </div>
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

      {/* Venues */}
      <section>
        <div className={label + ' text-center mb-5'}>✦ <L en="Trusted by venues" es="Venues que confían" /> ✦</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {VENUES.map(([v, en, es]) => (
            <div key={v} className="card-border px-4 py-2 text-center"><div className="font-cinzel text-[11px] text-quartz">{v}</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-45"><L en={en} es={es} /></div></div>
          ))}
        </div>
      </section>

      {/* Sunday at Backyard */}
      <section>
        <div className={label + ' text-center mb-2'}><L en="Collective · Series" es="Colectivo · Serie" /></div>
        <h3 className="gold-text font-cinzel-deco text-3xl text-center">Sunday at Backyard.</h3>
        <p className="font-crimson italic text-silver/60 text-center mt-2 mb-6"><L en="A daytime ritual at Rendez-Vous DC. Four chapters and counting." es="Un ritual de día en Rendez-Vous DC. Cuatro capítulos y contando." /></p>
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
        <div className={label + ' text-center mb-2'}><L en="Past events · Selected" es="Eventos pasados · Selección" /></div>
        <h3 className="gold-text font-cinzel-deco text-3xl text-center mb-6"><L en="Recent highlights." es="Momentos recientes." /></h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {HIGHLIGHTS.map(h => (
            <a key={h.t} href={h.href} target="_blank" rel="noopener" className="card-border overflow-hidden group">
              <div className="aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.img} alt={h.t} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-3"><div className="font-cinzel text-[8px] tracking-[2px] uppercase opacity-50"><L en={h.k.en} es={h.k.es} /></div><div className="font-cinzel text-[11px] text-quartz group-hover:text-gold transition-colors mt-1">{h.t}</div><div className="font-cinzel text-[8px] tracking-[2px] uppercase text-gold/60 mt-2"><L en={h.cta} es={h.cta === 'Watch' ? 'Ver video' : 'Ver'} /> ↗</div></div>
            </a>
          ))}
        </div>
      </section>

      {/* Partnership merch */}
      <section className="card-border p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="text-center md:text-left">
          <div className={label + ' mb-2'}><L en="Partnership merch" es="Merch en colaboración" /></div>
          <div className="font-cinzel-deco text-2xl text-quartz">OkayCubs × πcott</div>
          <p className="font-crimson text-silver/65 italic max-w-xl mt-3">
            <L en="A print-on-demand line built on the 50 OkayCubs he holds: hoodies, crewnecks, joggers, tees, beanies and caps, each carrying the πcott mark. The Cubs also star in The Honey Chronicles, his browser action game."
               es="Una línea print-on-demand construida sobre los 50 OkayCubs que posee: hoodies, crewnecks, joggers, camisetas, beanies y gorras, cada una con la marca πcott. Los Cubs también protagonizan The Honey Chronicles, su juego de acción en el navegador." />
          </p>
        </div>
        <div className="flex md:flex-col gap-3 justify-center">
          <Link href="/" className="btn-gold"><L en="Shop the collection" es="Ver la colección" /></Link>
          <a href="/game.html" className={pill + ' text-center'}><L en="Play the game" es="Jugar" /></a>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center">
        <div className={label + ' mb-3'}>✦ <L en="Contact · Management" es="Contacto · Management" /> ✦</div>
        <p className="font-crimson text-silver/70 italic"><L en="Available for club residencies, private events & festivals." es="Disponible para residencias en clubes, eventos privados y festivales." /></p>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <a href={`mailto:${EMAIL}`} className={pill}>{EMAIL}</a>
          <a href={IG} target="_blank" rel="noopener" className={pill}>@picot.tt</a>
        </div>
        <div className="font-cinzel text-[8px] tracking-[3px] uppercase opacity-35 mt-8">© 2026 πcott</div>
      </section>
    </main>
  );
}
