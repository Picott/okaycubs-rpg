// Desktop renderer for the den / throne fights. The simulation (honey-road.js + guardian.js) is
// untouched and stays on a line: x is the fight axis, y is height. This module replaces road.draw()
// and stages that line inside a full 3D hall with a cinematic three-quarter camera, a modelled
// guardian built from primitives, real shadows, braziers, lightning and big damage numbers.
// Phones keep the lighter road3d.js renderer.
import * as THREE from '/vendor/three.module.min.js';

const GROUND_Y = 480, HALL_Z = 360, WALL_Z = -560, FOV = 40;
const wy = y => GROUND_Y - y;
const col = c => new THREE.Color(c);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ease = k => k * k * (3 - 2 * k);
function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

function canvasTex(w, h, paint, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = () => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const ringTex = () => canvasTex(256, 256, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 10; g.shadowColor = '#fff'; g.shadowBlur = 22; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke(); });
const discTex = () => canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 124); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(0.8, 'rgba(255,255,255,.5)'); gr.addColorStop(0.92, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
const flameTex = () => canvasTex(64, 128, (g) => { const gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 0); g.bezierCurveTo(70, 60, 62, 120, 32, 126); g.bezierCurveTo(2, 120, -6, 60, 32, 0); g.fill(); });
const glyphCache = new Map();
function glyphTex(glyph) {
  if (!glyphCache.has(glyph)) glyphCache.set(glyph, canvasTex(192, 192, (g) => { g.font = '140px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 96, 104); }));
  return glyphCache.get(glyph);
}
// worn flagstones: albedo + a matching roughness-ish variation baked into the colour
function stoneTex(base, seed) {
  const rnd = seeded(seed), b = col(base);
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const k = 0.78 + rnd() * 0.4, c = b.clone().multiplyScalar(k);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(x * 128 + (y % 2) * 64 - 64, y * 128, 128, 128); g.fillRect(x * 128 + (y % 2) * 64 - 64 + 512, y * 128, 128, 128);
    }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * 0.07})`; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 4;
    for (let y = 0; y < 4; y++) { g.beginPath(); g.moveTo(0, y * 128); g.lineTo(512, y * 128); g.stroke(); for (let x = -1; x < 5; x++) { const px = x * 128 + (y % 2) * 64; g.beginPath(); g.moveTo(px, y * 128); g.lineTo(px, y * 128 + 128); g.stroke(); } }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) { let x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (rnd() - .5) * 60; y += (rnd() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
  });
}

const HAZ_VERT = `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HAZ_FRAG = `
  uniform float uTime; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uDeep; uniform float uGlow; varying vec3 vPos;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){ vec2 p = vPos.xy * 0.007; float a = n(p * 1.3 + vec2(uTime * 0.05, uTime * 0.03)); float b = n(p * 3.1 - vec2(uTime * 0.08, 0.0) + a);
    float crust = smoothstep(0.42, 0.58, b); float veins = pow(1.0 - abs(b - 0.5) * 2.0, 6.0);
    vec3 c = mix(uMid, uDeep, crust * 0.85) + uTop * veins * uGlow; gl_FragColor = vec4(c, 1.0); }`;

export function attach(road, simCanvas, opts = {}) {
  const gl = document.createElement('canvas');
  gl.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;font-family:Cinzel,serif;';
  ui.innerHTML = `<style>
    .a3-f{position:absolute;left:0;top:0;white-space:nowrap;font-weight:700;font-size:17px;text-shadow:0 2px 6px #000,0 0 12px rgba(0,0,0,.8);will-change:transform,opacity}
    .a3-f.num{font-family:'Cinzel Decorative',Cinzel,serif;font-size:34px;letter-spacing:1px;text-shadow:0 2px 0 #000,0 0 18px currentColor}
    .a3-f.big{font-size:54px}
    .a3-flash{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#fff6d0 0%,#ffe27a 40%,rgba(255,226,122,0) 80%);opacity:0;mix-blend-mode:screen}
    .a3-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)}
    .a3-bars i{position:absolute;left:0;right:0;height:0;background:#000;transition:height .5s ease}.a3-bars i:first-child{top:0}.a3-bars i:last-child{bottom:0}.a3-bars.on i{height:11vh}
    .a3-title{position:absolute;left:0;right:0;top:36%;text-align:center;opacity:0;transition:opacity .6s ease,transform 3s ease-out;transform:scale(.94)}
    .a3-title.on{opacity:1;transform:scale(1)}
    .a3-title b{display:block;font-family:'Cinzel Decorative',Cinzel,serif;font-size:min(7vw,84px);color:#f5e06e;text-shadow:0 0 40px rgba(245,224,110,.55),0 4px 0 #000;letter-spacing:3px}
    .a3-title span{display:block;margin-top:14px;font-size:min(1.6vw,19px);letter-spacing:10px;color:#e8d9b5;text-transform:uppercase;text-shadow:0 2px 6px #000}
    .a3-skip{position:absolute;right:28px;bottom:13vh;font-size:11px;letter-spacing:4px;color:#c9ccd6;opacity:0;transition:opacity .4s}.a3-bars.on~.a3-skip{opacity:.6}
  </style><div class="a3-vig"></div><div class="a3-flash"></div><div class="a3-floats"></div><div class="a3-bars"><i></i><i></i></div><div class="a3-title"><b></b><span></span></div><div class="a3-skip">CLICK OR PRESS ANY KEY TO SKIP</div>`;
  simCanvas.after(gl); gl.after(ui);
  simCanvas.style.opacity = '0';
  const $ = s => ui.querySelector(s);

  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 9000);
  let W = 1, H = 1;
  function resize() { W = innerWidth; H = innerHeight; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const L = road.L, pal = L.palette, len = L.length;
  const hz = (self.HONEY_ROAD_HAZARDS || {})[L.hazard] || { top: '#ffb347', mid: '#ff6a1a', deep: '#6a1202' };
  const accent = col(L.hazard === 'chasm' ? '#5aa9ff' : hz.mid), accentHot = col(L.hazard === 'chasm' ? '#bfe0ff' : hz.top);
  const rnd = seeded(len * 31 + (L.title || '').length * 7);
  const TEX = { glow: glowTex(), ring: ringTex(), disc: discTex(), flame: flameTex() };
  scene.background = col(pal.skyTop).multiplyScalar(0.35);
  scene.fog = new THREE.FogExp2(col(pal.skyBottom).multiplyScalar(0.5), 0.00042);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(col(pal.skyBottom).lerp(col('#9fb4ff'), 0.4), accent.clone().multiplyScalar(0.6), 0.55));
  const key = new THREE.DirectionalLight(col('#ffe7c4'), 1.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0006; key.shadow.normalBias = 2;
  Object.assign(key.shadow.camera, { left: -900, right: 900, top: 800, bottom: -300, near: 100, far: 2600 }); key.shadow.camera.updateProjectionMatrix();
  scene.add(key, key.target);
  const lantern = new THREE.PointLight(col('#ffe2a8'), 0, 620, 1); scene.add(lantern);
  const coreLight = new THREE.PointLight(accent.clone(), 0, 1000, 1); scene.add(coreLight);
  const flashLight = new THREE.PointLight(col('#fff2c0'), 0, 2600, 1); scene.add(flashLight);

  // ---------- the hall ----------
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex(col(pal.rock).lerp(col('#8a8f9c'), 0.35), 11), roughness: 0.9, metalness: 0.05 });
  stone.map.wrapS = stone.map.wrapT = THREE.RepeatWrapping;
  const floorMat = stone.clone(); floorMat.map = stone.map.clone(); floorMat.map.repeat.set((len + 1400) / 340, (HALL_Z * 2) / 340); floorMat.map.needsUpdate = true;
  const dark = new THREE.MeshStandardMaterial({ color: col(pal.rock).multiplyScalar(0.55), roughness: 1, flatShading: true });
  const trim = new THREE.MeshStandardMaterial({ color: col(pal.rockTop).lerp(col('#c9b98a'), 0.3), roughness: 0.6, metalness: 0.35 });
  const hot = new THREE.MeshBasicMaterial({ color: accentHot.clone().lerp(accent, 0.5) });
  const add = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; scene.add(mesh); return mesh; };

  const floor = add(new THREE.Mesh(new THREE.BoxGeometry(len + 1400, 60, HALL_Z * 2), floorMat), false); floor.position.set(len / 2, -30, 0);
  // the duelling lane: an inlaid strip with glowing edges so the fight line reads at a glance
  const lane = add(new THREE.Mesh(new THREE.BoxGeometry(len + 200, 2, 120), new THREE.MeshStandardMaterial({ color: col(pal.rockTop).multiplyScalar(0.8), roughness: 0.55, metalness: 0.2 })), false); lane.position.set(len / 2, 0.6, 0);
  for (const z of [-64, 64]) { const e = new THREE.Mesh(new THREE.BoxGeometry(len + 200, 1.5, 4), new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(0.9) })); e.position.set(len / 2, 1.8, z); scene.add(e); }
  // molten channels on both sides and a far sea behind the back wall
  const hazMat = new THREE.ShaderMaterial({ vertexShader: HAZ_VERT, fragmentShader: HAZ_FRAG, uniforms: { uTime: { value: 0 }, uTop: { value: col(hz.top) }, uMid: { value: col(hz.mid) }, uDeep: { value: col(hz.deep) }, uGlow: { value: L.hazard === 'chasm' ? 0.25 : 1.1 } } });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(len + 5000, 3600), hazMat); sea.rotation.x = -Math.PI / 2; sea.position.set(len / 2, -46, 0); scene.add(sea);
  for (const z of [-HALL_Z - 8, HALL_Z + 8]) { const curb = add(new THREE.Mesh(new THREE.BoxGeometry(len + 1400, 26, 30), trim)); curb.position.set(len / 2, 6, z); }

  // back wall with arches, pillars along it, a giant sigil gate behind the guardian
  const wall = add(new THREE.Mesh(new THREE.BoxGeometry(len + 2600, 1500, 80), new THREE.MeshStandardMaterial({ map: stone.map.clone(), color: col('#9a9a9a'), roughness: 1 }))); wall.material.map.repeat.set(12, 5); wall.material.map.needsUpdate = true;
  wall.position.set(len / 2, 700, WALL_Z - 40);
  const braziers = [];
  const pillarGeo = new THREE.CylinderGeometry(46, 54, 760, 10), capGeo = new THREE.BoxGeometry(150, 46, 150), baseGeo = new THREE.BoxGeometry(140, 60, 140);
  for (let x = -260, i = 0; x <= len + 260; x += 330, i++) {
    const z = -HALL_Z + 30;
    const p = add(new THREE.Mesh(pillarGeo, stone)); p.position.set(x, 380, z);
    const c = add(new THREE.Mesh(capGeo, trim)); c.position.set(x, 780, z);
    const b = add(new THREE.Mesh(baseGeo, trim)); b.position.set(x, 30, z);
    const band = new THREE.Mesh(new THREE.TorusGeometry(52, 5, 6, 20), hot); band.rotation.x = Math.PI / 2; band.position.set(x, 250, z); scene.add(band);
    // arch recess between pillars
    const arch = new THREE.Mesh(new THREE.PlaneGeometry(190, 520), new THREE.MeshBasicMaterial({ color: col('#020203') })); arch.position.set(x + 165, 300, WALL_Z + 2); scene.add(arch);
    const top = new THREE.Mesh(new THREE.CircleGeometry(95, 20, 0, Math.PI), arch.material); top.position.set(x + 165, 560, WALL_Z + 2); scene.add(top);
    if (i % 2 === 0) braziers.push(makeBrazier(x + 165, 0, -HALL_Z + 110, 1));
  }
  // broken stumps and braziers on the camera side, kept low so they frame the fight without hiding it
  for (let x = -120; x <= len + 160; x += 420) {
    const h = 50 + rnd() * 90, s = add(new THREE.Mesh(new THREE.CylinderGeometry(44, 54, h, 9), stone)); s.position.set(x + rnd() * 60, h / 2, HALL_Z - 40);
    for (let k = 0; k < 3; k++) { const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(14 + rnd() * 20, 0), dark)); r.position.set(x + (rnd() - .5) * 200, 12, HALL_Z - 30 - rnd() * 110); r.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); }
  }
  for (const x of [len * 0.2, len * 0.8]) braziers.push(makeBrazier(x, 0, HALL_Z - 120, 0.8));
  function makeBrazier(x, y, z, s) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(8, 16, 110, 8), trim); stem.position.y = 55; stem.castShadow = true; g.add(stem);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(38, 18, 30, 10), trim); bowl.position.y = 122; bowl.castShadow = true; g.add(bowl);
    const coals = new THREE.Mesh(new THREE.CylinderGeometry(33, 33, 4, 10), hot); coals.position.y = 137; g.add(coals);
    const flames = [0, 1, 2].map(i => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flame, color: i ? accent.clone() : accentHot.clone(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); f.position.set((i - 1) * 9, 172, 0); f.scale.set(52, 96, 1); g.add(f); return f; });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: accent.clone(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.y = 170; halo.scale.set(420, 420, 1); g.add(halo);
    const light = new THREE.PointLight(accent.clone().lerp(col('#ffd9a0'), 0.35), 300, 1200, 1); light.position.y = 190; g.add(light);
    return { flames, halo, light, seed: rnd() * 10 };
  }

  // the sealed sigil on the back wall, centred where the guardian waits
  const g0 = road.enemies[0];
  const sigil = new THREE.Group(); sigil.position.set(clamp(g0.x, 500, len - 300), 430, WALL_Z + 6); scene.add(sigil);
  const sigMat = new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.9 });
  [[300, 9], [236, 5], [150, 7]].forEach(([r, w], i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, w, 6, 64), sigMat); m.userData.spin = (i % 2 ? -1 : 1) * (0.06 + i * 0.05); sigil.add(m); });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(6, 70, 2), sigMat); s.position.set(Math.cos(a) * 268, Math.sin(a) * 268, 0); s.rotation.z = a + Math.PI / 2; sigil.add(s); }
  const sigGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: accent.clone(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); sigGlow.scale.set(1300, 1300, 1); sigil.add(sigGlow);
  const sigFace = new THREE.Mesh(new THREE.PlaneGeometry(210, 210), new THREE.MeshBasicMaterial({ map: glyphTex(g0.emoji), transparent: true, opacity: 0.35, depthWrite: false })); sigil.add(sigFace);

  // hanging chains and light shafts from a ceiling lost in the dark
  const chainMat = new THREE.MeshStandardMaterial({ color: col('#2a2a30'), roughness: 0.5, metalness: 0.8 });
  for (let i = 0; i < 9; i++) { const h = 500 + rnd() * 500, c = new THREE.Mesh(new THREE.BoxGeometry(5, h, 5), chainMat); c.position.set(rnd() * (len + 400) - 200, 1250 - h / 2, -120 - rnd() * 360); scene.add(c); const w = new THREE.Mesh(new THREE.OctahedronGeometry(16, 0), chainMat); w.position.set(c.position.x, 1250 - h - 10, c.position.z); scene.add(w); }
  const shaftMat = new THREE.MeshBasicMaterial({ color: accentHot.clone().lerp(col('#ffffff'), 0.4), transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(120 + rnd() * 140, 1700), shaftMat); s.position.set(rnd() * len, 800, -80 - rnd() * 380); s.rotation.z = -0.22 + rnd() * 0.1; scene.add(s); }

  // floating slabs (the sim's platforms) hung on chains
  for (const r of road.platforms) {
    const s = add(new THREE.Mesh(new THREE.BoxGeometry(r.w, 22, 130), stone)); s.position.set(r.x + r.w / 2, wy(r.y) - 11, 0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(r.w + 6, 5, 136), trim); cap.position.set(r.x + r.w / 2, wy(r.y) - 2.5, 0); cap.receiveShadow = true; scene.add(cap);
    const under = new THREE.Mesh(new THREE.BoxGeometry(r.w - 20, 3, 100), hot); under.position.set(r.x + r.w / 2, wy(r.y) - 23, 0); scene.add(under);
    for (const dx of [8, r.w - 8]) for (const dz of [-58, 58]) { const c = new THREE.Mesh(new THREE.BoxGeometry(3, 1400, 3), chainMat); c.position.set(r.x + dx, wy(r.y) + 700, dz); scene.add(c); }
  }

  // the gate the cub enters through (intro), at the left end of the hall
  const gate = new THREE.Group(); gate.position.set(-330, 0, 0); scene.add(gate);
  const gateFrame = add(new THREE.Mesh(new THREE.BoxGeometry(90, 900, HALL_Z * 2 + 400), stone)); gateFrame.position.set(-330, 450, 0); gateFrame.visible = false;
  const doorMat = new THREE.MeshStandardMaterial({ color: col(pal.rock).lerp(col('#6a6f7c'), 0.3), roughness: 0.7, metalness: 0.4 });
  const doors = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(0, 0, s * 230); gate.add(piv);
    const d = new THREE.Mesh(new THREE.BoxGeometry(40, 640, 230), doorMat); d.position.set(0, 320, -s * 115); d.castShadow = true; piv.add(d);
    const r = new THREE.Mesh(new THREE.TorusGeometry(70, 8, 6, 24, Math.PI), hot); r.rotation.set(0, Math.PI / 2, s > 0 ? Math.PI / 2 : -Math.PI / 2); r.position.set(22, 330, -s * 228); piv.add(r);
    return { piv, s }; });
  for (const z of [-280, 280]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(120, 760, 110), stone)); p.position.set(-330, 380, z); }
  const lintel = add(new THREE.Mesh(new THREE.BoxGeometry(130, 130, 700), trim)); lintel.position.set(-330, 720, 0);

  // drifting embers
  const EMB = 420, embPos = new Float32Array(EMB * 3), embSeed = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) { embPos[i * 3] = rnd() * (len + 800) - 400; embPos[i * 3 + 1] = rnd() * 800; embPos[i * 3 + 2] = (rnd() - .5) * 1100; embSeed[i] = rnd() * 100; }
  const embGeo = new THREE.BufferGeometry(); embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  scene.add(new THREE.Points(embGeo, new THREE.PointsMaterial({ map: TEX.glow, color: accentHot.clone(), size: 9, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));

  // ---------- the guardian: a colossus assembled from stone and a burning core ----------
  function buildColossus(e) {
    const S = e.h / 148 * 1.22, root = new THREE.Group(), rig = new THREE.Group(); root.add(rig); rig.scale.setScalar(S); scene.add(root);
    const body = new THREE.MeshStandardMaterial({ color: col(pal.rock).lerp(col('#565b66'), 0.45), roughness: 0.75, metalness: 0.25, flatShading: true, emissive: col('#000000') });
    const plate = new THREE.MeshStandardMaterial({ color: col(pal.rockTop).lerp(col('#b9a46a'), 0.45), roughness: 0.45, metalness: 0.6, flatShading: true, emissive: col('#000000') });
    const glowM = new THREE.MeshBasicMaterial({ color: accentHot.clone() });
    const parts = [];
    const mk = (geo, mat, parent, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); parts.push(m); return m; };
    const hips = new THREE.Group(); hips.position.y = 62; rig.add(hips);
    mk(new THREE.CylinderGeometry(30, 22, 26, 6), plate, hips, 0, 0, 0);
    const legs = [-1, 1].map(s => { const leg = new THREE.Group(); leg.position.set(s * 20, -6, 0); hips.add(leg); mk(new THREE.BoxGeometry(20, 34, 22), body, leg, 0, -18, 0); mk(new THREE.BoxGeometry(24, 26, 30), plate, leg, 0, -44, 4); return leg; });
    const torso = new THREE.Group(); torso.position.y = 12; hips.add(torso);
    mk(new THREE.CylinderGeometry(50, 30, 62, 6), body, torso, 0, 34, 0);
    mk(new THREE.BoxGeometry(84, 12, 50), plate, torso, 0, 66, 0);
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(6, 44, 6), plate, torso, s * 16, 34, 30).rotation.x = -0.12;   // rib cage bars over the core
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(15, 0), glowM); core.position.set(0, 36, 22); torso.add(core);
    const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: accent.clone(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); coreHalo.position.copy(core.position); coreHalo.scale.set(150, 150, 1); torso.add(coreHalo);
    const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * 58, 60, 0); torso.add(sh);
      mk(new THREE.DodecahedronGeometry(24, 0), plate, sh, 0, 4, 0); mk(new THREE.ConeGeometry(9, 30, 5), plate, sh, s * 8, 30, 0).rotation.z = -s * 0.5;
      mk(new THREE.BoxGeometry(18, 40, 18), body, sh, s * 6, -26, 0);
      const fore = new THREE.Group(); fore.position.set(s * 8, -48, 0); sh.add(fore);
      mk(new THREE.BoxGeometry(22, 36, 22), body, fore, 0, -18, 0); mk(new THREE.DodecahedronGeometry(21, 0), plate, fore, 0, -46, 0);
      const band = new THREE.Mesh(new THREE.TorusGeometry(14, 3, 5, 12), glowM); band.rotation.x = Math.PI / 2; band.position.y = -6; fore.add(band);
      return { sh, fore, s }; });
    const head = new THREE.Group(); head.position.set(0, 86, 4); torso.add(head);
    mk(new THREE.BoxGeometry(40, 38, 38), body, head, 0, 16, 0);
    for (const s of [-1, 1]) { const h = mk(new THREE.ConeGeometry(7, 34, 5), plate, head, s * 22, 40, 0); h.rotation.z = -s * 0.55; }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ map: glyphTex(e.emoji), transparent: true, alphaTest: 0.04 })); face.position.set(0, 16, 20); head.add(face);
    const eyes = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: accentHot.clone(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); eyes.position.set(0, 18, 24); eyes.scale.set(90, 60, 1); head.add(eyes);
    let crown = null;
    if (e.boss) { crown = new THREE.Group(); crown.position.y = 44; head.add(crown); const cm = new THREE.MeshStandardMaterial({ color: col('#f5c542'), roughness: 0.3, metalness: 0.9, emissive: col('#6a4a00') });
      const r = new THREE.Mesh(new THREE.TorusGeometry(20, 3, 6, 16), cm); r.rotation.x = Math.PI / 2; crown.add(r); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(4, 14, 4), cm); sp.position.set(Math.cos(a) * 20, 8, Math.sin(a) * 20); crown.add(sp); } }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: col('#ff3b1f'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); aura.scale.set(520 * S, 520 * S, 1); root.add(aura); aura.position.y = 110 * S;
    return { root, rig, S, hips, legs, torso, arms, head, core, coreHalo, eyes, face, crown, body, plate, glowM, parts, shadow, aura, yaw: -0.9, pose: { aL: 0, aR: 0, fL: 0, fR: 0, lean: 0, crouch: 0, head: 0, spread: 0 }, lastX: e.x, walk: 0, debris: null };
  }
  const bosses = new Map();

  function poseFor(e, t) {
    const st = e.state, P = { aL: 0.12, aR: 0.12, fL: 0.25, fR: 0.25, lean: 0, crouch: 0, head: 0, spread: 0.1 };
    if (e.asleep) return Object.assign(P, { crouch: 0.6, head: 0.6, lean: 0.25 });
    if (e.transition > 0) return Object.assign(P, { aL: 2.3, aR: 2.3, spread: 1, head: -0.6, lean: -0.25 });
    if (e.stagger > 0 || e.frozen > 0) return Object.assign(P, { crouch: 0.5, head: 0.5, lean: 0.3 + Math.sin(t * 9) * 0.06, aL: -0.2, aR: -0.2 });
    if (st === 'tell') { const k = Math.min(1, e.t / 0.5);
      if (e.family === 'charger') return Object.assign(P, { lean: 0.5 * k, crouch: 0.35 * k, aL: -0.9 * k, aR: -0.9 * k, head: 0.2 });
      if (e.family === 'jumper') return Object.assign(P, { crouch: 0.75 * k, aL: -0.6 * k, aR: -0.6 * k });
      if (e.family === 'shooter') return Object.assign(P, { aR: 2.6 * k, fR: 0.1, aL: 0.4, lean: -0.15 * k, head: -0.2 });
      return Object.assign(P, { aL: 2.2 * k, aR: 2.2 * k, spread: 0.8 * k, lean: 0.2 }); }
    if (st === 'charge') return Object.assign(P, { lean: 0.75, aL: -1.2, aR: -1.2, fL: 0.1, fR: 0.1, head: 0.35 });
    if (st === 'leap' || st === 'hop') return e.vy < 0 ? Object.assign(P, { aL: 2.6, aR: 2.6, spread: 0.5, lean: 0.15 }) : Object.assign(P, { aL: 1.6, aR: 1.6, fL: 1.2, fR: 1.2, crouch: 0.3, lean: 0.4 });
    if (st === 'shoot' || st === 'drop') { const k = e.shotT > 0.15 ? 1 : 0.3; return Object.assign(P, { aR: 1.55 + k * 0.5, fR: 0.05, aL: 0.5, lean: 0.1 }); }
    if (st === 'swoop') return Object.assign(P, { lean: 0.9, aL: -1.8, aR: -1.8, spread: 0.7 });
    if (st === 'rest' || st === 'reload') return Object.assign(P, { crouch: 0.45, head: 0.45, lean: 0.22, aL: -0.1, aR: -0.1, fL: 0.5, fR: 0.5 });
    return P;
  }

  function syncColossus(e, t, dt) {
    let B = bosses.get(e); if (!B) { B = buildColossus(e); bosses.set(e, B); }
    const alive = e.hpLeft > 0, dying = !alive && e.dead > 0;
    if (!alive && !dying && !B.debris) { B.root.visible = false; B.shadow.visible = false; return B; }
    // death: the rig comes apart, every piece falls with its own spin
    if (!alive) {
      if (!B.debris) { B.debris = B.parts.map(m => { const wp = new THREE.Vector3(); m.getWorldPosition(wp); const wq = new THREE.Quaternion(); m.getWorldQuaternion(wq); scene.attach(m); return { m, v: new THREE.Vector3((Math.random() - .5) * 520, 260 + Math.random() * 520, (Math.random() - .5) * 520), w: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3) }; });
        B.core.visible = B.coreHalo.visible = B.eyes.visible = B.face.visible = false; if (B.crown) B.crown.visible = false; B.shadow.visible = false; flashLight.position.copy(B.root.position).add(new THREE.Vector3(0, 160, 120)); flashLight.intensity = 800; }
      for (const d of B.debris) { d.v.y -= 1500 * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < 12) { d.m.position.y = 12; d.v.y *= -0.32; d.v.x *= 0.7; d.v.z *= 0.7; d.w.multiplyScalar(0.7); } d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt; }
      B.aura.material.opacity = Math.max(0, B.aura.material.opacity - dt); return B;
    }
    const want = poseFor(e, t), P = B.pose, k = Math.min(1, dt * (e.state === 'charge' || e.state === 'tell' ? 16 : 9));
    for (const key in P) P[key] = lerp(P[key], want[key], k);
    const vx = (e.x - B.lastX) / Math.max(dt, 1e-3); B.lastX = e.x; const moving = Math.abs(vx) > 20 && !e.airborne;
    B.walk += dt * (moving ? Math.min(14, Math.abs(vx) * 0.06) : 0);
    const targetYaw = e.dir > 0 ? 0.95 : -0.95;                 // three-quarter turn toward the cub, the face still visible to the camera
    B.yaw = lerp(B.yaw, targetYaw, Math.min(1, dt * 10));
    const fly = e.fly ? Math.sin(t * 2.4 + e.bob) * 8 : 0, bob = Math.sin(t * 2 + (e.bob || 0)) * 2.5;
    B.root.position.set(e.x, wy(e.y) + fly, 0); B.root.rotation.y = B.yaw;
    const roar = e.transition > 0 ? 1 + Math.sin(t * 40) * 0.03 + e.transition * 0.08 : 1;
    B.rig.scale.setScalar(B.S * roar);
    B.hips.position.y = 62 - P.crouch * 22 + bob; B.hips.rotation.x = P.lean * 0.5;
    B.torso.rotation.x = P.lean * 0.6 + Math.sin(t * 2) * 0.02; B.torso.rotation.y = Math.sin(B.walk) * 0.12;
    B.head.rotation.x = P.head + (e.hit > 0 ? -0.4 : 0);
    B.legs.forEach((leg, i) => { leg.rotation.x = (moving ? Math.sin(B.walk + i * Math.PI) * 0.7 : 0) - P.lean * 0.4 + (e.airborne ? 0.7 : 0) + P.crouch * (i ? -0.5 : 0.5) * 0.4; });
    B.arms.forEach(a => { const up = a.s < 0 ? P.aL : P.aR, bend = a.s < 0 ? P.fL : P.fR;
      a.sh.rotation.x = -up + (moving ? Math.sin(B.walk + (a.s > 0 ? 0 : Math.PI)) * 0.35 : 0); a.sh.rotation.z = a.s * (0.12 + P.spread * 0.8); a.fore.rotation.x = -bend; });
    if (B.crown) B.crown.rotation.y = t * 0.8;
    // emissive language: red while telling, white on hit / roar, blue when frozen, orange when burning
    const tell = e.state === 'tell' ? 0.6 + Math.sin(t * 30) * 0.4 : 0, hitF = e.hit > 0 && Math.floor(e.hit * 20) % 2 === 0 ? 1 : 0;
    const em = B.body.emissive; em.setRGB(0, 0, 0);
    if (tell) em.setRGB(0.9 * tell, 0.08, 0.04); if (e.burn > 0) em.setRGB(0.5, 0.18, 0.02); if (e.frozen > 0) em.setRGB(0.1, 0.35, 0.6);
    if (e.transition > 0) em.setRGB(1.2, 1.1, 0.9); if (hitF) em.setRGB(1.6, 1.6, 1.6);
    B.plate.emissive.copy(em).multiplyScalar(0.7);
    const rage = e.boss ? e.phase || 0 : 0, coreC = tell ? col('#ff2a10') : e.frozen > 0 ? col('#7fdbff') : accentHot.clone().lerp(col('#ff3b1f'), rage * 0.35);
    B.glowM.color.copy(coreC); B.coreHalo.material.color.copy(coreC); B.eyes.material.color.copy(coreC);
    const pulse = 0.75 + Math.sin(t * (4 + rage * 3)) * 0.25 + tell * 0.8;
    B.core.scale.setScalar(0.9 + pulse * 0.25); B.core.rotation.y = t * 1.5; B.core.rotation.x = t;
    B.coreHalo.material.opacity = Math.min(1, 0.45 + pulse * 0.35); B.coreHalo.scale.setScalar(130 + pulse * 60 + rage * 30);
    B.eyes.material.opacity = e.asleep ? 0.08 : 0.4 + pulse * 0.3;
    B.aura.material.opacity = tell ? 0.55 * tell : e.transition > 0 ? 0.8 : rage * 0.12; B.aura.material.color.set(e.transition > 0 ? '#ffffff' : '#ff3b1f');
    const hgt = Math.max(0, wy(e.y)), sw = e.w * 2.4 * Math.max(0.35, 1 - hgt / 700);
    B.shadow.visible = true; B.shadow.position.set(e.x, 2.2, 0); B.shadow.scale.set(sw, sw * 0.7, 1); B.shadow.material.opacity = 0.55 * Math.max(0.3, 1 - hgt / 600);
    coreLight.position.set(e.x, wy(e.y) + e.h * 0.9, 90); coreLight.color.copy(coreC); coreLight.intensity = 140 + pulse * 120 + (e.transition > 0 ? 500 : 0);
    return B;
  }

  // ---------- the cub ----------
  const pc = document.createElement('canvas'); pc.width = pc.height = 384; const pctx = pc.getContext('2d');
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const pgeo = new THREE.PlaneGeometry(192, 192);
  const player = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ map: ptex, transparent: true, alphaTest: 0.02, depthWrite: false })); player.renderOrder = 6; scene.add(player);
  const ghosts = []; for (let i = 0; i < 5; i++) { const gh = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ map: ptex, transparent: true, opacity: 0, depthWrite: false, color: col('#ffe9a8'), blending: THREE.AdditiveBlending })); gh.renderOrder = 5; gh.visible = false; scene.add(gh); ghosts.push(gh); }
  const pShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })); pShadow.rotation.x = -Math.PI / 2; scene.add(pShadow);
  const mkAura = (c) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, color: col(c), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.renderOrder = 7; scene.add(s); return s; };
  const auraPrimed = mkAura('#ffe27a'), auraShield = mkAura('#d9c38a'), auraFrenzy = mkAura('#a3ff8f'), auraBlock = mkAura('#ffe27a');
  const groundRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.disc, color: col('#ffe27a'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); groundRing.rotation.x = -Math.PI / 2; scene.add(groundRing);
  function surfaceBelow(x, y) { let best = GROUND_Y; for (const r of road.platforms) if (x >= r.x && x <= r.x + r.w && r.y >= y - 2 && r.y < best) best = r.y; return best; }

  // ---------- telegraphs, shots, waves, rings, honey ----------
  const telMat = new THREE.MeshBasicMaterial({ color: col('#ff4030'), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const telStrip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), telMat); telStrip.rotation.x = -Math.PI / 2; telStrip.visible = false; scene.add(telStrip);
  const telDisc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.disc, color: col('#ff4030'), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); telDisc.rotation.x = -Math.PI / 2; telDisc.visible = false; scene.add(telDisc);
  const telBeam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1, 6), telMat); telBeam.visible = false; scene.add(telBeam);
  const telPillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: col('#ff4030'), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); telPillar.visible = false; scene.add(telPillar);
  const GRAV = 2200;
  function syncTelegraph(e, t) {
    telStrip.visible = telDisc.visible = telBeam.visible = telPillar.visible = false;
    if (!e || e.state !== 'tell' || !e.aim || e.hpLeft <= 0) return;
    const T = self.Guardian.TUNE[e.family], k = Math.min(1, e.t / T.tell), pulse = 0.6 + Math.sin(t * 24) * 0.4;
    telMat.opacity = 0.2 + 0.3 * pulse; telDisc.material.opacity = 0.45 + 0.5 * pulse;
    const disc = (x, r) => { telDisc.visible = telPillar.visible = true; const s = r * 2 * (0.6 + 0.4 * k); telDisc.position.set(x, 3, 0); telDisc.scale.set(s, s, 1); telPillar.position.set(x, 300, 0); telPillar.scale.set(s / 2, 600, s / 2); };
    if (e.family === 'charger') {
      const x0 = e.x, x1 = clamp(e.x + e.dir * T.chargeSpeed * T.chargeTime, e.range[0], e.range[1]);
      telStrip.visible = true; telStrip.position.set((x0 + x1) / 2, 3, 0); telStrip.scale.set(Math.abs(x1 - x0), 110, 1);
      if (e.move === 'stomp') disc(x1, 80);
    } else if (e.family === 'jumper') {
      const vy = e.move === 'hops' ? T.leapVY * 0.55 : T.leapVY * 1.15, vx = e.move === 'hops' ? T.leapVX * 0.8 : T.leapVX;
      disc(e.x + e.dir * vx * (2 * vy / GRAV), e.move === 'hops' ? 60 : 110);
    } else if (e.family === 'shooter') {
      if (e.move === 'rain') disc(e.aim.x, 120);
      else { const a = new THREE.Vector3(e.x, wy(e.y - e.h * 0.55), 0), b = new THREE.Vector3(road.p.x, wy(road.p.y - 40), 0), d = b.clone().sub(a); telBeam.visible = true; telBeam.position.copy(a).addScaledVector(d, 0.5); telBeam.scale.set(1, d.length(), 1); telBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
    } else disc(e.move === 'drop' ? road.p.x : e.aim.x + (e.aim.x < e.x ? -1 : 1) * 60, 70);
  }
  const pool = (make) => { const items = []; return { get(i) { while (items.length <= i) items.push(make()); const o = items[i]; o.visible = true; return o; }, hideFrom(i) { for (; i < items.length; i++) items[i].visible = false; } }; };
  const shotPool = pool(() => { const g = new THREE.Group(); const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); s.scale.set(46, 46, 1); const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: accentHot.clone(), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); h.scale.set(130, 130, 1); g.add(h, s); g.userData = { s, h }; g.renderOrder = 6; scene.add(g); return g; });
  const wavePool = pool(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(46, 7, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: col('#ffb347'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.y = Math.PI / 2; scene.add(m); return m; });
  const ringPool = pool(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.ring, color: col('#ffe27a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(m); return m; });
  const honeyMeshes = new Map();
  function honeyMesh(h) {
    const g = new THREE.Group(); const c = h.heal ? '#7cf29e' : '#f1c40f';
    const jar = new THREE.Mesh(new THREE.SphereGeometry(15, 14, 10), new THREE.MeshStandardMaterial({ color: col('#f1c40f'), emissive: col('#a86a00'), emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.2 })); jar.scale.set(0.85, 1.2, 0.85); g.add(jar);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: col(c), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(150, 150, 1); g.add(halo);
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, color: col(c), transparent: true, opacity: h.heal ? 0.9 : 0, blending: THREE.AdditiveBlending, depthWrite: false })); ring.scale.set(90, 90, 1); g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(10, 22, 700, 10, 1, true), new THREE.MeshBasicMaterial({ color: col(c), transparent: true, opacity: h.heal ? 0.14 : 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 340; g.add(beam);
    g.userData = { ring }; scene.add(g); return g;
  }

  // sim particles as glowing points with a little depth of their own
  const PMAX = 900, pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pPts = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: TEX.glow, size: 22, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); pPts.frustumCulled = false; scene.add(pPts);
  const tmpC = new THREE.Color();

  // lightning: jagged ribbons from the cub (and the dark above) into the guardian when a burst lands
  const BOLTS = 7, SEG = 14;
  const boltGeo = new THREE.BufferGeometry(), boltPos = new Float32Array(BOLTS * SEG * 6 * 3);
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  const boltCore = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: col('#ffffff'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); boltCore.frustumCulled = false; boltCore.renderOrder = 8; scene.add(boltCore);
  const boltGlowGeo = new THREE.BufferGeometry(), boltGlowPos = new Float32Array(BOLTS * SEG * 6 * 3);
  boltGlowGeo.setAttribute('position', new THREE.BufferAttribute(boltGlowPos, 3));
  const boltGlow = new THREE.Mesh(boltGlowGeo, new THREE.MeshBasicMaterial({ color: col('#ffd75a'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); boltGlow.frustumCulled = false; boltGlow.renderOrder = 7; scene.add(boltGlow);
  let boltT = 0, lastBurstFx = 0; const boltTarget = new THREE.Vector3();
  function ribbon(arr, off, a, b, w) {   // a quad between two points, widened across the view's horizontal
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w;
    const v = [a.x - nx, a.y - ny, a.z, a.x + nx, a.y + ny, a.z, b.x + nx, b.y + ny, b.z, a.x - nx, a.y - ny, a.z, b.x + nx, b.y + ny, b.z, b.x - nx, b.y - ny, b.z];
    for (let i = 0; i < 18; i++) arr[off + i] = v[i];
  }
  function strikeBolts() {
    const p = road.p, from = new THREE.Vector3(p.x, wy(p.y) + 70, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < BOLTS; i++) {
      const sky = i >= 3, start = sky ? new THREE.Vector3(boltTarget.x + (Math.random() - .5) * 700, 1200, (Math.random() - .5) * 300) : from;
      a.copy(start);
      for (let s = 0; s < SEG; s++) {
        const k = (s + 1) / SEG, j = (1 - Math.abs(k - 0.5) * 2) * (sky ? 90 : 60);
        b.lerpVectors(start, boltTarget, k); if (s < SEG - 1) { b.x += (Math.random() - .5) * j; b.y += (Math.random() - .5) * j; b.z += (Math.random() - .5) * j * 0.6; }
        const off = (i * SEG + s) * 18; ribbon(boltPos, off, a, b, sky ? 3 : 4); ribbon(boltGlowPos, off, a, b, sky ? 14 : 20); a.copy(b);
      }
    }
    boltGeo.attributes.position.needsUpdate = true; boltGlowGeo.attributes.position.needsUpdate = true;
  }

  // ---------- floating text as DOM, projected from the world ----------
  const floatBox = $('.a3-floats'), floatEls = new Map(), v3 = new THREE.Vector3();
  function syncFloats() {
    const seen = new Set();
    for (const f of road.floats) {
      let el = floatEls.get(f);
      if (!el) { el = document.createElement('div'); const num = /^[-+−]?\d/.test(f.text) && f.text.length < 9; el.className = 'a3-f' + (num ? ' num' : '') + (num && parseInt(f.text.replace(/\D/g, ''), 10) >= 40 ? ' big' : ''); el.textContent = num ? f.text.replace(/\d+/, n => Number(n).toLocaleString('en-US')) : f.text; el.style.color = f.color; el._j = (Math.random() - .5) * 30; floatBox.append(el); floatEls.set(f, el); }
      seen.add(f);
      v3.set(f.x, wy(f.y) + 20, 30).project(camera);
      const x = (v3.x * 0.5 + 0.5) * W + el._j, y = (-v3.y * 0.5 + 0.5) * H;
      el.style.opacity = v3.z < 1 ? clamp(f.t * 1.4, 0, 1) : 0;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${(1 + Math.max(0, f.t - 0.8) * 1.2).toFixed(2)})`;
    }
    for (const [f, el] of floatEls) if (!seen.has(f)) { el.remove(); floatEls.delete(f); }
  }

  // ---------- camera ----------
  const camS = { x: road.p.x, y: 150, d: 900, yaw: -0.3, lift: 0 };
  let intro = null;
  function gameCam(dt, out) {
    const p = road.p, e = road.enemies[0], alive = e && (e.hpLeft > 0 || e.dead > 0);
    const ex = alive ? e.x : p.x + p.facing * 200, sep = Math.abs(ex - p.x);
    const k = Math.min(1, dt * 3.2);
    camS.x = lerp(camS.x, lerp(p.x, ex, 0.44), k);
    camS.lift = lerp(camS.lift, Math.max(0, wy(p.y) - 60) * 0.35 + (alive ? Math.max(0, wy(e.y)) * 0.18 : 0), k);
    const fit = 1 / Math.min(1, camera.aspect / 1.7);                          // pull back on narrow windows
    camS.d = lerp(camS.d, clamp(600 + sep * 0.62, 640, 1380) * fit, Math.min(1, dt * 2.2));
    camS.yaw = lerp(camS.yaw, clamp((ex - p.x) / 620, -1, 1) * 0.36, Math.min(1, dt * 1.4));
    const tx = clamp(camS.x, 120, len - 120), ty = 150 + camS.lift;
    out.pos.set(tx - Math.sin(camS.yaw) * camS.d, ty + 60 + camS.d * 0.13, Math.cos(camS.yaw) * camS.d);
    out.look.set(tx, ty, 0);
  }
  const shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() }, live = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let fovKick = 0;

  // Intro: through the gate, down the hall, up the guardian, then settle behind the cub
  function playIntro(title, sub) {
    if (intro) return intro.promise;
    let done; const promise = new Promise(r => { done = r; });
    intro = { t: 0, dur: 6.2, promise, done };
    $('.a3-bars').classList.add('on'); $('.a3-title b').textContent = title || ''; $('.a3-title span').textContent = sub || '';
    const skip = (ev) => { if (intro && intro.t > 0.4) intro.t = Math.max(intro.t, intro.dur - 0.9); };
    addEventListener('keydown', skip); addEventListener('pointerdown', skip);
    intro.cleanup = () => { removeEventListener('keydown', skip); removeEventListener('pointerdown', skip); };
    try { self.GameMusic?.sfx?.('roar'); } catch (e) {}
    return promise;
  }
  function introCam(dt, out) {
    const I = intro, e = road.enemies[0], t = I.t, ex = e.x, eh = e.h * 1.5;
    const open = ease(clamp((t - 0.3) / 1.5, 0, 1)); doors.forEach(d => { d.piv.rotation.y = d.s * open * 1.75; });
    gateFrame.visible = false;
    const A = { pos: new THREE.Vector3(-900, 170, 0), look: new THREE.Vector3(-300, 200, 0) };
    const Bp = { pos: new THREE.Vector3(lerp(-900, ex - 620, ease(clamp((t - 0.9) / 2.6, 0, 1))), 150, 40), look: new THREE.Vector3(ex, eh * 0.55, 0) };
    const k2 = ease(clamp((t - 3.3) / 1.5, 0, 1));
    const C = { pos: new THREE.Vector3(ex - 560 + k2 * 130, 50 + k2 * (eh * 0.55), 330 - k2 * 70), look: new THREE.Vector3(ex, eh * (0.55 + 0.2 * k2), 0) };
    gameCam(dt, live);
    const k1 = ease(clamp((t - 0.9) / 0.8, 0, 1)), k3 = ease(clamp((t - 3.3) / 0.7, 0, 1)), k4 = ease(clamp((t - (I.dur - 1.1)) / 1.1, 0, 1));
    out.pos.lerpVectors(A.pos, Bp.pos, k1).lerp(C.pos, k3).lerp(live.pos, k4);
    out.look.lerpVectors(A.look, Bp.look, k1).lerp(C.look, k3).lerp(live.look, k4);
    $('.a3-title').classList.toggle('on', t > 3.4 && t < I.dur - 1.2);
    if (t > 3.3 && !I.roared) { I.roared = true; road.shake = Math.max(road.shake, 0.5); flashLight.position.set(ex, eh, 160); flashLight.intensity = 500; try { self.GameMusic?.sfx?.('roar'); } catch (e2) {} }
    I.t += dt;
    if (I.t >= I.dur) { $('.a3-bars').classList.remove('on'); $('.a3-title').classList.remove('on'); I.cleanup(); const d = I.done; intro = null; camS.yaw = Math.atan2(-(live.pos.x - live.look.x), live.pos.z); d(); }
  }

  // ---------- frame ----------
  function sync(t, dt) {
    const p = road.p, e = road.enemies[0];
    hazMat.uniforms.uTime.value = t;
    for (const b of braziers) { const f = 0.8 + Math.sin(t * 9 + b.seed) * 0.12 + Math.sin(t * 23 + b.seed * 3) * 0.08; b.light.intensity = 300 * f; b.flames.forEach((s, i) => { s.scale.set(46 + Math.sin(t * 11 + i + b.seed) * 10, 88 + Math.sin(t * 13 + i * 2 + b.seed) * 20, 1); s.material.rotation = Math.sin(t * 7 + i + b.seed) * 0.12; }); b.halo.material.opacity = 0.28 * f; }
    sigil.children.forEach(m => { if (m.userData.spin) m.rotation.z += m.userData.spin * dt * (1 + (e?.phase || 0)); });
    const sigK = e && e.hpLeft > 0 ? 0.55 + Math.sin(t * 2) * 0.15 + (e.transition > 0 ? 0.6 : 0) : 0.15;
    sigMat.opacity = Math.min(1, sigK + 0.2); sigGlow.material.opacity = sigK * 0.6;
    for (let i = 0; i < EMB; i++) { embPos[i * 3 + 1] += (14 + (embSeed[i] % 5) * 6) * dt; embPos[i * 3] += Math.sin(t * 0.6 + embSeed[i]) * 8 * dt; if (embPos[i * 3 + 1] > 800) embPos[i * 3 + 1] = 0; }
    embGeo.attributes.position.needsUpdate = true;

    for (const en of road.enemies) syncColossus(en, t, dt);
    syncTelegraph(e, t);

    // the cub: sprite on a card that turns with the camera
    pctx.clearRect(0, 0, 384, 384); try { road.sprite.draw(pctx, 192, 340, 2, 0); } catch (err) {} ptex.needsUpdate = true;
    const alive = p.dead <= 0;
    player.visible = alive; player.material.opacity = alive && p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0 ? 0.45 : 1;
    player.position.set(p.x, wy(p.y) + 74, 0); player.quaternion.copy(camera.quaternion);
    ghosts.forEach((gh, i) => { const tr = road.trail[i]; gh.visible = !!tr; if (tr) { gh.position.set(tr.x, wy(tr.y) + 74, -1); gh.quaternion.copy(camera.quaternion); gh.material.opacity = Math.min(0.55, tr.t * 1.6); } });
    const gy = surfaceBelow(p.x, p.y), hgt = Math.max(0, gy - p.y), sw = 110 * Math.max(0.35, 1 - hgt / 420);
    pShadow.visible = alive; pShadow.position.set(p.x, wy(gy) + 2.4, 0); pShadow.scale.set(sw, sw * 0.7, 1); pShadow.material.opacity = 0.6 * Math.max(0.25, 1 - hgt / 380);
    lantern.position.set(p.x, wy(p.y) + 110, 120); lantern.intensity = alive ? (p.primed > 0 ? 280 : 130) : 0;
    const cy = wy(p.y) + 62, aura = (s, on, w, h, op) => { s.visible = on && alive; if (!s.visible) return; s.position.set(p.x, cy, 2); s.scale.set(w, h, 1); s.material.opacity = op; };
    const pulse = 0.7 + Math.sin(t * 18) * 0.3;
    aura(auraPrimed, p.primed > 0, 150 + pulse * 22, 185 + pulse * 22, Math.min(1, p.primed) * 0.9);
    aura(auraShield, p.shieldFx > 0, 160, 195, 0.6);
    aura(auraFrenzy, p.frenzy > 0, 140, 180, 0.5 + Math.sin(t * 20) * 0.2);
    aura(auraBlock, !!p.blocking, 120, 150, 0.95); if (auraBlock.visible) auraBlock.position.x += road.sprite.facing * 30;
    groundRing.visible = alive && (p.primed > 0 || p.burst >= 1); if (groundRing.visible) { const s = 150 + Math.sin(t * 6) * 14 + (p.primed > 0 ? 50 : 0); groundRing.position.set(p.x, wy(gy) + 2.8, 0); groundRing.scale.set(s, s, 1); groundRing.material.opacity = p.primed > 0 ? 0.9 : 0.4; groundRing.rotation.z = t * 0.8; }

    let n = 0;
    for (const q of road.projectiles) { const g = shotPool.get(n++); const tex = glyphTex(q.glyph); if (g.userData.s.material.map !== tex) { g.userData.s.material.map = tex; g.userData.s.material.needsUpdate = true; } const sc = 52 * (q.scale || 1) / 0.7 * 0.9; g.userData.s.scale.set(sc, sc, 1); g.position.set(q.x, wy(q.y), 0); g.userData.s.material.rotation = t * 5; }
    shotPool.hideFrom(n); n = 0;
    for (const w of road.waves) { const m = wavePool.get(n++); const s = (w.scale || 1) * 1.5; m.position.set(w.x, 0, 0); m.scale.set(s * 2.2, s, s); m.material.opacity = Math.min(1, w.t) * 0.9; }
    wavePool.hideFrom(n); n = 0;
    for (const r of road.rings) { const m = ringPool.get(n++); const life = r.big ? 1 - r.t / 0.7 : 1 - r.t / 0.35, rad = r.big ? 60 + life * 520 : 20 + life * 70;
      m.position.set(r.x, r.big ? wy(GROUND_Y) + 3 : wy(r.y), 0); m.rotation.set(-Math.PI / 2, 0, 0); m.scale.set(rad * 2, rad * 2, 1); m.material.opacity = (1 - life) * (r.big ? 1 : 0.8); }
    ringPool.hideFrom(n);
    const seenH = new Set();
    for (const h of road.honey) { if (h.taken) continue; seenH.add(h); let g = honeyMeshes.get(h); if (!g) { g = honeyMesh(h); honeyMeshes.set(h, g); }
      g.visible = !(h.heal && h.ttl < 2.5 && Math.floor(t * 8) % 2); g.position.set(h.x, wy(h.y) + Math.sin(t * 3 + h.t) * 5, 0); g.userData.ring.material.rotation = t; }
    for (const [h, g] of honeyMeshes) if (!seenH.has(h)) { scene.remove(g); honeyMeshes.delete(h); }

    const parts = road.particles, m = Math.min(PMAX, parts.length);
    for (let i = 0; i < m; i++) { const q = parts[i]; if (q._z === undefined) { q._z = (Math.random() - .5) * 90; q._vz = (Math.random() - .5) * 160; } q._z += q._vz * dt; const a = clamp(q.t, 0, 1);
      pPos[i * 3] = q.x; pPos[i * 3 + 1] = wy(q.y); pPos[i * 3 + 2] = q._z; tmpC.set(q.c); pCol[i * 3] = tmpC.r * a; pCol[i * 3 + 1] = tmpC.g * a; pCol[i * 3 + 2] = tmpC.b * a; }
    pGeo.setDrawRange(0, m); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;

    // burst: lightning into the guardian, a flash, a kick of the lens
    const bf = p.burstFx || 0;
    if (bf > lastBurstFx + 0.05) { boltT = 0.42; fovKick = 1; if (e) boltTarget.set(e.x, wy(e.y) + e.h * 0.8, 0); flashLight.position.copy(boltTarget).add(new THREE.Vector3(0, 60, 160)); flashLight.intensity = 900; }
    lastBurstFx = bf;
    if (boltT > 0) { boltT -= dt; if (e) boltTarget.set(e.x, wy(e.y) + e.h * 0.8, 0); strikeBolts(); const a = clamp(boltT / 0.42, 0, 1) * (0.6 + Math.random() * 0.4); boltCore.material.opacity = a; boltGlow.material.opacity = a * 0.35; } else { boltCore.material.opacity = 0; boltGlow.material.opacity = 0; }
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 2200);
    $('.a3-flash').style.opacity = (Math.max(bf * 0.55, boltT > 0 ? boltT * 0.5 : 0)).toFixed(3);
    fovKick = Math.max(0, fovKick - dt * 2.5);

    // camera
    if (intro) introCam(dt, shot); else { gameCam(dt, shot); doors.forEach(d => { d.piv.rotation.y = d.s * 1.75; }); }
    const sh = road.shake > 0 ? road.shake : 0;
    camera.position.set(shot.pos.x + (Math.random() - .5) * 26 * sh, shot.pos.y + (Math.random() - .5) * 20 * sh, shot.pos.z + (Math.random() - .5) * 12 * sh);
    camera.lookAt(shot.look); camera.rotation.z += (Math.random() - .5) * 0.012 * sh;
    const fov = FOV - fovKick * 5 + (e && e.transition > 0 ? -3 : 0); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    key.position.set(shot.look.x - 520, 1050, 620); key.target.position.set(shot.look.x, 0, 0);
    syncFloats();
  }

  let last = performance.now(), failed = false;
  const draw2d = road.draw.bind(road);
  function render() {
    if (failed) return draw2d();
    try {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
      sync(t, dt); renderer.render(scene, camera);
    } catch (err) { console.error('[arena3d] falling back:', err); failed = true; detach(); opts.onFail?.(err); }
  }
  function detach() { road.draw = draw2d; gl.remove(); ui.remove(); simCanvas.style.opacity = '1'; removeEventListener('resize', resize); if (intro) { intro.cleanup(); intro.done(); intro = null; } try { renderer.dispose(); } catch (e) {} }
  gl.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; detach(); opts.onFail?.(new Error('context lost')); });
  road.draw = render;
  return { detach, renderer, scene, camera, playIntro, get introPlaying() { return !!intro; } };
}
