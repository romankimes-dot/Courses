// Produits en 3D (modèles Kenney Food Kit, CC0) : ils flottent autour du titre et tombent dans le sac en bas de page.
// Rendu seulement quand la scène est visible ; mouvement réduit = image fixe.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/three/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/three/jsm/geometries/RoundedBoxGeometry.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = new GLTFLoader();
const cache = {};

// Un modèle centré, ramené à une taille de 1 (plus grande dimension)
function model(name) {
  cache[name] ||= loader.loadAsync(`3d/${name}.glb`).then(g => {
    const o = g.scene;
    o.traverse(m => { if (m.material) { m.material.roughness = .55; m.material.envMapIntensity = .9; } });
    const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
    o.position.sub(box.getCenter(new THREE.Vector3()));
    o.scale.multiplyScalar(1 / Math.max(size.x, size.y, size.z));
    o.position.multiplyScalar(1 / Math.max(size.x, size.y, size.z));
    return o;
  });
  return cache[name].then(o => { const g = new THREE.Group(); g.add(o.clone()); return g; });
}

function stage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0e6d8, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  return { renderer, scene, camera, fit };
}

// Boucle d'animation, en pause hors de l'écran
function animate(canvas, s, tick) {
  let on = false, last = 0;
  const loop = t => {
    if (!on) return;
    const dt = Math.min(.05, (t - last) / 1000 || 0);
    last = t;
    tick(t / 1000, dt);
    s.renderer.render(s.scene, s.camera);
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    const was = on;
    on = e.isIntersecting && !document.hidden;
    if (on && !was) { last = performance.now(); requestAnimationFrame(loop); }
  }).observe(canvas);
  addEventListener('resize', () => { s.fit(); if (!on) s.renderer.render(s.scene, s.camera); });
}

// ---------- Autour du titre : des produits qui flottent ----------
async function hero(canvas) {
  const s = stage(canvas);
  s.camera.position.set(0, 0, 14);
  s.fit();
  const wide = () => s.camera.aspect > 1.1;
  // Position à l'écran (-1..1), profondeur, taille ; le centre reste libre pour le texte
  const WIDE = [
    ['tomato', -.84, .52, 1, 1.5], ['carton', -.6, -.08, -1, 1.9], ['croissant', -.86, -.62, .5, 1.7], ['lemon', -.56, .9, -2, 1.1],
    ['strawberry', .58, .82, -1, 1.2], ['loaf-baguette', .82, .3, .5, 2.4], ['avocado', .6, -.28, 0, 1.4], ['cheese', .86, -.72, -1, 1.9],
  ];
  const NARROW = [
    ['tomato', -.9, .42, 0, .85], ['strawberry', .9, .52, -1, .75], ['lemon', -.92, -.2, -1, .7], ['avocado', .92, -.1, 0, .75],
  ];
  const items = [];
  const place = () => {
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2)) * s.camera.position.z, w = h * s.camera.aspect;
    items.forEach(it => { it.home.set(it.p[1] * w / 2, it.p[2] * h / 2, it.p[3]); });
  };
  const list = wide() ? WIDE : NARROW;
  await Promise.all(list.map(async (p, k) => {
    const g = await model(p[0]);
    g.scale.setScalar(p[4] * (wide() ? 1 : .9));
    g.rotation.set(.3 + Math.random() * .4, Math.random() * 6, (Math.random() - .5) * .6);
    s.scene.add(g);
    items.push({ g, p, home: new THREE.Vector3(), phase: k * 1.7, spin: (k % 2 ? 1 : -1) * (.18 + k * .02), delay: k * .09 });
  }));
  place();
  addEventListener('resize', () => { s.fit(); place(); });
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
  const t0 = performance.now() / 1000;
  const ease = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); // arrivée avec un léger rebond
  const tick = (t, dt) => {
    const since = t - t0;
    for (const it of items) {
      const a = reduced ? 1 : Math.min(1, Math.max(0, (since - it.delay) / 1.1));
      const drop = (1 - ease(a)) * 6;
      it.g.position.set(it.home.x, it.home.y + drop + (reduced ? 0 : Math.sin(t * .9 + it.phase) * .15) - scrollY * .004 * (1 + it.p[3] * .3), it.home.z);
      if (!reduced) { it.g.rotation.y += it.spin * dt; it.g.rotation.x = .35 + Math.sin(t * .6 + it.phase) * .12; }
    }
    s.camera.position.x += (mouse.x * 1.2 - s.camera.position.x) * .05;
    s.camera.position.y += (-mouse.y * .8 - s.camera.position.y) * .05;
    s.camera.lookAt(0, 0, 0);
  };
  tick(performance.now() / 1000, 0);
  s.renderer.render(s.scene, s.camera);
  if (!reduced) animate(canvas, s, tick);
}

// ---------- En bas : les courses tombent dans le panier ----------
// Panier de supermarché bleu (couleur de l'app), ouvert : les produits s'y empilent, puis on recommence
function basket() {
  const g = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: 0x1f5fcc, roughness: .42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x163f8a, roughness: .6 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: .5 });
  const W = 2.6, D = 1.7, H = 1.25, t = .09;
  const part = (w, h, d, x, y, z, m = blue) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) / 2.2), m); b.position.set(x, y, z); g.add(b); return b; };
  part(W, t, D, 0, t / 2, 0);
  part(W, H, t, 0, H / 2, D / 2); part(W, H, t, 0, H / 2, -D / 2);
  part(t, H, D, W / 2, H / 2, 0); part(t, H, D, -W / 2, H / 2, 0);
  // Rebord plus épais et ajours sur les côtés
  part(W + .1, .14, t * 2, 0, H, D / 2); part(W + .1, .14, t * 2, 0, H, -D / 2);
  part(t * 2, .14, D + .1, W / 2, H, 0); part(t * 2, .14, D + .1, -W / 2, H, 0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) part(.26, .2, .02, -W / 2 + .33 + c * .39, .38 + r * .4, D / 2 + t / 2 + .005, dark);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) part(.02, .2, .26, W / 2 + t / 2 + .005, .38 + r * .4, -D / 2 + .3 + c * .37, dark);
  // Anses repliées sur les côtés
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(.75, .05, 10, 32, Math.PI), grip);
    a.position.set(sx * (W / 2 + .02), H, 0); a.rotation.set(0, Math.PI / 2, 0); a.rotation.z = sx * .35;
    g.add(a);
  }
  g.userData = { W, D, H, t };
  return g;
}

async function bag(canvas) {
  const s = stage(canvas);
  s.camera.position.set(0, 3.4, 8.2);
  s.camera.lookAt(0, .55, 0);
  s.fit();
  const b = basket();
  b.position.y = -.4;
  s.scene.add(b);
  const NAMES = ['loaf-baguette', 'tomato', 'carton', 'cheese', 'apple', 'banana', 'broccoli', 'lemon', 'croissant', 'pear', 'carrot', 'grapes'];
  const models = await Promise.all(NAMES.map(model));
  // Places dans le panier : une couche au fond, une couche qui dépasse
  const SLOTS = [[-.75, .45, .3], [0, .45, -.3], [.75, .45, .3], [-.75, .5, -.35], [.7, .5, -.35], [0, .55, .35], [-.5, 1.25, 0], [.5, 1.3, .05], [0, 1.6, -.1]];
  let pile = [], k = 0, next = 0, squash = 0, clearAt = 0;
  const drop = slot => {
    const g = models[k++ % models.length].clone();
    g.scale.setScalar(.85 + Math.random() * .2);
    g.position.set(slot[0], 6, slot[2]);
    g.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    b.add(g); // les produits suivent le panier quand il pivote
    pile.push({ g, slot, v: 0, rest: false, spin: new THREE.Vector3(1 + Math.random() * 3, 1 + Math.random() * 3, 0), lean: new THREE.Euler((Math.random() - .5) * .8, Math.random() * 6, (Math.random() - .5) * .8) });
  };
  if (reduced) {
    SLOTS.forEach(sl => { drop(sl); const p = pile.at(-1); p.g.position.y = sl[1]; p.g.rotation.copy(p.lean); });
    s.renderer.render(s.scene, s.camera);
    return;
  }
  const tick = (t, dt) => {
    if (!clearAt && t > next && pile.length < SLOTS.length) { drop(SLOTS[pile.length]); next = t + .55; }
    if (!clearAt && pile.length === SLOTS.length && pile.every(p => p.rest)) clearAt = t + 2.2;
    for (const p of pile) {
      if (p.rest) continue;
      const floor = p.slot[1];
      p.v += 14 * dt;
      p.g.position.y -= p.v * dt;
      p.g.rotation.x += p.spin.x * dt; p.g.rotation.y += p.spin.y * dt;
      if (p.g.position.y <= floor) {
        p.g.position.y = floor;
        if (p.v > 3) { p.v = -p.v * .25; squash = 1; } else { p.rest = true; p.g.rotation.copy(p.lean); }
      }
    }
    // Panier plein : on vide et on recommence
    if (clearAt && t > clearAt) {
      const a = Math.min(1, (t - clearAt) / .4);
      pile.forEach(p => p.g.scale.setScalar(Math.max(.001, (1 - a) * .8)));
      if (a >= 1) { pile.forEach(p => b.remove(p.g)); pile = []; clearAt = 0; next = t + .6; }
    }
    squash = Math.max(0, squash - dt * 5);
    b.scale.set(1 + squash * .025, 1 - squash * .04, 1 + squash * .025);
    b.rotation.y = Math.sin(t * .4) * .18 - .1;
  };
  animate(canvas, s, tick);
}

// ---------- Vignettes (fond transparent) pour la démo et la grille ----------
export async function thumb(name, size = 160) {
  const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
  canvas.style.cssText = `width:${size}px;height:${size}px`;
  document.body.append(canvas);
  const s = stage(canvas);
  s.renderer.setPixelRatio(1);
  s.fit();
  const g = await model(name);
  g.rotation.set(.45, -.6, 0);
  s.scene.add(g);
  s.camera.position.set(0, 0, 3.2);
  s.camera.lookAt(0, 0, 0);
  s.renderer.render(s.scene, s.camera);
  const url = canvas.toDataURL('image/png');
  canvas.remove();
  return url;
}

const h = document.getElementById('hero3d'), b = document.getElementById('bag3d');
try { if (h) hero(h); if (b) bag(b); } catch {}
