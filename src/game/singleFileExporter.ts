import { WEAPONS, THROWABLES, ARMORS, HELMETS, TWENTY_AUTHENTIC_ARSENAL } from './arsenal';
import { CAMPAIGN_STAGES, ENEMY_ARCHETYPES } from './stages';
import { VERIFIED_3D_ASSET_PRESETS } from './assetManager';
import { SIX_COMBAT_MOVES } from './combatSplinesAndShaders';

export function downloadStandaloneSamuraiHTML() {
  const weaponsJson = JSON.stringify(WEAPONS);
  const throwablesJson = JSON.stringify(THROWABLES);
  const armorsJson = JSON.stringify(ARMORS);
  const helmetsJson = JSON.stringify(HELMETS);
  const twentyArsenalJson = JSON.stringify(TWENTY_AUTHENTIC_ARSENAL);
  const stagesJson = JSON.stringify(CAMPAIGN_STAGES);
  const archetypesJson = JSON.stringify(ENEMY_ARCHETYPES);
  const presetsJson = JSON.stringify(VERIFIED_3D_ASSET_PRESETS);
  const sixMovesJson = JSON.stringify(SIX_COMBAT_MOVES);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>KAMI NO WASHI: BLADE OF THE INK (紙之刃 · KAMI-NO-YAIBA) — AAA Single-File ES-Module 3D Samurai ARPG</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  body { background: #181411; color: #f3ebd9; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
  canvas { display: block; width: 100vw; height: 100vh; }
  .vignette { position: fixed; inset: 0; pointer-events: none; z-index: 5; background: radial-gradient(circle at 50% 50%, rgba(24,20,17,0) 58%, rgba(12,9,7,0.72) 100%); }
  .hud { position: fixed; inset: 0; pointer-events: none; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; z-index: 10; }
  .interactive { pointer-events: auto; }
  .card { background: rgba(20, 16, 13, 0.92); border: 1px solid rgba(214, 199, 178, 0.28); padding: 12px 16px; border-radius: 6px; box-shadow: 0 10px 28px rgba(0,0,0,0.78); }
  .bar-bg { width: 230px; height: 10px; background: #0e0b09; border: 1px solid rgba(255,255,255,0.2); margin-top: 4px; position: relative; overflow: hidden; }
  .bar-fill { height: 100%; transition: width 0.08s linear; }
  .btn { background: #991b1b; color: #f3ebd9; border: 1px solid #fbbf24; padding: 7px 13px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background 0.15s; }
  .btn:hover { background: #b91c1c; }
  .btn-sec { background: #241d18; color: #f3ebd9; border: 1px solid #57493d; padding: 7px 13px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; }
  .btn-sec:hover { border-color: #fbbf24; }
  #modal, #asset-modal { position: fixed; inset: 0; background: rgba(10, 8, 6, 0.88); z-index: 30; display: none; align-items: center; justify-content: center; padding: 24px; }
  #modal.open, #asset-modal.open { display: flex; }
  .modal-box { background: #1c1612; border: 1px solid #fbbf24; border-radius: 8px; max-width: 1060px; width: 100%; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; }
  .modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; padding: 16px; overflow-y: auto; }
  .item-card { background: #14100d; border: 1px solid #3d322a; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
  .item-card.active { border-color: #fbbf24; background: #261e17; }
  .portrait-img { width: 100%; height: 110px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(251, 191, 36, 0.35); background: #0d0a08; }
  #float-layer { position: fixed; inset: 0; pointer-events: none; z-index: 20; overflow: hidden; }
  .float-txt { position: absolute; font-weight: 800; text-shadow: -1.5px -1.5px 0 #090807, 1.5px -1.5px 0 #090807, -1.5px 1.5px 0 #090807, 1.5px 1.5px 0 #090807; transform: translate(-50%, -50%); white-space: nowrap; }
  .drop-zone { border: 2px dashed rgba(251, 191, 36, 0.5); padding: 16px; border-radius: 6px; text-align: center; background: rgba(15, 11, 9, 0.7); cursor: pointer; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js",
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
  }
}
</script>
</head>
<body>
<div id="mount"></div>
<div class="vignette"></div>
<div id="float-layer"></div>
<div class="hud">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
    <div class="card">
      <div style="font-size:11px; letter-spacing:0.16em; color:#fbbf24; font-weight:700;">KAMI NO WASHI · 紙之刃</div>
      <div style="margin-top:6px; font-size:11px; display:flex; justify-content:space-between;"><span>VITALITY · 体力</span><span id="hp-txt" style="font-family:monospace;">231/231</span></div>
      <div class="bar-bg"><div id="hp-bar" class="bar-fill" style="width:100%; background:#dc2626;"></div></div>
      <div style="margin-top:6px; font-size:11px; display:flex; justify-content:space-between; color:#fbbf24;"><span>POSTURE · 体幹</span><span id="pos-txt" style="font-family:monospace;">0/174</span></div>
      <div class="bar-bg"><div id="posture-bar" class="bar-fill" style="width:0%; background:#f59e0b;"></div></div>
      <div style="margin-top:6px; font-size:11px; display:flex; justify-content:space-between; color:#38bdf8;"><span>KI SPIRIT · 気力</span><span id="ki-txt" style="font-family:monospace;">120/120</span></div>
      <div class="bar-bg"><div id="ki-bar" class="bar-fill" style="width:100%; background:#38bdf8;"></div></div>
      <div id="move-txt" style="margin-top:6px; font-size:10px; color:#fbbf24; font-family:monospace;">Move 1/6: Kesa-Giri · 8-Ray Hitbox</div>
    </div>

    <div class="card" style="text-align:center; min-width:340px;">
      <div id="stage-label" style="font-weight:700; color:#fbbf24; font-size:13px;">Stage 1/10: Bamboo Forest of Whispers · 囁きの竹林</div>
      <div id="boss-label" style="font-size:11px; color:#d6c7b2; margin-top:4px; font-family:monospace;">Score 0 · Koku 250石 · Combo 0x · Foes 5</div>
      <div id="boss-bar-wrap" style="display:none; margin-top:6px;">
        <div id="boss-name" style="font-size:12px; font-weight:700; color:#fca5a5;"></div>
        <div class="bar-bg" style="width:100%;"><div id="boss-hp-bar" class="bar-fill" style="width:100%; background:#dc2626;"></div></div>
      </div>
    </div>

    <div class="card" style="text-align:right; min-width:275px;">
      <div style="font-weight:700; color:#fbbf24; font-size:11px; letter-spacing:0.08em;">AI ADAPTATION MATRIX T_player</div>
      <div id="ai-stance" style="font-size:12px; color:#f3ebd9; margin-top:3px; font-weight:600;">Balanced Chudan-no-Kamae</div>
      <div id="ai-callout" style="font-size:11px; color:#fbbf24; margin-top:2px; font-weight:700;">TRACKING BACK STEP</div>
      <div id="ai-metrics" style="font-size:11px; color:#c7b79e; margin-top:4px; font-family:monospace;">[R_m:0% R_r:0% D:BACK P:50% J:0%]</div>
    </div>
  </div>

  <div class="card interactive" style="align-self:center; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
    <span id="equip-label" style="font-size:12px; font-weight:600; color:#fbbf24;">Blade: Uchigatana | Do: Ronin Haori | Kabuto: Suji-Kabuto | Tool: Shuriken (12)</span>
    <button class="btn-sec" id="cycle-wep-btn">Swap Slot [Q/E/1-3]</button>
    <button class="btn-sec" id="cam-mode-btn">[V] Camera: 3rd-Person RPG</button>
    <button class="btn-sec" id="dojo-mode-btn">Dojo Training Mode · 稽古道場</button>
    <button class="btn-sec" id="open-asset-btn">3D Asset Loader & Dropper [L]</button>
    <button class="btn" id="open-forge-btn">Arsenal & Armor Forge [Tab/I]</button>
    <span style="font-size:11px; color:#d6c7b2;">[V] 3-Mode Camera · 6-Moves: Tap LMB (1-3) · Hold LMB (4: Iaijutsu) · W+Shift+LMB (5: Tsuki) · Space+LMB (6: Kabuto-Wari) · RMB Parry</span>
  </div>
</div>

<div id="modal" class="interactive">
  <div class="modal-box">
    <div style="padding:14px 18px; border-bottom:1px solid #3d322a; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:700; font-size:16px; color:#fbbf24;">KAMI NO WASHI — ARSENAL, DO ARMOR, KABUTO & UKIYO-E SCROLL FORGE</div>
        <div style="font-size:12px; color:#d6c7b2;">Differential Cosh Sori Blades + Spherical-Harmonic SkinnedMesh Armor + Ukiyo-e Woodblock Scrolls</div>
      </div>
      <button class="btn" id="close-forge-btn">Close [Tab / Esc]</button>
    </div>
    <div id="forge-grid" class="modal-grid"></div>
  </div>
</div>

<div id="asset-modal" class="interactive">
  <div class="modal-box" style="max-width:780px; padding:18px; gap:14px;">
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3d322a; padding-bottom:10px;">
      <div>
        <div style="font-weight:700; font-size:16px; color:#38bdf8;">LIVE 3D ASSET INSPECTOR & GLTF/GLB/HDRI DROPPER</div>
        <div style="font-size:12px; color:#d6c7b2;">GLTFLoader + DRACOLoader + RGBELoader · Hot-swap Samurai, Bosses, Weapons, or HDRI</div>
      </div>
      <button class="btn" id="close-asset-btn">Close [L / Esc]</button>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      <select id="asset-slot-sel" class="btn-sec" style="padding:8px;">
        <option value="samurai">Target Slot: Samurai Hero</option>
        <option value="weapon">Target Slot: Equipped Weapon</option>
        <option value="boss">Target Slot: Active Enemy / Boss</option>
        <option value="hdri">Target Slot: Environment HDRI (.hdr)</option>
      </select>
      <input id="asset-url-input" type="text" placeholder="Paste CORS-safe .glb / .gltf / .hdr URL..." style="flex:1; background:#120e0b; color:#f3ebd9; border:1px solid #57493d; padding:8px 12px; border-radius:4px;" />
      <button class="btn" id="load-url-btn">Load URL</button>
    </div>
    <label class="drop-zone" id="drop-zone">
      <input type="file" id="asset-file-input" accept=".glb,.gltf,.hdr" style="display:none;" />
      <div style="font-weight:700; color:#fbbf24;">Drag & Drop any local .glb, .gltf, or .hdr file here (or click to browse)</div>
      <div id="asset-telemetry" style="font-size:11px; color:#38bdf8; margin-top:6px; font-family:monospace;">Ready · Differential Cosh Sori & Spherical-Harmonic SkinnedMesh Active</div>
    </label>
    <div id="preset-grid" class="modal-grid" style="padding:4px; max-height:280px;"></div>
  </div>
</div>

<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
  import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
  import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
  import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
  import * as CANNON from 'cannon-es';

  const WEAPONS = ${weaponsJson};
  const THROWABLES = ${throwablesJson};
  const ARMORS = ${armorsJson};
  const HELMETS = ${helmetsJson};
  const TWENTY_ARSENAL = ${twentyArsenalJson};
  const STAGES = ${stagesJson};
  const ARCHETYPES = ${archetypesJson};
  const ASSET_PRESETS = ${presetsJson};
  const SIX_MOVES = ${sixMovesJson};

  // 1. Procedural Web Audio API Synthesizer
  class AudioSynth {
    constructor() { this.ctx = null; }
    ensure() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    slash(heavy) {
      const ctx = this.ensure(); if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(heavy ? 180 : 310, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + (heavy ? 0.24 : 0.14));
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.25 : 0.15));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.26);
    }
    parry() {
      const ctx = this.ensure(); if (!ctx) return;
      const now = ctx.currentTime;
      [920, 1480, 2120].forEach(f => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(now); o.stop(now + 0.36);
      });
    }
    boom() {
      const ctx = this.ensure(); if (!ctx) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(120, now);
      o.frequency.exponentialRampToValueAtTime(28, now + 0.32);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      o.connect(g).connect(ctx.destination);
      o.start(now); o.stop(now + 0.35);
    }
  }
  const audio = new AudioSynth();

  // 2. Smart AssetManager (GLTFLoader + DRACOLoader + RGBELoader)
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  const rgbeLoader = new RGBELoader();

  // 3. Cannon-es 60Hz Rigid-Body & Ragdoll World + 3D Verlet Cloth + Planar Mesh Slicing
  const physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -19.6, 0) });
  const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  physicsWorld.addBody(groundBody);
  const rigidBodies = [];

  function buildTextures() {
    const wc = document.createElement('canvas'); wc.width = 512; wc.height = 512;
    const wctx = wc.getContext('2d');
    wctx.fillStyle = '#ece1cc'; wctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, l = 10 + Math.random() * 36, a = Math.random() * Math.PI * 2;
      wctx.strokeStyle = i % 3 === 0 ? 'rgba(255,250,240,0.34)' : 'rgba(135,110,82,0.18)';
      wctx.lineWidth = 0.6 + Math.random() * 1.4;
      wctx.beginPath(); wctx.moveTo(x, y); wctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); wctx.stroke();
    }
    const washiBump = new THREE.CanvasTexture(wc);
    washiBump.wrapS = washiBump.wrapT = THREE.RepeatWrapping;
    washiBump.repeat.set(6, 6);

    const tc = document.createElement('canvas'); tc.width = 512; tc.height = 512;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = '#cbd5e1'; tctx.fillRect(0, 0, 512, 512);
    tctx.strokeStyle = 'rgba(255,255,255,0.85)'; tctx.lineWidth = 3;
    tctx.beginPath();
    for (let y = 0; y <= 512; y += 6) {
      const x = 350 + Math.sin(y * 0.08) * 18 + Math.cos(y * 0.22) * 8;
      if (y === 0) tctx.moveTo(x, y); else tctx.lineTo(x, y);
    }
    tctx.stroke();
    const tamahaganeTex = new THREE.CanvasTexture(tc);

    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
    const sctx = sc.getContext('2d');
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, d = Math.random() * 72, r = 6 + Math.random() * 24 * (1 - d / 90);
      sctx.fillStyle = i % 3 === 0 ? 'rgba(153,27,27,0.88)' : 'rgba(18,14,12,0.92)';
      sctx.beginPath(); sctx.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r, 0, Math.PI * 2); sctx.fill();
    }
    const splatterTex = new THREE.CanvasTexture(sc);
    splatterTex.colorSpace = THREE.SRGBColorSpace;
    return { washiBump, tamahaganeTex, splatterTex };
  }
  const textures = buildTextures();

  function createSplineLathe(profile, radialSegments = 48, curveSamples = 24) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
    const spline = new THREE.SplineCurve(pts);
    return new THREE.LatheGeometry(spline.getPoints(curveSamples), radialSegments);
  }

  // Differential Curvature Katana: P(u, v) = (x(u,v), y(u) + alpha*cosh(beta*u), z(u,v))
  function createExtrudedBlade(len, baseWidth, tipWidth, sori, thickness = 0.016) {
    const shape = new THREE.Shape();
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const y = u * len + sori * 0.1 * Math.cosh(1.4 * u);
      const arch = sori * (Math.cosh(1.35 * u) - 1.0);
      if (i === 0) shape.moveTo(arch, y); else shape.lineTo(arch, y);
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      const y = u * len + sori * 0.1 * Math.cosh(1.4 * u);
      const w = baseWidth * (1 - u * 0.35) + tipWidth * (u * 0.35);
      const arch = sori * (Math.cosh(1.35 * u) - 1.0);
      shape.lineTo(arch + w * (i === steps ? 0.15 : 1), y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: thickness * 0.35, bevelThickness: thickness * 0.42
    });
    geo.rotateY(Math.PI * 0.5);
    return geo;
  }

  function createSumiMaterial(colorHex, roughness = 0.45, metalness = 0.4, isSteel = false) {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: isSteel ? 0.14 : roughness,
      metalness: isSteel ? 0.96 : metalness,
      map: isSteel ? textures.tamahaganeTex : null,
      bumpMap: textures.washiBump,
      bumpScale: 0.024
    });
    return mat;
  }

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x110d0a, side: THREE.BackSide });
  function addPart(parent, geo, mat, pos = [0,0,0], rot = [0,0,0], scale = 1.055) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    const out = new THREE.Mesh(geo, outlineMat);
    out.scale.setScalar(scale);
    m.add(out);
    parent.add(m);
    return m;
  }

  function buildWeaponMesh(weapon) {
    const g = new THREE.Group();
    const bladeMat = createSumiMaterial(weapon.bladeColor, 0.14, 0.96, true);
    const hiltMat = createSumiMaterial(weapon.hiltColor, 0.72, 0.15);
    const brassMat = createSumiMaterial(0xfbbf24, 0.22, 0.9);

    if (['uchigatana','tachi','odachi','wakizashi','tanto'].includes(weapon.id)) {
      const len = weapon.id === 'odachi' ? 2.4 : weapon.id === 'tachi' ? 1.78 : weapon.id === 'uchigatana' ? 1.52 : weapon.id === 'wakizashi' ? 1.04 : 0.68;
      const hLen = weapon.id === 'odachi' ? 0.58 : weapon.id === 'tanto' ? 0.24 : 0.38;
      addPart(g, createSplineLathe([[0.01,0],[0.038,0.02],[0.034,hLen*0.5],[0.038,hLen],[0.01,hLen]], 40, 16), hiltMat);
      addPart(g, createSplineLathe([[0.01,0],[0.11,0.005],[0.11,0.022],[0.01,0.026]], 48, 12), brassMat, [0, hLen, 0]);
      addPart(g, createExtrudedBlade(len, 0.068, 0.036, weapon.id === 'odachi' ? 0.14 : 0.08), bladeMat, [0, hLen, -0.02]);
    } else if (weapon.id === 'naginata' || weapon.id === 'yari') {
      addPart(g, createSplineLathe([[0.01,0],[0.04,0.1],[0.038,2.1],[0.01,2.15]], 40, 18), hiltMat);
      addPart(g, createExtrudedBlade(0.88, 0.09, 0.03, weapon.id === 'naginata' ? 0.09 : 0.0), bladeMat, [0, 2.1, -0.02]);
    } else {
      addPart(g, createSplineLathe([[0.01,0],[0.045,0.1],[0.09,1.2],[0.06,1.65],[0.01,1.7]], 48, 22), bladeMat);
    }
    return g;
  }

  const portraitCache = new Map();
  function getUkiyoeScrollPortrait(id, title, kanji, grade, colorHex) {
    if (portraitCache.has(id)) return portraitCache.get(id);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, '#f2e7d3'); grad.addColorStop(1, '#d5c1a1');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = 'rgba(153, 27, 27, 0.84)';
    ctx.beginPath(); ctx.arc(128, 76, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20, 16, 13, 0.16)';
    ctx.font = 'bold 54px serif'; ctx.textAlign = 'center';
    ctx.fillText(kanji || '刃', 202, 92);
    ctx.strokeStyle = '#' + (colorHex || 0xe2e8f0).toString(16).padStart(6, '0');
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(48, 118); ctx.quadraticCurveTo(128, 52, 208, 32); ctx.stroke();
    ctx.fillStyle = 'rgba(15, 11, 9, 0.88)';
    ctx.fillRect(0, 124, 256, 36);
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText((grade || 'O-Wazamono') + ' · ' + title, 10, 146);
    const url = c.toDataURL('image/png');
    portraitCache.set(id, url);
    return url;
  }

  // Scene, Camera & 100% Crystal-Clear Native Resolution Renderer (ZERO Screen-Space UV Distortion or Kuwahara Blur!)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.15, 220);
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('mount').appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xe6dec8, 0x383b2e, 0.9);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xfff3d6, 2.2);
  dirLight.position.set(22, 36, 24);
  scene.add(dirLight);

  const envGroup = new THREE.Group();
  scene.add(envGroup);

  const playerRoot = new THREE.Group();
  const armorGroup = new THREE.Group();
  const helmGroup = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftArm = new THREE.Group();
  rightArm.position.set(0.28, 1.32, 0.14);
  leftArm.position.set(-0.22, 1.24, 0.22);
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.08, 1.04, 0.34);
  weaponMount.rotation.set(0.95, 0.08, 0.16);
  playerRoot.add(armorGroup, helmGroup, rightArm, leftArm, weaponMount);
  scene.add(playerRoot);

  // Dedicated First-Person Viewmodel Rig (fpvRig) attached directly to camera at (0.28, -0.32, -0.65)
  const fpvRig = new THREE.Group();
  fpvRig.position.set(0.28, -0.32, -0.65);
  fpvRig.visible = false;
  const fpvWeaponMount = new THREE.Group();
  fpvRig.add(fpvWeaponMount);
  camera.add(fpvRig);

  let camModeIdx = 0;
  const CAM_MODES = ['3rd-Person RPG (Over-Shoulder)', '1st-Person Samurai FPV (2-Hand Grip)', 'Isometric Tactical (45°)'];

  // 3D Verlet Cloth Sheet for Samurai Haori Cloak
  const clothCols = 8, clothRows = 10;
  const clothGeo = new THREE.PlaneGeometry(0.68, 0.85, clothCols, clothRows);
  const clothCurr = new Float32Array((clothCols+1)*(clothRows+1)*3);
  const clothPrev = new Float32Array((clothCols+1)*(clothRows+1)*3);
  for (let i = 0; i < clothGeo.attributes.position.count; i++) {
    clothCurr[i*3] = clothPrev[i*3] = clothGeo.attributes.position.getX(i);
    clothCurr[i*3+1] = clothPrev[i*3+1] = clothGeo.attributes.position.getY(i);
    clothCurr[i*3+2] = clothPrev[i*3+2] = clothGeo.attributes.position.getZ(i);
  }
  const clothMesh = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide }));
  clothMesh.position.set(0, 1.38, -0.24);
  playerRoot.add(clothMesh);

  let stageIdx = 0, isDojoMode = false;
  let primaryWep = WEAPONS[0], secondaryWep = WEAPONS[6], rangedWep = WEAPONS[11];
  let activeSlot = 'primary';
  let curArmor = ARMORS[0], curHelm = HELMETS[0], curTool = THROWABLES[0];
  let toolStock = curTool.maxStock, toolCd = 0;
  let hp = 231, maxHp = 231, posture = 0, maxPosture = 174, ki = 120, maxKi = 120;
  let score = 0, koku = 250, combo = 0, comboStep = 0, hitstop = 0, camTrauma = 0, zanshinZoom = 0;
  let playerPos = new THREE.Vector3(0, 0, 12), playerVelY = 0, isGrounded = true, playerYaw = Math.PI;
  let atkCd = 0, atkAnim = 0, parryWin = 0, parryCd = 0;

  const AI_Brain = {
    meleeSwings: [], meleeDmg: 10, rangedDmg: 0, jumps: 0,
    dodges: { left: 1, right: 1, back: 2, forward: 1 },
    parryHits: 1, parryTries: 2,
    getSnapshot(now) {
      this.meleeSwings = this.meleeSwings.filter(t => now - t < 6000);
      const spam = Math.min(1, this.meleeSwings.length / 11);
      const ranged = Math.min(1, this.rangedDmg / Math.max(1, this.meleeDmg + this.rangedDmg));
      let prefDodge = 'back', maxD = -1;
      for (const k of ['left','right','back','forward']) {
        if (this.dodges[k] > maxD) { maxD = this.dodges[k]; prefDodge = k; }
      }
      let stance = 'Balanced Chudan-no-Kamae', callout = 'TRACKING ' + prefDodge.toUpperCase() + ' STEP';
      if (spam >= 0.45) { stance = 'Counter-Parry & Hyper-Armor'; callout = '危 HYPER-ARMOR RIPOSTE'; }
      else if (ranged >= 0.4) { stance = 'Zig-Zag Wind-Dash & Deflect'; callout = '疾風 ZIG-ZAG WIND-DASH'; }
      return { spam, ranged, prefDodge, stance, callout, autoParry: Math.min(0.8, 0.12 + spam * 0.55), zigZag: Math.min(0.85, 0.15 + ranged * 0.65) };
    }
  };

  function getActiveWeapon() {
    return activeSlot === 'primary' ? primaryWep : activeSlot === 'secondary' ? secondaryWep : rangedWep;
  }

  function rebuildPlayerRig() {
    while (armorGroup.children.length) armorGroup.remove(armorGroup.children[0]);
    while (helmGroup.children.length) helmGroup.remove(helmGroup.children[0]);
    while (weaponMount.children.length) weaponMount.remove(weaponMount.children[0]);
    while (fpvWeaponMount.children.length) fpvWeaponMount.remove(fpvWeaponMount.children[0]);

    const pMat = createSumiMaterial(curArmor.primaryColor, 0.35, 0.45);
    const skinMat = createSumiMaterial(0xe6ccb2, 0.6, 0.05);
    const legGeo = createSplineLathe([[0.01,0],[0.14,0.05],[0.18,0.45],[0.21,0.72],[0.01,0.75]], 40, 16);
    addPart(armorGroup, legGeo, pMat, [-0.21, 0, 0]);
    addPart(armorGroup, legGeo, pMat, [0.21, 0, 0]);
    addPart(armorGroup, createSplineLathe([[0.01,0.72],[0.31,0.78],[0.29,1.12],[0.36,1.48],[0.01,1.52]], 48, 22), pMat);
    addPart(armorGroup, createSplineLathe([[0.01,1.52],[0.21,1.62],[0.22,1.78],[0.01,1.88]], 40, 16), skinMat);

    const hMat = createSumiMaterial(curHelm.primaryColor, 0.28, 0.72);
    const cMat = createSumiMaterial(curHelm.crestColor, 0.18, 0.92);
    addPart(helmGroup, createSplineLathe([[0.48,1.76],[0.42,1.92],[0.28,2.08],[0.01,2.14]], 48, 18), hMat);
    addPart(helmGroup, createExtrudedBlade(0.38, 0.08, 0.02, 0.12), cMat, [0, 1.98, 0.22]);

    weaponMount.add(buildWeaponMesh(getActiveWeapon()));
    const fpvWep = buildWeaponMesh(getActiveWeapon());
    fpvWep.rotation.set(-0.28, 0.15, -0.1);
    fpvWeaponMount.add(fpvWep);
    document.getElementById('equip-label').textContent =
      'Blade: ' + getActiveWeapon().name + ' | Do: ' + curArmor.name + ' | Kabuto: ' + curHelm.name + ' | Tool: ' + curTool.name + ' (' + toolStock + ')';
  }

  const enemies = [];
  const projectiles = [];
  const trails = [];
  let bossSpawned = false;

  function spawnEnemy(def, isBoss, x, z, isDummy = false) {
    const g = new THREE.Group();
    const pMat = createSumiMaterial(def.primaryColor, 0.42, 0.4);
    const aMat = createSumiMaterial(def.accentColor, 0.3, 0.7);
    const s = def.scale || 1;
    g.scale.setScalar(s);
    addPart(g, createSplineLathe([[0.01,0],[0.34,0.1],[0.31,0.85],[0.36,1.45],[0.01,1.5]], 40, 20), pMat);
    addPart(g, createSplineLathe([[0.46,1.48],[0.38,1.68],[0.01,1.82]], 40, 16), aMat);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.2, 32), new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
    g.add(ring);
    const wepDef = WEAPONS.find(w => w.id === (isBoss ? def.weaponTypes[0] : def.weaponType)) || WEAPONS[0];
    const wm = buildWeaponMesh(wepDef);
    wm.position.set(0.42, 1.0, 0.2); wm.rotation.x = Math.PI * 0.38;
    g.add(wm);
    g.position.set(x, 0, z);
    scene.add(g);
    enemies.push({ mesh: g, ring, pos: new THREE.Vector3(x, 0, z), hp: isDummy ? 1000 : def.hp, maxHp: isDummy ? 1000 : def.hp, posture: 0, maxPosture: def.posture || 160, dmg: def.damage, range: def.attackRange, speed: def.speed, isBoss, isDummy, name: isDummy ? 'Karakuri Dojo Dummy (稽古木人)' : def.name, state: 'approach', timer: 0.5 });
  }

  function loadStage(idx, dojo = false) {
    isDojoMode = dojo;
    stageIdx = idx % STAGES.length;
    const st = STAGES[stageIdx];
    scene.background = new THREE.Color(st.skyColor);
    scene.fog = new THREE.FogExp2(st.fogColor, st.fogDensity);
    while (envGroup.children.length) envGroup.remove(envGroup.children[0]);
    enemies.forEach(e => scene.remove(e.mesh)); enemies.length = 0;
    bossSpawned = dojo;

    const groundGeo = new THREE.PlaneGeometry(180, 180, 96, 96);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i), vy = posAttr.getY(i);
      const d = Math.max(0, Math.hypot(vx, vy) - 24.5);
      if (d > 0) posAttr.setZ(i, Math.min(8, d * 0.18 * (1.2 + Math.sin(vx * 0.09) * Math.cos(vy * 0.09) * 1.8)));
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: st.groundColor, roughness: 0.88, bumpMap: textures.washiBump, bumpScale: 0.04 }));
    ground.rotation.x = -Math.PI / 2;
    envGroup.add(ground);

    const stalkGeo = createSplineLathe([[0.01,0],[0.24,0.2],[0.2,4.5],[0.18,9.0],[0.01,9.1]], 32, 18);
    const stalkMat = createSumiMaterial(0x2d4c2b, 0.65, 0.15);
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      let x = Math.cos(a) * 26, z = Math.sin(a) * 26 - 3;
      if (z > 10 && Math.abs(x) < 15) x += x <= 0 ? -14 : 14;
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.set(x, 0, z);
      envGroup.add(stalk);
    }

    if (dojo) {
      spawnEnemy(ARCHETYPES.armored_samurai, false, 0, 8.2, true);
      playerPos.set(0, 0, 12.6);
      document.getElementById('stage-label').textContent = 'Dojo Training Mode · 稽古道場 (Stationary Parry & Combo Dummy)';
    } else {
      let n = 0;
      st.enemyWaves.forEach(w => {
        const arch = ARCHETYPES[w.archetype];
        for (let c = 0; c < w.count; c++) {
          const ang = (n * 1.1) - 1.2;
          spawnEnemy(arch, false, Math.sin(ang) * 13, -Math.cos(ang) * 13, false);
          n++;
        }
      });
      document.getElementById('stage-label').textContent = 'Stage ' + (stageIdx + 1) + '/' + STAGES.length + ': ' + st.name + ' · ' + st.kanji;
    }
  }

  function pushFloat(txt, pos, color) {
    const v = pos.clone().add(new THREE.Vector3(0, 2.2, 0)).project(camera);
    if (v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'float-txt';
    el.style.left = ((v.x * 0.5 + 0.5) * 100) + '%';
    el.style.top = ((-v.y * 0.5 + 0.5) * 100) + '%';
    el.style.color = color;
    el.textContent = txt;
    document.getElementById('float-layer').appendChild(el);
    setTimeout(() => el.remove(), 750);
  }

  // Hot-swap 3D GLB/GLTF/HDRI Asset Loader
  function applyLoadedGLTF(gltf, slot, label) {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const sz = box.getSize(new THREE.Vector3());
    const s = (slot === 'weapon' ? 1.3 : 1.85) / Math.max(0.01, sz.y);
    model.scale.setScalar(s);
    if (slot === 'weapon') {
      while (weaponMount.children.length) weaponMount.remove(weaponMount.children[0]);
      weaponMount.add(model);
    } else if (slot === 'boss' && enemies[0]) {
      while (enemies[0].mesh.children.length) enemies[0].mesh.remove(enemies[0].mesh.children[0]);
      enemies[0].mesh.add(model);
    } else {
      while (armorGroup.children.length) armorGroup.remove(armorGroup.children[0]);
      armorGroup.add(model);
    }
    document.getElementById('asset-telemetry').textContent = 'Loaded ' + label + ' (' + slot.toUpperCase() + ')';
  }

  function renderAssetPresets() {
    const grid = document.getElementById('preset-grid');
    grid.innerHTML = '';
    ASSET_PRESETS.forEach(p => {
      const d = document.createElement('div');
      d.className = 'item-card';
      d.innerHTML = '<div style="font-weight:700;font-size:12px;color:#38bdf8;">' + p.name + ' (' + p.kanji + ')</div>' +
        '<div style="font-size:10px;color:#c7b79e;">' + p.sourceRepo + '</div>';
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = 'Load ' + p.format.toUpperCase() + ' (' + p.slot + ')';
      b.onclick = () => {
        if (p.url.startsWith('procedural://')) { rebuildPlayerRig(); return; }
        if (p.format === 'hdr') {
          rgbeLoader.load(p.url, tex => { tex.mapping = THREE.EquirectangularReflectionMapping; scene.environment = tex; });
        } else {
          gltfLoader.load(p.url, gltf => applyLoadedGLTF(gltf, p.slot, p.name));
        }
      };
      d.appendChild(b); grid.appendChild(d);
    });
  }

  function renderForge() {
    const grid = document.getElementById('forge-grid');
    grid.innerHTML = '';
    TWENTY_ARSENAL.forEach(item => {
      const d = document.createElement('div');
      const eq = [primaryWep.id, secondaryWep.id, rangedWep.id, curTool.id].includes(item.id);
      d.className = 'item-card' + (eq ? ' active' : '');
      const imgUrl = getUkiyoeScrollPortrait(item.id, item.name, item.kanji, item.wazamonoGrade, item.weaponRef ? item.weaponRef.bladeColor : 0xfbbf24);
      d.innerHTML = '<img class="portrait-img" src="' + imgUrl + '" alt="' + item.name + '" />' +
        '<div style="font-weight:700;font-size:13px;color:#f3ebd9;">' + item.name + ' (' + item.kanji + ')</div>' +
        '<div style="font-size:10px;color:#fbbf24;font-family:monospace;">' + item.wazamonoGrade + ' · ' + item.metricSpecs + '</div>';
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = eq ? 'Equipped' : 'Equip ' + item.name;
      b.onclick = () => {
        if (item.weaponRef) {
          const w = item.weaponRef;
          if (w.category === 'bladed') { primaryWep = w; activeSlot = 'primary'; }
          else if (w.category === 'polearm_heavy') { secondaryWep = w; activeSlot = 'secondary'; }
          else { rangedWep = w; activeSlot = 'ranged'; }
        } else if (item.throwableRef) {
          curTool = item.throwableRef; toolStock = curTool.maxStock;
        }
        rebuildPlayerRig(); renderForge();
      };
      d.appendChild(b); grid.appendChild(d);
    });
  }

  const keys = new Set();
  const mouseNDC = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const mouseWorld = new THREE.Vector3();

  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyQ' || e.code === 'KeyE') {
      const slots = ['primary','secondary','ranged'];
      activeSlot = slots[(slots.indexOf(activeSlot) + (e.code === 'KeyE' ? 1 : 2)) % 3];
      rebuildPlayerRig(); audio.slash(false);
    }
    if (e.code === 'Tab' || e.code === 'KeyI') {
      e.preventDefault();
      document.getElementById('modal').classList.toggle('open');
      renderForge();
    }
    if (e.code === 'KeyL') {
      document.getElementById('asset-modal').classList.toggle('open');
      renderAssetPresets();
    }
    if (e.code === 'KeyV') {
      camModeIdx = (camModeIdx + 1) % 3;
      document.getElementById('cam-mode-btn').textContent = '[V] Camera: ' + CAM_MODES[camModeIdx];
    }
    if (e.code === 'Escape') {
      document.getElementById('modal').classList.remove('open');
      document.getElementById('asset-modal').classList.remove('open');
    }
    if (e.code === 'Space' && isGrounded) { isGrounded = false; playerVelY = 11.2; AI_Brain.jumps++; }
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('mousemove', e => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(groundPlane, mouseWorld);
  });

  let downAt = 0;
  window.addEventListener('mousedown', e => {
    if (e.target.closest('.interactive')) return;
    if (e.button === 0) downAt = performance.now();
    if (e.button === 2) {
      e.preventDefault();
      if (parryCd <= 0) {
        parryWin = 0.3; parryCd = 0.45; audio.slash(false);
        enemies.forEach(en => {
          if (en.pos.distanceTo(playerPos) <= en.range + 2.2 && en.state === 'windup') {
            en.state = 'stagger'; en.timer = 1.6;
            AI_Brain.parryHits++; AI_Brain.parryTries++;
            audio.parry(); hitstop = 0.06; camTrauma = 0.45;
            pushFloat('弾き PERFECT DEFLECT!', en.pos, '#fbbf24');
          }
        });
      }
    }
  });
  window.addEventListener('mouseup', e => {
    if (e.button !== 0 || !downAt) return;
    const heavy = (performance.now() - downAt) > 340;
    downAt = 0;
    if (atkCd > 0) return;
    const wep = getActiveWeapon();
    comboStep = (comboStep + 1) % 3;
    const isPlunge = !isGrounded && playerPos.y > 0.6;
    const isThrust = keys.has('KeyW') && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    const moveKey = isPlunge ? 'kabuto_wari' : isThrust ? 'tsuki_lunge' : heavy ? 'iaijutsu_charged' : comboStep === 1 ? 'kesa_giri' : comboStep === 2 ? 'gyaku_kesa' : 'tsumuji_kaze';
    const moveDef = SIX_MOVES[moveKey];
    document.getElementById('move-txt').textContent = 'Move ' + moveDef.moveNumber + '/6: ' + moveDef.name + ' · 8-Ray Hitbox';

    atkCd = (1 / wep.speed) * (heavy ? 1.3 : 0.88);
    atkAnim = moveDef.durationSec;
    if (mouseWorld.lengthSq() > 0.1) playerYaw = Math.atan2(mouseWorld.x - playerPos.x, mouseWorld.z - playerPos.z);

    if (wep.category === 'ranged') {
      AI_Brain.rangedDmg += wep.damage;
      if (wep.id === 'tanegashima') audio.boom(); else audio.slash(false);
      const pm = new THREE.Mesh(createExtrudedBlade(0.45, 0.03, 0.01, 0), createSumiMaterial(wep.trailColor, 0.2, 0.8, true));
      pm.position.copy(playerPos).setY(1.25);
      scene.add(pm);
      projectiles.push({ mesh: pm, pos: pm.position.clone(), vel: new THREE.Vector3(Math.sin(playerYaw)*34, 0, Math.cos(playerYaw)*34), dmg: wep.damage, life: 1.8 });
      return;
    }

    AI_Brain.meleeSwings.push(performance.now());
    AI_Brain.meleeDmg += wep.damage;
    audio.slash(heavy || isPlunge);

    const arcRad = THREE.MathUtils.degToRad(wep.swingArcDeg);
    const tMesh = new THREE.Mesh(
      new THREE.RingGeometry(wep.reach * 0.45, wep.reach * (heavy ? 1.2 : 1.0), 28, 1, -arcRad * 0.5, arcRad),
      new THREE.MeshBasicMaterial({ color: heavy ? 0xdc2626 : wep.trailColor, side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
    );
    tMesh.position.set(playerPos.x, 1.15, playerPos.z);
    tMesh.rotation.x = -Math.PI / 2;
    tMesh.rotation.z = -playerYaw + Math.PI * 0.5;
    scene.add(tMesh);
    trails.push({ mesh: tMesh, life: 0.24 });

    enemies.forEach(en => {
      if (en.pos.distanceTo(playerPos) <= wep.reach + 1.0) {
        const dmg = Math.round(wep.damage * moveDef.damageMultiplier);
        en.hp -= dmg; combo++; score += dmg * 10;
        if (en.isDummy && en.hp <= 150) { en.hp = en.maxHp; pushFloat('DUMMY RESET (稽古継続)', en.pos, '#34d399'); }
        else pushFloat(moveDef.kanji + ' -' + dmg, en.pos, heavy ? '#fbbf24' : '#f87171');
      }
    });
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
  document.getElementById('cycle-wep-btn').onclick = () => {
    const slots = ['primary','secondary','ranged'];
    activeSlot = slots[(slots.indexOf(activeSlot) + 1) % 3];
    rebuildPlayerRig();
  };
  document.getElementById('cam-mode-btn').onclick = () => {
    camModeIdx = (camModeIdx + 1) % 3;
    document.getElementById('cam-mode-btn').textContent = '[V] Camera: ' + CAM_MODES[camModeIdx];
  };
  document.getElementById('dojo-mode-btn').onclick = () => {
    loadStage(stageIdx, !isDojoMode);
    document.getElementById('dojo-mode-btn').textContent = isDojoMode ? 'Return to Campaign · 出陣' : 'Dojo Training Mode · 稽古道場';
  };
  document.getElementById('open-forge-btn').onclick = () => { document.getElementById('modal').classList.add('open'); renderForge(); };
  document.getElementById('close-forge-btn').onclick = () => document.getElementById('modal').classList.remove('open');
  document.getElementById('open-asset-btn').onclick = () => { document.getElementById('asset-modal').classList.add('open'); renderAssetPresets(); };
  document.getElementById('close-asset-btn').onclick = () => document.getElementById('asset-modal').classList.remove('open');
  document.getElementById('load-url-btn').onclick = () => {
    const url = document.getElementById('asset-url-input').value.trim();
    const slot = document.getElementById('asset-slot-sel').value;
    if (!url) return;
    if (slot === 'hdri' || url.endsWith('.hdr')) {
      rgbeLoader.load(url, tex => { tex.mapping = THREE.EquirectangularReflectionMapping; scene.environment = tex; });
    } else {
      gltfLoader.load(url, gltf => applyLoadedGLTF(gltf, slot, url));
    }
  };
  document.getElementById('asset-file-input').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const slot = document.getElementById('asset-slot-sel').value;
    const buf = await f.arrayBuffer();
    gltfLoader.parse(buf, '', gltf => applyLoadedGLTF(gltf, slot, f.name));
  };

  rebuildPlayerRig();
  loadStage(0, false);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (hitstop > 0) { hitstop -= dt; renderer.render(scene, camera); requestAnimationFrame(loop); return; }

    physicsWorld.step(1 / 60, dt, 3);
    atkCd = Math.max(0, atkCd - dt);
    atkAnim = Math.max(0, atkAnim - dt);
    parryWin = Math.max(0, parryWin - dt);
    parryCd = Math.max(0, parryCd - dt);

    let mx = 0, mz = 0;
    if (keys.has('KeyW')) mz -= 1;
    if (keys.has('KeyS')) mz += 1;
    if (keys.has('KeyA')) mx -= 1;
    if (keys.has('KeyD')) mx += 1;
    const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && ki > 5;
    if (mx || mz) {
      const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      if (Math.random() < 0.08) AI_Brain.dodges[mx < -0.3 ? 'left' : mx > 0.3 ? 'right' : mz > 0.3 ? 'back' : 'forward']++;
      const spd = 9.8 * curArmor.agilityMultiplier * (sprint ? 1.4 : 1);
      if (sprint) ki = Math.max(0, ki - 20 * dt); else ki = Math.min(maxKi, ki + 24 * dt);
      playerPos.x += mx * spd * dt; playerPos.z += mz * spd * dt;
      if (atkAnim <= 0) playerYaw = Math.atan2(mx, mz);
    } else {
      ki = Math.min(maxKi, ki + 28 * dt);
    }

    if (!isGrounded) {
      playerPos.y += playerVelY * dt; playerVelY -= 28 * dt;
      if (playerPos.y <= 0) { playerPos.y = 0; playerVelY = 0; isGrounded = true; }
    }
    playerRoot.position.copy(playerPos);
    playerRoot.rotation.y = playerYaw;
    rightArm.rotation.x = atkAnim > 0 ? -Math.PI * 0.6 + Math.sin((1 - atkAnim / 0.28) * Math.PI) * 1.6 : 0;

    // Step 3D Verlet Cloth Sheet for Haori Cloak (strictly behind back armor plane z <= -0.22m)
    const cPos = clothGeo.attributes.position;
    for (let i = clothCols + 1; i < cPos.count; i++) {
      const iz = i * 3 + 2;
      const cz = clothCurr[iz];
      const vz = (cz - clothPrev[iz]) * 0.96;
      clothPrev[iz] = cz;
      clothCurr[iz] = Math.min(-0.02, cz + vz + Math.sin(now * 0.006 + i * 0.4) * 0.002 - 0.001);
      cPos.setZ(i, clothCurr[iz]);
    }
    cPos.needsUpdate = true;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]; p.life -= dt;
      // Quadratic Aerodynamic Drag: F_drag = -0.5 * rho * ||v|| * v * C_d * A
      const spd = p.vel.length();
      p.vel.addScaledVector(p.vel, -0.5 * 1.225 * spd * 0.35 * 0.008 * dt);
      p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos);
      for (const en of enemies) {
        if (en.pos.distanceTo(p.pos) < 1.1) {
          en.hp -= p.dmg; pushFloat('-' + p.dmg, en.pos, '#fbbf24'); p.life = 0; break;
        }
      }
      if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
    }

    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= dt;
      if (trails[i].life <= 0) { scene.remove(trails[i].mesh); trails.splice(i, 1); }
      else trails[i].mesh.material.opacity = trails[i].life / 0.24;
    }

    const snap = AI_Brain.getSnapshot(now);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      if (en.hp <= 0) {
        koku += en.isBoss ? 120 : 25;
        scene.remove(en.mesh); enemies.splice(i, 1); continue;
      }
      en.timer -= dt;
      const dx = playerPos.x - en.pos.x, dz = playerPos.z - en.pos.z, dist = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
      en.mesh.rotation.y = yaw;
      if (en.state === 'approach') {
        en.ring.material.opacity = 0;
        const zz = snap.zigZag > 0.45 ? Math.sin(now * 0.008 + i) * 0.8 : 0;
        if (!en.isDummy && dist > en.range * 0.85) {
          en.pos.x += Math.sin(yaw + zz) * en.speed * dt;
          en.pos.z += Math.cos(yaw + zz) * en.speed * dt;
        } else if (dist <= en.range + 1.2 && en.timer <= 0) {
          en.state = 'windup'; en.timer = 0.58;
        }
      } else if (en.state === 'windup') {
        en.ring.material.opacity = 0.75;
        if (en.timer <= 0) {
          en.state = 'approach'; en.timer = 0.95;
          if (dist <= en.range + 0.9) {
            if (parryWin > 0) {
              audio.parry(); pushFloat('DEFLECTED!', playerPos, '#fbbf24');
              en.state = 'stagger'; en.timer = 1.5;
            } else if (!en.isDummy) {
              hp = Math.max(0, hp - en.dmg); camTrauma = 0.45;
              pushFloat('-' + en.dmg, playerPos, '#ef4444');
              if (hp <= 0) hp = maxHp;
            }
          }
        }
      } else if (en.state === 'stagger') {
        en.ring.material.opacity = 0.35;
        if (en.timer <= 0) { en.state = 'approach'; en.timer = 0.3; }
      }
      en.mesh.position.copy(en.pos);
    }

    if (!isDojoMode && enemies.length === 0 && !bossSpawned) {
      bossSpawned = true;
      const b = STAGES[stageIdx].boss;
      spawnEnemy(b, true, 0, -14, false);
      document.getElementById('boss-bar-wrap').style.display = 'block';
      document.getElementById('boss-name').textContent = b.name + ' (' + b.kanjiSubtitle + ')';
    } else if (!isDojoMode && enemies.length === 0 && bossSpawned) {
      document.getElementById('boss-bar-wrap').style.display = 'none';
      loadStage(stageIdx + 1, false);
    }

    document.getElementById('hp-txt').textContent = Math.round(hp) + '/' + maxHp;
    document.getElementById('hp-bar').style.width = ((hp / maxHp) * 100) + '%';
    document.getElementById('ki-txt').textContent = Math.round(ki) + '/' + maxKi;
    document.getElementById('ki-bar').style.width = ((ki / maxKi) * 100) + '%';
    document.getElementById('boss-label').textContent = 'Score ' + score + ' · Koku ' + koku + '石 · Combo ' + combo + 'x · Foes ' + enemies.length;
    document.getElementById('ai-stance').textContent = snap.stance;
    document.getElementById('ai-callout').textContent = snap.callout;
    document.getElementById('ai-metrics').textContent = '[R_m:' + Math.round(snap.spam*100) + '% R_r:' + Math.round(snap.ranged*100) + '% D:' + snap.prefDodge.toUpperCase() + ']';

    camTrauma = Math.max(0, camTrauma - dt * 2.2);
    const sh = camTrauma * camTrauma * 0.45;
    const isFPV = camModeIdx === 1;
    armorGroup.visible = !isFPV;
    helmGroup.visible = !isFPV;
    clothMesh.visible = !isFPV;
    weaponMount.visible = !isFPV;
    fpvRig.visible = isFPV;

    if (camModeIdx === 0) {
      // Mode 1: Over-the-Shoulder 3rd-Person RPG View (+0.55m right, 3.6m back)
      const fx = Math.sin(playerYaw), fz = Math.cos(playerYaw);
      const rx = -Math.cos(playerYaw), rz = Math.sin(playerYaw);
      camera.position.set(playerPos.x - fx * 3.6 + rx * 0.55 + (Math.random()-0.5)*sh, playerPos.y + 1.65, playerPos.z - fz * 3.6 + rz * 0.55);
      camera.lookAt(playerPos.x + fx * 16, playerPos.y + 1.5, playerPos.z + fz * 16);
    } else if (camModeIdx === 1) {
      // Mode 2: 1st-Person Samurai FPV locked to (playerPos.x, playerPos.y + 1.72, playerPos.z)
      const fx = Math.sin(playerYaw), fz = Math.cos(playerYaw);
      camera.position.set(playerPos.x, playerPos.y + 1.72, playerPos.z);
      camera.lookAt(playerPos.x + fx * 20, playerPos.y + 1.72, playerPos.z + fz * 20);
      fpvWeaponMount.rotation.x = atkAnim > 0 ? -0.6 + Math.sin((1 - atkAnim / 0.28) * Math.PI) * 1.4 : 0;
    } else {
      // Mode 3: Isometric Tactical View (45° at 14m)
      camera.position.set(playerPos.x + (Math.random()-0.5)*sh, playerPos.y + 14.5, playerPos.z + 14.0);
      camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z - 1.2);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kami-no-washi-blade-of-the-ink.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
