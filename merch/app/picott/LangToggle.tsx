'use client';

import { useEffect, useState } from 'react';

// EN/ES switch shared with the map page: ?lang=es, else the saved choice ('picott-lang'), else English.
// It only flips a data attribute on <html>; the page renders both languages and CSS shows one.
export default function LangToggle() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  useEffect(() => {
    let l: string | null = new URLSearchParams(window.location.search).get('lang');
    if (!l) { try { l = localStorage.getItem('picott-lang'); } catch {} }
    apply(l === 'es' ? 'es' : 'en');
  }, []);
  function apply(l: 'en' | 'es') {
    setLang(l);
    document.documentElement.setAttribute('data-picott-lang', l);
    document.documentElement.lang = l;
    try { localStorage.setItem('picott-lang', l); } catch {}
    const map = document.getElementById('picott-map-link') as HTMLAnchorElement | null;
    if (map) map.href = `/picott/map.html?lang=${l}`;
  }
  const btn = (l: 'en' | 'es') => (
    <button type="button" onClick={() => apply(l)} aria-pressed={lang === l}
      className={`font-cinzel text-[10px] tracking-[3px] px-3 py-1 border transition-all ${lang === l ? 'border-gold text-gold' : 'border-white/10 text-silver/50 hover:text-gold/80'}`}>
      {l.toUpperCase()}
    </button>
  );
  return <div className="inline-flex gap-1" role="group" aria-label="Language / Idioma">{btn('en')}{btn('es')}</div>;
}
