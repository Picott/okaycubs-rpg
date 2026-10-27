// Game music + sound effects, synthesised with WebAudio — no files, no network, never cuts out.
// One looping theme per era (pad, bass pulse, arpeggio, soft percussion). The current bar is
// remembered across page loads so hub → den → road feels like one continuous track.
(function (root) {
  'use strict';
  const KEY = 'okaycubs_audio';
  const THEMES = {
    //            root  scale (semitones)          tempo  arp pattern (scale degrees)   pad chord   colour
    hadean:      { root: 45, scale: [0, 2, 3, 5, 7, 8, 10],   bpm: 92,  arp: [0, 2, 4, 2, 7, 4, 2, 0],  chord: [0, 3, 7],  lp: 900,  perc: 'ember' },
    archean:     { root: 43, scale: [0, 2, 3, 5, 7, 9, 10],   bpm: 86,  arp: [0, 4, 2, 4, 0, 5, 2, 4],  chord: [0, 3, 7],  lp: 700,  perc: 'stone' },
    proterozoic: { root: 48, scale: [0, 2, 4, 6, 7, 9, 11],   bpm: 80,  arp: [0, 2, 4, 7, 4, 2, 0, 4],  chord: [0, 4, 7],  lp: 1400, perc: 'drip' },
    paleozoic:   { root: 50, scale: [0, 2, 4, 7, 9],          bpm: 104, arp: [0, 1, 2, 3, 4, 3, 2, 1],  chord: [0, 4, 7],  lp: 1600, perc: 'wood' },
    mesozoic:    { root: 41, scale: [0, 1, 3, 5, 7, 8, 10],   bpm: 110, arp: [0, 2, 0, 3, 0, 4, 2, 1],  chord: [0, 3, 7],  lp: 800,  perc: 'drum' },
    cenozoic:    { root: 47, scale: [0, 2, 3, 5, 7, 8, 11],   bpm: 76,  arp: [0, 4, 7, 4, 2, 4, 0, 4],  chord: [0, 3, 7],  lp: 1800, perc: 'bell' },
  };
  const PROG = [0, 5, 3, 4];   // chord roots per bar (scale degrees): i – VI – IV – V feel

  let ctx = null, master = null, musicGain = null, sfxGain = null, lp = null;
  let theme = THEMES.hadean, eraName = 'hadean', running = false, step = 0, nextTime = 0, timer = null;
  let settings = { music: 0.55, sfx: 0.8, muted: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const noteAt = (deg, oct = 0) => { const s = theme.scale; const i = ((deg % s.length) + s.length) % s.length; return theme.root + s[i] + 12 * (oct + Math.floor(deg / s.length)); };

  function ensure() {
    if (ctx) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicGain = ctx.createGain(); sfxGain = ctx.createGain();
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = theme.lp; lp.Q.value = 0.7;
    musicGain.connect(lp); lp.connect(master); sfxGain.connect(master);
    applyVolumes();
    return true;
  }
  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = settings.muted ? 0 : 1;
    musicGain.gain.value = settings.music; sfxGain.gain.value = settings.sfx;
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // ---- music: a tiny step sequencer, 16 steps per bar, 4-bar loop ----
  function tone(freq, t, dur, { type = 'sine', gain = 0.2, attack = 0.01, release = 0.1, dest = musicGain, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.setValueAtTime(gain, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + release + 0.05);
  }
  function noise(t, dur, { gain = 0.1, hp = 2000, dest = sfxGain } = {}) {
    const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }
  function scheduleStep(i, t) {
    const beat = 60 / theme.bpm, sixteenth = beat / 4, bar = Math.floor(i / 16) % 4, pos = i % 16;
    const chordRoot = PROG[bar];
    if (pos === 0) {                                  // pad chord, one per bar
      for (const iv of theme.chord) { const n = noteAt(chordRoot + [0, 2, 4][theme.chord.indexOf(iv)], 0); tone(midi(n), t, beat * 3.6, { type: 'triangle', gain: 0.07, attack: 0.4, release: 0.8 }); tone(midi(n), t, beat * 3.6, { type: 'sawtooth', gain: 0.025, attack: 0.5, release: 0.8, detune: 7 }); }
    }
    if (pos % 4 === 0) tone(midi(noteAt(chordRoot, -2)), t, beat * 0.5, { type: 'sine', gain: 0.22, attack: 0.005, release: 0.2 });   // bass pulse
    if (pos % 2 === 0) {                              // arpeggio
      const deg = chordRoot + theme.arp[(pos / 2) % theme.arp.length];
      tone(midi(noteAt(deg, 1)), t, sixteenth * 1.6, { type: 'triangle', gain: 0.09, attack: 0.005, release: 0.12 });
    }
    // percussion flavour
    if (theme.perc === 'ember' || theme.perc === 'drum') { if (pos === 0 || pos === 8) tone(60, t, 0.12, { type: 'sine', gain: 0.35, attack: 0.002, release: 0.1 }); if (pos === 4 || pos === 12) noise(t, 0.08, { gain: 0.06, hp: 1500, dest: musicGain }); }
    if (theme.perc === 'stone' || theme.perc === 'wood') { if (pos % 4 === 2) noise(t, 0.03, { gain: 0.05, hp: 3000, dest: musicGain }); }
    if (theme.perc === 'drip' || theme.perc === 'bell') { if (pos === 6 || pos === 14) tone(midi(noteAt(chordRoot + 4, 2)), t, 0.08, { type: 'sine', gain: 0.08, attack: 0.002, release: 0.5 }); }
    if (pos % 4 === 2 && theme.perc !== 'bell') noise(t, 0.02, { gain: 0.025, hp: 6000, dest: musicGain });   // soft hat
  }
  function tick() {
    if (!running) return;
    const sixteenth = 60 / theme.bpm / 4;
    while (nextTime < ctx.currentTime + 0.25) { scheduleStep(step, nextTime); step = (step + 1) % 64; nextTime += sixteenth; }
    timer = setTimeout(tick, 60);
  }
  function remember() { try { localStorage.setItem(KEY + '_pos', JSON.stringify({ era: eraName, step })); } catch (e) {} }

  function start() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (running) return;
    try { const pos = JSON.parse(localStorage.getItem(KEY + '_pos') || 'null'); if (pos && pos.era === eraName) step = pos.step || 0; } catch (e) {}
    running = true; nextTime = ctx.currentTime + 0.05; tick();
  }
  function stop() { running = false; clearTimeout(timer); remember(); }
  function setEra(era) {
    const changed = era !== eraName && THEMES[era];
    eraName = THEMES[era] ? era : 'hadean'; theme = THEMES[eraName];
    if (lp) lp.frequency.setTargetAtTime(theme.lp, ctx.currentTime, 0.5);
    if (changed) step = 0;
  }
  function duck(ms = 1200, to = 0.25) {
    if (!ctx) return;
    const g = musicGain.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(settings.music * to, now + 0.08); g.linearRampToValueAtTime(settings.music, now + ms / 1000);
  }

  // ---- sound effects ----
  const SFX = {
    jump:    t => tone(320, t, 0.08, { type: 'sine', gain: 0.25, attack: 0.005, release: 0.08, dest: sfxGain }),
    djump:   t => { tone(420, t, 0.07, { type: 'sine', gain: 0.22, release: 0.08, dest: sfxGain }); tone(640, t + 0.05, 0.07, { type: 'sine', gain: 0.18, release: 0.1, dest: sfxGain }); },
    land:    t => noise(t, 0.05, { gain: 0.12, hp: 400 }),
    dash:    t => noise(t, 0.12, { gain: 0.15, hp: 1200 }),
    hit:     t => { noise(t, 0.06, { gain: 0.3, hp: 1800 }); tone(180, t, 0.06, { type: 'square', gain: 0.12, release: 0.06, dest: sfxGain }); },
    crit:    t => { noise(t, 0.09, { gain: 0.35, hp: 1200 }); tone(260, t, 0.1, { type: 'square', gain: 0.16, release: 0.12, dest: sfxGain }); tone(520, t + 0.04, 0.08, { type: 'sine', gain: 0.14, release: 0.2, dest: sfxGain }); },
    hurt:    t => { tone(220, t, 0.12, { type: 'sawtooth', gain: 0.18, release: 0.15, dest: sfxGain }); tone(140, t + 0.06, 0.14, { type: 'sawtooth', gain: 0.14, release: 0.2, dest: sfxGain }); },
    block:   t => { tone(1400, t, 0.04, { type: 'triangle', gain: 0.2, release: 0.15, dest: sfxGain }); tone(2100, t + 0.01, 0.03, { type: 'sine', gain: 0.1, release: 0.2, dest: sfxGain }); },
    honey:   t => { tone(880, t, 0.06, { type: 'sine', gain: 0.16, release: 0.25, dest: sfxGain }); tone(1320, t + 0.06, 0.08, { type: 'sine', gain: 0.14, release: 0.35, dest: sfxGain }); },
    tell:    t => tone(70, t, 0.3, { type: 'sawtooth', gain: 0.22, attack: 0.02, release: 0.25, dest: sfxGain }),
    burst:   t => { for (let i = 0; i < 6; i++) tone(200 + i * 110, t + i * 0.03, 0.35, { type: 'sine', gain: 0.12, attack: 0.02, release: 0.5, dest: sfxGain }); noise(t, 0.4, { gain: 0.25, hp: 800 }); },
    charged: t => { tone(660, t, 0.08, { type: 'triangle', gain: 0.15, release: 0.2, dest: sfxGain }); tone(990, t + 0.09, 0.12, { type: 'triangle', gain: 0.15, release: 0.4, dest: sfxGain }); },
    checkpoint: t => [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.12, { type: 'sine', gain: 0.14, release: 0.3, dest: sfxGain })),
    portal:  t => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.1, 0.3, { type: 'sine', gain: 0.14, release: 0.6, dest: sfxGain })),
    victory: t => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.11, 0.25, { type: 'triangle', gain: 0.16, release: 0.5, dest: sfxGain })),
    defeat:  t => [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.22, 0.3, { type: 'triangle', gain: 0.16, release: 0.5, dest: sfxGain })),
    power:   t => { for (let i = 0; i < 4; i++) tone(330 * Math.pow(1.5, i), t + i * 0.06, 0.25, { type: 'sine', gain: 0.14, attack: 0.01, release: 0.4, dest: sfxGain }); },
  };
  function sfx(name) { if (!ensure() || settings.muted) return; const f = SFX[name]; if (f) f(ctx.currentTime); }

  // unlock audio on the first interaction (browser policy), keep the position across pages
  const unlock = () => { if (ensure() && ctx.state === 'suspended') ctx.resume(); if (root.GameMusic.autostart) start(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
  addEventListener('pagehide', remember); addEventListener('beforeunload', remember);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) remember(); });

  root.GameMusic = {
    autostart: true, start, stop, setEra, duck, sfx,
    isRunning: () => running,
    settings, setMusic(v) { settings.music = v; applyVolumes(); }, setSfx(v) { settings.sfx = v; applyVolumes(); },
    toggleMute() { settings.muted = !settings.muted; applyVolumes(); return settings.muted; },
  };
})(typeof self !== 'undefined' ? self : this);
