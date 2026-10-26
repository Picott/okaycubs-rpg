// Background music — the official SoundCloud widget (plays count on SoundCloud, links back to the artist),
// driven through the Widget API so the game can resume it after a tap and duck it under big effects.
(function () {
  'use strict';
  const TRACKS  = 'https://soundcloud.com/juan-b-picott/tracks';   // all uploads
  const PROFILE = 'https://soundcloud.com/juan-b-picott';          // fallback if the widget cannot resolve /tracks
  const ARTIST  = 'πcott';
  const KEY_ON = 'okaycubs_music_on', KEY_OPEN = 'okaycubs_music_open';
  const position = document.currentScript?.dataset.position || 'bottom';
  const lift = document.currentScript?.dataset.lift === 'touch';   // keep clear of on-screen controls

  const style = document.createElement('style');
  style.textContent = `
    .sc-bar { position:fixed; z-index:40; display:flex; flex-direction:column; align-items:flex-end; gap:6px; font-family:'Cinzel',serif;
              ${position === 'top' ? 'top:62px; right:14px;' : 'right:14px; bottom:14px;'} }
    .sc-bar.collapsed .sc-frame { display:none; }
    .sc-frame { width:min(360px, calc(100vw - 28px)); height:80px; border:1px solid rgba(212,175,55,.45); background:#07080f; box-shadow:0 12px 30px rgba(0,0,0,.5); }
    .sc-frame iframe { display:block; width:100%; height:100%; border:0; }
    .sc-toggle { font-size:9px; letter-spacing:2px; text-transform:uppercase; padding:7px 12px; border:1px solid rgba(212,175,55,.45);
                 background:rgba(7,8,15,.85); color:#f5e06e; cursor:pointer; }
    .sc-toggle.playing::before { content:'♪ '; animation:scPulse 1s ease-in-out infinite; display:inline-block; }
    @keyframes scPulse { 50% { transform:translateY(-2px); } }
    ${lift ? `@media (pointer:coarse) and (orientation:portrait) { .sc-bar { ${position === 'top' ? 'top:52px;' : 'bottom:190px;'} } }
    @media (pointer:coarse) and (orientation:landscape) { .sc-bar { ${position === 'top' ? '' : 'bottom:110px;'} } }` : ''}`;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  // narrow screens (phones, Phantom's in-app browser) start collapsed unless the player opened it before
  const openPref = localStorage.getItem(KEY_OPEN);
  bar.className = 'sc-bar' + ((openPref === '0' || (openPref === null && innerWidth < 760)) ? ' collapsed' : '');
  const playerSrc = url => 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url)
    + '&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
  const src = playerSrc(TRACKS);
  bar.innerHTML = `
    <button class="sc-toggle" id="scToggle" title="Music by ${ARTIST} on SoundCloud">♫ ${ARTIST}</button>
    <div class="sc-frame"><iframe id="scFrame" allow="autoplay" src="${src}" title="SoundCloud · ${ARTIST}"></iframe></div>`;
  document.body.appendChild(bar);

  const toggle = bar.querySelector('#scToggle');
  toggle.addEventListener('click', () => {
    bar.classList.toggle('collapsed');
    try { localStorage.setItem(KEY_OPEN, bar.classList.contains('collapsed') ? '0' : '1'); } catch (e) {}
  });

  let widget = null, volume = 70, playing = false;
  function withWidget(fn) { if (widget) fn(widget); }
  function load() {
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => {
      const frame = bar.querySelector('#scFrame');
      widget = window.SC.Widget(frame);
      let fellBack = false;
      widget.bind(window.SC.Widget.Events.ERROR, () => {
        if (fellBack) return; fellBack = true;
        widget.load(PROFILE, { color: '#d4af37', hide_related: true, show_comments: false, show_user: true, show_reposts: false, show_teaser: false, visual: false });
      });
      widget.bind(window.SC.Widget.Events.READY, () => {
        widget.setVolume(volume);
        widget.bind(window.SC.Widget.Events.PLAY,  () => { playing = true;  toggle.classList.add('playing'); try { localStorage.setItem(KEY_ON, '1'); } catch (e) {} });
        widget.bind(window.SC.Widget.Events.PAUSE, () => { playing = false; toggle.classList.remove('playing'); try { localStorage.setItem(KEY_ON, '0'); } catch (e) {} });
        // keep the music going: next track when one ends, back to the first after the last
        widget.bind(window.SC.Widget.Events.FINISH, () => {
          widget.getSounds(sounds => widget.getCurrentSoundIndex(i => {
            if (sounds && i < sounds.length - 1) widget.next(); else { widget.skip(0); widget.play(); }
          }));
        });
      });
    };
    document.head.appendChild(s);
  }
  load();

  // If music was on last time, resume on the first interaction with the page (browsers need a gesture;
  // iOS still wants a tap inside the widget itself — the bar stays visible for that).
  let resumed = false;
  function resume() {
    if (resumed) return; resumed = true;
    if (localStorage.getItem(KEY_ON) === '1') withWidget(w => w.play());
  }
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, resume, { once: true, capture: true }));

  window.Music = {
    play()  { withWidget(w => w.play()); },
    pause() { withWidget(w => w.pause()); },
    toggle() { withWidget(w => w.isPaused(p => p ? w.play() : w.pause())); },
    isPlaying() { return playing; },
    setVolume(v) { volume = Math.max(0, Math.min(100, v)); withWidget(w => w.setVolume(volume)); },
    // dip the music under a big moment, then come back
    duck(ms = 1200, to = 25) {
      if (!playing) return;
      withWidget(w => { w.setVolume(to); setTimeout(() => w.setVolume(volume), ms); });
    },
  };
})();
