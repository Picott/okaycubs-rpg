// Background music — πcott's SoundCloud, driven through the official Widget API so plays count on the
// artist's profile. The UI is a slim translucent pill (title + play/next); the official player stays
// mounted but folded away, and unfolds only when the browser insists on a tap inside it (iOS).
(function () {
  'use strict';
  const TRACKS  = 'https://soundcloud.com/juan-b-picott/tracks';
  const PROFILE = 'https://soundcloud.com/juan-b-picott';
  const ARTIST  = 'πcott';
  const KEY_ON = 'okaycubs_music_on';
  const position = document.currentScript?.dataset.position || 'bottom';
  const lift = document.currentScript?.dataset.lift === 'touch';

  const style = document.createElement('style');
  style.textContent = `
    .sc { position:fixed; z-index:40; display:flex; flex-direction:column; align-items:flex-end; gap:6px; font-family:'Cinzel',serif;
          ${position === 'top' ? 'top:60px; right:12px;' : 'right:12px; bottom:12px;'} }
    .sc-pill { display:flex; align-items:center; gap:8px; max-width:min(300px, calc(100vw - 24px)); padding:6px 10px 6px 12px;
               border:1px solid rgba(212,175,55,.35); border-radius:999px; background:rgba(7,8,15,.55); backdrop-filter:blur(8px);
               color:#f5e06e; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; box-shadow:0 8px 24px rgba(0,0,0,.35); }
    .sc-pill .sc-note { font-size:12px; }
    .sc-pill.playing .sc-note { animation:scPulse 1s ease-in-out infinite; display:inline-block; }
    @keyframes scPulse { 50% { transform:translateY(-2px); } }
    .sc-title { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:170px; opacity:.9; }
    .sc-title a { color:inherit; text-decoration:none; }
    .sc-btn { background:none; border:0; color:#f5e06e; font-size:13px; cursor:pointer; padding:0 2px; line-height:1; opacity:.85; }
    .sc-btn:hover { opacity:1; }
    .sc-frame { width:min(300px, calc(100vw - 24px)); height:20px; border:1px solid rgba(212,175,55,.35); background:#07080f; display:none; }
    .sc.unfolded .sc-frame { display:block; }
    .sc-frame iframe { display:block; width:100%; height:100%; border:0; }
    .sc-hint { font-size:8px; letter-spacing:1px; color:#b8bcc8; opacity:.6; display:none; text-transform:none; }
    .sc.unfolded .sc-hint { display:block; }
    ${lift ? `@media (pointer:coarse) and (orientation:portrait) { .sc { ${position === 'top' ? 'top:52px;' : 'bottom:190px;'} } }
    @media (pointer:coarse) and (orientation:landscape) { .sc { ${position === 'top' ? '' : 'bottom:110px;'} } }` : ''}`;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'sc';
  const playerSrc = url => 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url)
    + '&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&show_artwork=false&show_playcount=false&buying=false&sharing=false&liking=false&download=false';
  box.innerHTML = `
    <div class="sc-pill" id="scPill">
      <span class="sc-note">♪</span>
      <span class="sc-title" id="scTitle"><a href="${PROFILE}" target="_blank" rel="noopener">${ARTIST} on SoundCloud</a></span>
      <button class="sc-btn" id="scPlay" title="Play / pause">▶</button>
      <button class="sc-btn" id="scNext" title="Next track">⏭</button>
    </div>
    <div class="sc-frame"><iframe id="scFrame" allow="autoplay" src="${playerSrc(TRACKS)}" title="SoundCloud · ${ARTIST}"></iframe></div>
    <div class="sc-hint">Tap ▶ inside the player once to let it play here</div>`;
  document.body.appendChild(box);

  const pill = box.querySelector('#scPill'), titleEl = box.querySelector('#scTitle'), playBtn = box.querySelector('#scPlay');
  let widget = null, volume = 70, playing = false, ready = false, pendingPlay = false;
  const withWidget = fn => { if (widget && ready) fn(widget); };
  const remember = on => { try { localStorage.setItem(KEY_ON, on ? '1' : '0'); } catch (e) {} };

  function showTitle() {
    withWidget(w => w.getCurrentSound(s => {
      if (!s) return;
      titleEl.innerHTML = `<a href="${s.permalink_url || PROFILE}" target="_blank" rel="noopener" title="${s.title} — ${ARTIST}">${s.title} — ${ARTIST}</a>`;
    }));
  }
  // play through the API; if the browser refuses (no PLAY within a moment), unfold the real player for a tap
  function tryPlay() {
    if (!ready) { pendingPlay = true; return; }
    withWidget(w => w.play());
    setTimeout(() => { if (!playing) box.classList.add('unfolded'); }, 1200);
  }
  playBtn.addEventListener('click', () => { if (playing) { withWidget(w => w.pause()); remember(false); } else { remember(true); tryPlay(); } });
  box.querySelector('#scNext').addEventListener('click', () => withWidget(w => { w.next(); if (!playing) tryPlay(); }));

  function load() {
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => {
      widget = window.SC.Widget(box.querySelector('#scFrame'));
      const E = window.SC.Widget.Events;
      let fellBack = false;
      widget.bind(E.ERROR, () => {
        if (fellBack) return; fellBack = true;
        widget.load(PROFILE, { color: '#d4af37', hide_related: true, show_comments: false, show_user: false, show_reposts: false, show_teaser: false, visual: false, show_artwork: false });
      });
      widget.bind(E.READY, () => {
        ready = true;
        widget.setVolume(volume);
        showTitle();
        widget.bind(E.PLAY,  () => { playing = true;  pill.classList.add('playing'); playBtn.textContent = '❚❚'; box.classList.remove('unfolded'); remember(true); showTitle(); });
        widget.bind(E.PAUSE, () => { playing = false; pill.classList.remove('playing'); playBtn.textContent = '▶'; });
        widget.bind(E.FINISH, () => widget.getSounds(sounds => widget.getCurrentSoundIndex(i => { if (sounds && i < sounds.length - 1) widget.next(); else { widget.skip(0); widget.play(); } })));
        if (pendingPlay) { pendingPlay = false; tryPlay(); }
      });
    };
    document.head.appendChild(s);
  }
  load();

  // music was on last time → resume on the first interaction with the page (any tap or key)
  let resumed = false;
  function resume() {
    if (resumed) return; resumed = true;
    if (localStorage.getItem(KEY_ON) === '1') tryPlay();
  }
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, resume, { once: true, capture: true }));

  window.Music = {
    play: tryPlay,
    pause() { withWidget(w => w.pause()); },
    toggle() { playing ? withWidget(w => w.pause()) : tryPlay(); },
    isPlaying() { return playing; },
    setVolume(v) { volume = Math.max(0, Math.min(100, v)); withWidget(w => w.setVolume(volume)); },
    duck(ms = 1200, to = 25) { if (!playing) return; withWidget(w => { w.setVolume(to); setTimeout(() => w.setVolume(volume), ms); }); },
  };
})();
