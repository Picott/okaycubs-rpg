// 3D renderer for the Honey Road / den arena. The simulation (honey-road.js) is untouched: this module
// replaces road.draw() and renders the same state as a 2.5D world in Three.js — the gameplay stays on
// the z = 0 plane, the world around it has depth. The camera looks straight down -z, so the play plane
// maps to the screen with a plain scale + offset and a 2D overlay canvas can draw text, telegraphs and
// particles in game coordinates right on top.
import * as THREE from '/vendor/three.module.min.js';

const GROUND_Y = 480, FLOOR_H = 160, DEPTH = 240, SLAB_DEPTH = 110, FOV = 35;
const wy = y => GROUND_Y - y;                       // game y (down) → world y (up)
const col = c => new THREE.Color(c);
const rgbaToHex = s => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || ''); return m ? `rgb(${m[1]},${m[2]},${m[3]})` : (s || '#ff6a1a'); };

function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function skyTexture(top, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.75, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glyphCache = new Map();
function glyphTexture(glyph) {
  if (glyphCache.has(glyph)) return glyphCache.get(glyph);
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  g.font = '120px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 80, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; glyphCache.set(glyph, t); return t;
}

// Molten / liquid surface: flowing bands with bright crust lines, fading to the deep colour with distance
const HAZARD_VERT = `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HAZARD_FRAG = `
  uniform float uTime; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uDeep; uniform float uGlow; uniform float uCamX;
  varying vec2 vUv; varying vec3 vPos;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec2 p = vec2(vPos.x + uCamX, vPos.y) * 0.006;
    float a = n(p * 1.3 + vec2(uTime * 0.05, uTime * 0.03));
    float b = n(p * 3.1 - vec2(uTime * 0.08, 0.0) + a);
    float crust = smoothstep(0.42, 0.58, b);
    float veins = pow(1.0 - abs(b - 0.5) * 2.0, 6.0);
    vec3 c = mix(uMid, uDeep, crust * 0.85);
    c += uTop * veins * uGlow;
    float far = smoothstep(-900.0, 1300.0, vPos.y);            // local +y is away from the camera after the rotation
    c = mix(c, uDeep, far * 0.75);
    gl_FragColor = vec4(c, 1.0);
  }`;

export function attach(road, simCanvas, opts = {}) {
  const mobile = matchMedia('(pointer:coarse)').matches;
  const gl = document.createElement('canvas'), fx = document.createElement('canvas');
  for (const c of [gl, fx]) { c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;'; }
  fx.style.pointerEvents = 'none';
  simCanvas.after(gl); gl.after(fx);
  simCanvas.style.opacity = '0';

  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 6000);
  const fctx = fx.getContext('2d');
  const glowTex = glowTexture();
  let W = 1, H = 1, dpr = 1, dist = 1000, visH = 630, visW = 900, s = 1;
  const cam = { x: road.p.x, y: 130 };

  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(mobile ? 1.5 : 2, devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
    camera.aspect = W / H;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // show ~630 world units of height; on narrow (portrait) screens pull back until ~820 units of width fit
    dist = Math.max(315 / t, 410 / (t * camera.aspect));
    visH = 2 * dist * t; visW = visH * camera.aspect; s = H / visH;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // ---------- world ----------
  let world = null, builtFor = null;
  const dyn = { movers: [], crumbles: [], springs: [], totems: [], honey: new Map(), enemies: new Map(), shots: [], ghosts: [] };

  function build() {
    if (world) { scene.remove(world); world.traverse(o => { o.geometry?.dispose?.(); }); }
    world = new THREE.Group(); scene.add(world);
    dyn.movers = []; dyn.crumbles = []; dyn.springs = []; dyn.totems = []; dyn.honey.clear(); dyn.enemies.clear(); dyn.shots = []; dyn.ghosts = [];
    const L = road.L, pal = L.palette, hz = (self.HONEY_ROAD_HAZARDS || {})[L.hazard] || { top: '#ffb347', mid: '#ff6a1a', deep: '#6a1202' };
    const rnd = seeded((L.length | 0) * 31 + (L.title || '').length * 977);
    const len = L.length;

    scene.fog = new THREE.Fog(col(pal.skyBottom), 1100, 4200);
    renderer.setClearColor(col(pal.skyBottom));

    // sky + horizon glow (follow the camera)
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: skyTexture(pal.skyTop, pal.skyBottom), fog: false, depthWrite: false }));
    sky.position.z = -3600; sky.renderOrder = -10; world.add(sky); world.userData.sky = sky;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(rgbaToHex(pal.glow)), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.set(2600, 1100, 1); glow.position.set(0, 40, -1500); world.add(glow); world.userData.glow = glow;

    // lights: warm key from the upper left, hazard-coloured bounce from below, a lantern on the cub
    const hemi = new THREE.HemisphereLight(col(pal.skyTop).lerp(col('#8899ff'), 0.25), col(hz.mid), 1.25); world.add(hemi);
    const key = new THREE.DirectionalLight(col('#ffe2bd'), 1.6); key.position.set(-0.5, 1, 0.8); world.add(key);
    const lantern = new THREE.PointLight(col('#ffd9a0'), 2.2, 520, 1.2); world.add(lantern); world.userData.lantern = lantern;

    // the hazard surface
    const hazard = new THREE.Mesh(new THREE.PlaneGeometry(len + 6000, 2600, 1, 1), new THREE.ShaderMaterial({
      vertexShader: HAZARD_VERT, fragmentShader: HAZARD_FRAG,
      uniforms: { uTime: { value: 0 }, uTop: { value: col(hz.top) }, uMid: { value: col(hz.mid) }, uDeep: { value: col(hz.deep) }, uGlow: { value: L.hazard === 'chasm' ? 0.15 : 1.0 }, uCamX: { value: 0 } },
    }));
    hazard.rotation.x = -Math.PI / 2; hazard.position.set(len / 2, -36, -900); world.add(hazard); world.userData.hazard = hazard;

    // rock materials
    const rock = new THREE.MeshStandardMaterial({ color: col(pal.rock), roughness: 0.95, flatShading: true });
    const rockTop = new THREE.MeshStandardMaterial({ color: col(pal.rockTop), roughness: 0.85, flatShading: true });
    const iceTop = new THREE.MeshStandardMaterial({ color: col('#dff3ff'), roughness: 0.25, metalness: 0.1, flatShading: true });
    const far = new THREE.MeshStandardMaterial({ color: col(pal.far), roughness: 1, flatShading: true });
    const mid = new THREE.MeshStandardMaterial({ color: col(pal.mid), roughness: 1, flatShading: true });

    // ground: a rock body with a lighter cap, jagged rocks along the back edge, low stones in front
    const boulderGeo = new THREE.DodecahedronGeometry(1, 0), spikeGeo = new THREE.ConeGeometry(1, 1, 5);
    const boulders = [], spikes = [];
    for (const r of road.solids) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(r.w, FLOOR_H, DEPTH), rock); body.position.set(r.x + r.w / 2, -FLOOR_H / 2 - 6, 0); world.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(r.w + 6, 12, DEPTH + 10), r.ice ? iceTop : rockTop); cap.position.set(r.x + r.w / 2, -6, 0); world.add(cap);
      for (let x = r.x + 30; x < r.x + r.w - 20; x += 120 + rnd() * 170) {
        const tall = 30 + rnd() * 80;
        spikes.push({ x, y: tall / 2 - 2, z: -DEPTH / 2 - 50 - rnd() * 140, sx: 14 + rnd() * 20, sy: tall, rot: rnd() * 6 });
        if (rnd() < 0.7) boulders.push({ x: x + rnd() * 40, y: 6, z: -DEPTH / 2 + 20 + rnd() * 50, s: 8 + rnd() * 16, rot: rnd() * 6 });
        if (rnd() < 0.35) boulders.push({ x: x + rnd() * 50, y: 3, z: DEPTH / 2 - 14 - rnd() * 20, s: 5 + rnd() * 7, rot: rnd() * 6 });
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
    const spikeMesh = new THREE.InstancedMesh(spikeGeo, rock, spikes.length || 1); spikeMesh.count = spikes.length;
    spikes.forEach((o, i) => { e3.set(0, o.rot, (Math.sin(o.rot) * 0.12)); q.setFromEuler(e3); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.sx, o.sy, o.sx)); spikeMesh.setMatrixAt(i, m4); });
    const boulderMesh = new THREE.InstancedMesh(boulderGeo, rockTop, boulders.length || 1); boulderMesh.count = boulders.length;
    boulders.forEach((o, i) => { e3.set(o.rot, o.rot * 1.7, 0); q.setFromEuler(e3); m4.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(o.s, o.s * 0.8, o.s)); boulderMesh.setMatrixAt(i, m4); });
    world.add(spikeMesh, boulderMesh);

    // distant ranges: big cones rising out of the hazard, two depths
    const ranges = [];
    for (let x = -1500; x < len + 1500; x += 260 + rnd() * 240) ranges.push({ x, z: -700 - rnd() * 250, r: 90 + rnd() * 90, h: 260 + rnd() * 260, m: 0 });
    for (let x = -2500; x < len + 2500; x += 520 + rnd() * 420) ranges.push({ x, z: -1700 - rnd() * 500, r: 330 + rnd() * 220, h: 620 + rnd() * 420, m: 1 });
    const coneGeo = new THREE.ConeGeometry(1, 1, 6);
    for (const k of [0, 1]) {
      const list = ranges.filter(o => o.m === k), mesh = new THREE.InstancedMesh(coneGeo, k ? far : mid, list.length || 1); mesh.count = list.length;
      list.forEach((o, i) => { e3.set(0, o.x, 0); q.setFromEuler(e3); m4.compose(new THREE.Vector3(o.x, o.h / 2 - 60, o.z), q, new THREE.Vector3(o.r, o.h, o.r)); mesh.setMatrixAt(i, m4); });
      world.add(mesh);
    }

    // platforms, movers, crumbling slabs
    const slab = (r, material) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, SLAB_DEPTH), material || rock); body.position.y = -r.h / 2 - 3; g.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(r.w + 4, 6, SLAB_DEPTH + 6), r.ice ? iceTop : rockTop); cap.position.y = -3; g.add(cap);
      g.position.set(r.x + r.w / 2, wy(r.y), 0); world.add(g); return g;
    };
    for (const r of road.platforms) slab(r);
    const moverMat = new THREE.MeshStandardMaterial({ color: col(pal.rock).lerp(col('#ffffff'), 0.12), roughness: 0.6, metalness: 0.3, flatShading: true });
    for (const m of road.movers) dyn.movers.push({ m, g: slab(m, moverMat) });
    const crackMat = new THREE.MeshStandardMaterial({ color: col('#4a2c22'), roughness: 1, flatShading: true, emissive: col('#ff7a2a'), emissiveIntensity: 0 });
    for (const c of road.crumbles) dyn.crumbles.push({ c, g: slab(c, crackMat.clone()) });

    // springs (bouncy mushrooms)
    for (const sp of road.springs) {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 26, 8), new THREE.MeshStandardMaterial({ color: col('#e8d9b5'), roughness: 0.8 })); stem.position.y = 13; g.add(stem);
      const capM = new THREE.Mesh(new THREE.SphereGeometry(34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col('#ff6b8a'), roughness: 0.5, emissive: col('#ff3b6a'), emissiveIntensity: 0.25 })); capM.scale.y = 0.5; capM.position.y = 24; g.add(capM);
      g.position.set(sp.x, wy(sp.y), 0); world.add(g); dyn.springs.push({ sp, g });
    }

    // checkpoints: stone totems that light up
    for (const c of road.checkpoints) {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 92, 6), rock); post.position.y = 46; g.add(post);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(16, 10, 10, 6), rockTop); bowl.position.y = 96; g.add(bowl);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#ff9a3a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.position.y = 118; flame.scale.set(90, 110, 1); flame.visible = false; g.add(flame);
      const light = new THREE.PointLight(col('#ff9a3a'), 0, 380, 1.4); light.position.y = 120; g.add(light);
      g.position.set(c.x, 0, -40); world.add(g); dyn.totems.push({ c, flame, light });
    }

    // portal: three rings turning around a glowing core
    if (Number.isFinite(L.portal)) {
      const g = new THREE.Group(); const rings = [];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(52 + i * 13, 3.2 - i * 0.6, 8, 48), new THREE.MeshBasicMaterial({ color: col(['#3498db', '#7fdbff', '#f5e06e'][i]) }));
        ring.scale.y = 1.45; g.add(ring); rings.push(ring);
      }
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#7fdbff'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(230, 300, 1); g.add(core);
      const light = new THREE.PointLight(col('#7fdbff'), 3, 520, 1.3); g.add(light);
      g.position.set(L.portal, 80, 0); world.add(g); world.userData.portal = { g, rings, core, light };
    }

    // embers / motes drifting up through the whole view
    const N = mobile ? 110 : 220, pos = new Float32Array(N * 3), cols = new Float32Array(N * 3), seeds = [];
    const emberCols = (pal.ember || ['#ff6b35', '#f1c40f', '#ff3b1f']).map(col);
    for (let i = 0; i < N; i++) { seeds.push({ x: rnd() * 2400, y: rnd() * 800 - 80, z: 260 - rnd() * 900, v: 18 + rnd() * 46, ph: rnd() * 6 }); const c = emberCols[i % emberCols.length]; cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); eg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 9, map: glowTex, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    embers.frustumCulled = false; world.add(embers); world.userData.embers = { embers, seeds };

    // the cub: the 2D chibi sprite drawn to a texture and stood up in the world, plus dash ghosts and a blob shadow
    const pc = document.createElement('canvas'); pc.width = pc.height = 384;
    const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
    const pgeo = new THREE.PlaneGeometry(192, 192);
    const player = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ map: ptex, transparent: true, alphaTest: 0.02, depthWrite: false })); player.renderOrder = 5; world.add(player);
    for (let i = 0; i < 5; i++) { const gh = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ map: ptex, transparent: true, opacity: 0, depthWrite: false, color: col('#ffe9a8') })); gh.renderOrder = 4; gh.visible = false; world.add(gh); dyn.ghosts.push(gh); }
    const shadowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; world.add(shadow);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#ffd9a0'), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); aura.scale.set(230, 230, 1); world.add(aura);
    world.userData.player = { pc, pctx: pc.getContext('2d'), ptex, player, shadow, aura };
    world.userData.shadowMat = shadowMat;
    builtFor = road.solids;
  }

  // ---------- per-frame sync ----------
  const honeyGeo = new THREE.SphereGeometry(11, 10, 8), healRingGeo = new THREE.TorusGeometry(24, 1.6, 6, 28);
  function honeyMesh(h) {
    const g = new THREE.Group();
    const drop = new THREE.Mesh(honeyGeo, new THREE.MeshStandardMaterial({ color: col(h.heal ? '#b8ffcb' : '#f5c518'), emissive: col(h.heal ? '#2ecc71' : '#e09a10'), emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }));
    drop.scale.set(0.82, 1.25, 0.82); g.add(drop);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(6.5, 13, 8), drop.material); tip.position.y = 17; g.add(tip);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(h.heal ? '#7cf29e' : '#f5e06e'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(70, 70, 1); g.add(halo);
    if (h.heal) { const ring = new THREE.Mesh(healRingGeo, new THREE.MeshBasicMaterial({ color: col('#7cf29e'), transparent: true, opacity: 0.8 })); g.add(ring); g.userData.ring = ring; }
    world.add(g); return g;
  }
  function enemyMesh(e) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glyphTexture(e.emoji), transparent: true, alphaTest: 0.03, depthWrite: false })); body.renderOrder = 4; g.add(body);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#ff3b1f'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); halo.renderOrder = 3; g.add(halo);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), world.userData.shadowMat); sh.rotation.x = -Math.PI / 2; sh.renderOrder = 2; world.add(sh);
    world.add(g); return { g, body, halo, sh };
  }
  function surfaceBelow(x, y) {                      // top (game y) of the nearest surface under a point, for blob shadows
    let best = null;
    const test = r => { if (x >= r.x && x <= r.x + r.w && r.y >= y - 2 && (best === null || r.y < best)) best = r.y; };
    road.solids.forEach(test); road.platforms.forEach(test); road.movers.forEach(test); road.crumbles.forEach(c => { if (!c.gone) test(c); });
    return best;
  }

  function sync(t, dt) {
    const U = world.userData, p = road.p, L = road.L;
    // camera: lead the cub a little, keep the ground in the lower third, rise when the cub climbs
    const tx = THREE.MathUtils.clamp(p.x + p.facing * 90, visW * 0.5 - 60, Math.max(visW * 0.5 - 60, L.length - visW * 0.5 + 60));
    const ty = visH * 0.24 + Math.max(0, wy(p.y) - 170) * 0.55;
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    const shx = road.shake > 0 ? (Math.random() - .5) * 14 * road.shake : 0, shy = road.shake > 0 ? (Math.random() - .5) * 10 * road.shake : 0;
    camera.position.set(cam.x + shx, cam.y + shy, dist); camera.lookAt(cam.x + shx, cam.y + shy, 0);
    U.sky.position.set(cam.x, cam.y, -3600); const far = dist + 3600, t2 = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * far * 2; U.sky.scale.set(t2 * camera.aspect * 1.1, t2 * 1.1, 1);
    U.glow.position.x = cam.x;
    U.hazard.material.uniforms.uTime.value = t; U.hazard.position.x = cam.x; U.hazard.material.uniforms.uCamX.value = cam.x;

    for (const { m, g } of dyn.movers) g.position.set(m.x + m.w / 2, wy(m.y), 0);
    for (const { c, g } of dyn.crumbles) {
      g.visible = !c.gone; const shk = c.timer > 0 && c.timer < 0.7 ? (Math.random() - .5) * 4 : 0;
      g.position.set(c.x + c.w / 2 + shk, wy(c.y + c.fall), 0); g.rotation.z = c.fall * 0.0015;
      g.children[0].material.emissiveIntensity = c.timer > 0 ? 0.5 + Math.sin(t * 30) * 0.3 : 0;
    }
    for (const { sp, g } of dyn.springs) { const sq = sp.t > 0 ? Math.max(0.5, 1 - sp.t * 1.4) : 1; g.scale.set(1 / Math.max(0.6, sq), sq, 1 / Math.max(0.6, sq)); }
    for (const o of dyn.totems) { o.flame.visible = o.c.lit; o.light.intensity = o.c.lit ? 2.4 + Math.sin(t * 9) * 0.5 : 0; if (o.c.lit) o.flame.scale.set(80 + Math.sin(t * 11) * 10, 110 + Math.sin(t * 8) * 14, 1); }

    if (U.portal) {
      const sealed = road.portalSealed ? road.portalSealed() : false, P = U.portal;
      P.rings.forEach((r, i) => { r.rotation.z = t * (sealed ? 0.15 : 0.6 + i * 0.4) * (i % 2 ? -1 : 1); r.rotation.y = Math.sin(t * 0.7 + i) * (sealed ? 0.05 : 0.35); r.material.color.set(sealed ? '#6b7385' : ['#3498db', '#7fdbff', '#f5e06e'][i]); });
      P.core.material.opacity = sealed ? 0.08 : 0.75 + Math.sin(t * 3) * 0.15; P.light.intensity = sealed ? 0 : 3;
    }

    // honey
    for (const h of road.honey) {
      let g = dyn.honey.get(h); if (!g) { g = honeyMesh(h); dyn.honey.set(h, g); }
      g.visible = !h.taken && !(h.heal && h.ttl < 2.5 && Math.floor(t * 8) % 2);
      if (g.visible) { g.position.set(h.x, wy(h.y + Math.sin(t * 3 + h.t) * 5), 0); g.rotation.y = t * 2 + h.t; if (g.userData.ring) g.userData.ring.rotation.x = t * 1.7; }
    }
    for (const [h, g] of dyn.honey) if (!road.honey.includes(h)) { world.remove(g); dyn.honey.delete(h); }

    // enemies / guardians / wardens
    for (const e of road.enemies) {
      let o = dyn.enemies.get(e); if (!o) { o = enemyMesh(e); dyn.enemies.set(e, o); }
      const gone = e.hpLeft <= 0 && e.dead <= 0; o.g.visible = !gone; o.sh.visible = !gone && !(e.dead > 0);
      if (gone) continue;
      const size = e.h * 1.18, bob = Math.sin(t * 6 + (e.bob || 0)) * 3;
      let sx = size, sy = size, alpha = 1; const m = o.body.material;
      m.color.setRGB(1, 1, 1);
      const special = e.chargeT > 0 || ['charge', 'swoop', 'hop', 'leap'].includes(e.state);
      let halo = special ? 0.35 : 0; o.halo.material.color.set('#ff6b35');
      if (e.state === 'tell') { halo = 0.6 + Math.sin(t * 30) * 0.25; o.halo.material.color.set('#ff3b1f'); m.color.setRGB(1, 0.75, 0.7); }
      if (e.stagger > 0) m.color.setRGB(0.75, 0.75, 0.8);
      if (e.frozen > 0) { m.color.setRGB(0.6, 0.85, 1); halo = 0.4; o.halo.material.color.set('#7fdbff'); }
      if (e.burn > 0) { halo = 0.5; o.halo.material.color.set('#ff6b35'); }
      if (e.transition > 0) { const k = 1 + Math.sin(t * 40) * 0.06 + e.transition * 0.12; sx *= k; sy *= k; halo = 0.9; o.halo.material.color.set('#ffffff'); }
      if (e.boss && e.phase > 0 && !(e.transition > 0)) { halo = Math.max(halo, 0.3 + e.phase * 0.15); o.halo.material.color.set(e.phase === 2 ? '#ff3b1f' : '#ffb347'); }
      if (e.asleep) { alpha = 0.75; m.color.setRGB(0.6, 0.6, 0.65); }
      if (e.dead > 0) { const d = Math.min(1, e.boss ? e.dead / 1.6 : e.warden ? e.dead / 1.4 : e.dead / 0.6); alpha = d; sx *= 1 + (1 - d) * 0.6; sy *= 1 - (1 - d) * 0.5; }
      if (e.hit > 0 && Math.floor(e.hit * 20) % 2 === 0) m.color.setRGB(3, 3, 3);
      if (e.restT > 0) alpha *= 0.85;
      m.opacity = alpha;
      o.body.scale.set(sx * (e.dir || 1), sy, 1);
      o.g.position.set(e.x, wy(e.y) + e.h / 2 + bob, 2);
      o.halo.material.opacity = halo; o.halo.scale.set(size * 1.9, size * 1.9, 1);
      const floor = e.fly ? GROUND_Y : e.y; o.sh.position.set(e.x, wy(floor) + 1.5, 4); o.sh.scale.set(e.w * (e.fly ? 0.8 : 1.3), 34, 1);
    }
    for (const [e, o] of dyn.enemies) if (!road.enemies.includes(e)) { world.remove(o.g); world.remove(o.sh); dyn.enemies.delete(e); }

    // projectiles (pooled glyph sprites)
    while (dyn.shots.length < road.projectiles.length) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); sp.renderOrder = 6; world.add(sp); const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#ffb347'), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); world.add(hl); dyn.shots.push({ sp, hl }); }
    dyn.shots.forEach((o, i) => {
      const qy = road.projectiles[i]; o.sp.visible = o.hl.visible = !!qy; if (!qy) return;
      const tex = glyphTexture(qy.glyph); if (o.sp.material.map !== tex) { o.sp.material.map = tex; o.sp.material.needsUpdate = true; }
      o.sp.position.set(qy.x, wy(qy.y), 6); o.sp.scale.set(34, 34, 1); o.hl.position.set(qy.x, wy(qy.y), 5); o.hl.scale.set(80, 80, 1);
    });

    // embers drift up and wrap around the camera
    const E = U.embers, arr = E.embers.geometry.attributes.position.array;
    E.seeds.forEach((sd, i) => {
      sd.y += sd.v * dt; if (sd.y > 760) sd.y = -80;
      const wrap = ((sd.x - cam.x * 0.6) % 2400 + 2400) % 2400 - 1200;
      arr[i * 3] = cam.x + wrap + Math.sin(t * 0.9 + sd.ph) * 14; arr[i * 3 + 1] = sd.y; arr[i * 3 + 2] = sd.z;
    });
    E.embers.geometry.attributes.position.needsUpdate = true;

    // the cub
    const P = U.player, sprite = road.sprite;
    P.pctx.clearRect(0, 0, 384, 384);
    try { sprite.draw(P.pctx, 192, 340, 2, 0); } catch (e) {}
    P.ptex.needsUpdate = true;
    const alive = p.dead <= 0;
    P.player.visible = alive; P.player.material.opacity = alive && p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0 ? 0.45 : 1;
    P.player.position.set(p.x, wy(p.y) + 74, 3);              // canvas ground line sits 74 world units below its centre
    P.aura.visible = alive; P.aura.position.set(p.x, wy(p.y) + 40, -6);
    U.lantern.position.set(p.x, wy(p.y) + 70, 120);
    const floor = surfaceBelow(p.x, p.y);
    P.shadow.visible = alive && floor !== null;
    if (floor !== null) { const hgt = Math.max(0, floor - p.y), k = Math.max(0.35, 1 - hgt / 320); P.shadow.position.set(p.x, wy(floor) + 1.5, 6); P.shadow.scale.set(74 * k, 30 * k, 1); }
    dyn.ghosts.forEach((gh, i) => { const tr = road.trail[i]; gh.visible = !!tr; if (tr) { gh.position.set(tr.x, wy(tr.y) + 74, 2); gh.material.opacity = Math.min(0.6, tr.t * 1.6); } });
  }

  // ---------- 2D overlay in game coordinates: telegraphs, rings, particles, text ----------
  function overlay(t) {
    const ctx = fctx, p = road.p;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, fx.width, fx.height);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, (W / 2 - cam.x * s) * dpr, (H / 2 + (cam.y - GROUND_Y) * s) * dpr);
    for (const e of road.enemies) if (e.guardian && self.Guardian) self.Guardian.drawTelegraph(ctx, e, road);
    for (const w of road.waves) { ctx.save(); ctx.globalAlpha = Math.min(1, w.t); ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 4; ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(w.x, GROUND_Y, 26, Math.PI, 0); ctx.stroke(); ctx.restore(); }
    if (p.dead <= 0) {
      if (p.primed > 0) { const pulse = 0.7 + Math.sin(t * 18) * 0.3; ctx.save(); ctx.globalAlpha = Math.min(1, p.primed) * 0.8; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3 + pulse * 2; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 24 * pulse; ctx.beginPath(); ctx.ellipse(p.x, p.y - 36, 48 + pulse * 6, 60 + pulse * 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (p.shieldFx > 0) { ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#d9c38a'; ctx.lineWidth = 4; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(p.x, p.y - 40, 52, 66, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (p.frenzy > 0) { ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; ctx.strokeStyle = '#a3ff8f'; ctx.lineWidth = 3; ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(p.x, p.y - 40, 46, 60, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (p.blocking) { const f = road.sprite.facing, px = p.x + f * 34, py = p.y - 40; ctx.save(); ctx.translate(px, py); ctx.scale(f, 1); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 18; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2 + 0.15, Math.PI / 2 - 0.15); ctx.stroke(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#f5e06e'; ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2 + 0.15, Math.PI / 2 - 0.15); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    for (const r of road.rings) { const life = r.big ? 1 - r.t / 0.7 : 1 - r.t / 0.35, rad = Math.max(1, r.big ? 40 + life * 230 : 10 + life * 40); ctx.save(); ctx.globalAlpha = Math.max(0, (1 - life) * 0.9); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = r.big ? 6 : 3; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, r.big ? rad * 0.8 : rad * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    // particles glow additively
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const q of road.particles) { ctx.globalAlpha = Math.max(0, Math.min(1, q.t)); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 1.3, 0, 7); ctx.fill(); }
    ctx.restore();
    // guardian extras: stagger stars, warden name + bar, boss crown + phase pips, roar ring
    for (const e of road.enemies) {
      if (e.hpLeft <= 0) continue;
      ctx.save(); ctx.textAlign = 'center';
      if (e.guardian && e.stagger > 0) { ctx.font = '22px serif'; ctx.fillText('✦', e.x + Math.sin(t * 9) * 18, e.y - e.h - 16); }
      if (!e.guardian && e.hp > 1) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40, 5); ctx.fillStyle = '#e74c3c'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40 * e.hpLeft / e.hp, 5); }
      if (e.warden) {
        if (e.asleep) { ctx.font = '20px serif'; ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.3; ctx.fillText('💤', e.x + 30, e.y - e.h - 10 - Math.sin(t * 2) * 6); }
        else { ctx.font = 'bold 10px Cinzel, serif'; ctx.fillStyle = '#ffd2cc'; ctx.fillText(e.name.toUpperCase(), e.x, e.y - e.h - 30); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(e.x - 60, e.y - e.h - 24, 120, 7); ctx.fillStyle = '#e74c3c'; ctx.fillRect(e.x - 60, e.y - e.h - 24, 120 * e.hpLeft / e.hp, 7); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(e.x - 60, e.y - e.h - 24, 120, 7); }
      }
      if (e.boss) {
        ctx.globalAlpha = 1; ctx.font = '22px serif'; ctx.fillText('👑', e.x, e.y - e.h - 18 + Math.sin(t * 3) * 3);
        const n = e.phases ? e.phases.length : 3; for (let i = 0; i < n; i++) { ctx.fillStyle = i <= e.phase ? '#ff6b5a' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(e.x - 14 + i * 14, e.y - e.h - 44, 4, 0, 7); ctx.fill(); }
        if (e.transition > 0) { ctx.strokeStyle = `rgba(255,120,90,${Math.min(1, e.transition)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - e.h / 2, (1.4 - e.transition) * 260 + 20, 0, 7); ctx.stroke(); }
      }
      ctx.restore();
    }
    // portal caption
    if (Number.isFinite(road.L.portal)) { const sealed = road.portalSealed ? road.portalSealed() : false; ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 11px Cinzel, serif'; if (sealed) { ctx.font = '30px serif'; ctx.fillText('🔒', road.L.portal, GROUND_Y - 70); ctx.font = 'bold 10px Cinzel, serif'; ctx.fillStyle = '#b8bcc8'; ctx.fillText('SEALED', road.L.portal, GROUND_Y + 22); } else { ctx.fillStyle = road.L.next ? '#7fdbff' : '#f5e06e'; ctx.fillText(road.L.next ? road.L.next.toUpperCase() : '✦ THE GOLDEN DROP ✦', road.L.portal, GROUND_Y + 22); } ctx.restore(); }
    // floating text
    ctx.font = 'bold 16px Cinzel, serif'; ctx.textAlign = 'center';
    for (const f of road.floats) { ctx.globalAlpha = Math.max(0, Math.min(1, f.t)); ctx.fillStyle = f.color; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    // Honey Burst flash
    if (p.burstFx > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p.burstFx * 0.35; ctx.fillStyle = '#ffe9a8'; ctx.fillRect(0, 0, fx.width, fx.height); ctx.globalAlpha = 1; }
  }

  let last = performance.now(), failed = false;
  const draw2d = road.draw.bind(road);
  function render() {
    if (failed) return draw2d();
    try {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
      if (!world || builtFor !== road.solids) build();
      sync(t, dt); renderer.render(scene, camera); overlay(t);
    } catch (err) {
      console.error('[road3d] falling back to 2D:', err); failed = true; detach(); opts.onFail?.(err);
    }
  }
  function detach() { road.draw = draw2d; gl.remove(); fx.remove(); simCanvas.style.opacity = '1'; removeEventListener('resize', resize); try { renderer.dispose(); } catch (e) {} }
  gl.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; detach(); opts.onFail?.(new Error('context lost')); });
  road.draw = render;
  return { detach, renderer, scene, camera };
}
