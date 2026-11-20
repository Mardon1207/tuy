import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPerson, updatePerson, wrapGLTF, updateGLTF } from './person.js';
import { prepare, makePerson, updatePerson as updateHuman } from './humans.js';
import { buildHall, BOUNDS } from './hall.js';

const CFG = JSON.parse(document.getElementById('config').textContent);
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* yo'q */ } },
};

// ================= Renderer / sahna =================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9d9dc);
scene.fog = new THREE.Fog(0xe9d9dc, 38, 85);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 120);

scene.add(new THREE.HemisphereLight(0xfff2ea, 0xcdb0b8, 0.8));
const sun = new THREE.DirectionalLight(0xfff0e0, 1.3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
sun.shadow.bias = -0.0008;
sun.shadow.radius = 4;
scene.add(sun, sun.target);

// ================= Yuklanish =================
const manager = new THREE.LoadingManager();
let loadedPct = 10;
const setBar = (p) => { loadedPct = Math.max(loadedPct, p); $('loaderBar').style.width = loadedPct + '%'; };
manager.onProgress = (_u, done, total) => setBar(20 + (done / total) * 75);

async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 100px "Playfair Display"'),
        document.fonts.load('italic 700 100px "Playfair Display"'),
        document.fonts.load('italic 500 100px "Playfair Display"'),
        document.fonts.load('500 100px "Playfair Display"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* shriftsiz ham ishlaydi */ }
}

let hall, player;
const state = {
  pos: new THREE.Vector3(0, 0, 1.6),
  vel: new THREE.Vector3(),
  heading: Math.PI,
  yaw: 0, pitch: 0.26, dist: 5.6, distTarget: 5.6,
  camTarget: new THREE.Vector3(0, 1.15, 1.6),
  ui: false, started: false,
};

async function init() {
  await loadFonts();
  setBar(20);
  const loader = new GLTFLoader(manager);
  const tryLoad = (url) => (url ? loader.loadAsync(url).catch((e) => { console.warn('Model yuklanmadi:', url, e); return null; }) : Promise.resolve(null));
  const [manGltf, customGltf, flowerGltf] = await Promise.all([tryLoad(CFG.manModel), tryLoad(CFG.characterModel), tryLoad(CFG.flowerModel)]);
  hall = buildHall(scene, CFG, manager, { flowerGLTF: flowerGltf });

  const manBase = manGltf && prepare(manGltf, 'man');
  if (customGltf) player = wrapGLTF(customGltf);
  else if (manBase) player = makePerson(manBase, { suit: 0x26375f, tie: 0x8e1d3c, skin: 0xd9a888 });
  else player = createPerson({ suit: 0x27355a, tie: 0xb2264c, hair: 0x2a1b12 });
  scene.add(player);


  // rasmlar yuklanishini kutish (eng ko'pi bilan 8 soniya)
  await new Promise((res) => {
    const t = setTimeout(res, 8000);
    if (manager.itemsLoaded >= manager.itemsTotal) { clearTimeout(t); res(); }
    manager.onLoad = () => { clearTimeout(t); res(); };
  });
  setBar(100);
  setWishCount(CFG.wishCount);
  const btn = $('enterBtn');
  btn.disabled = false;
  btn.textContent = 'Taklifnomani ochish';
  btn.onclick = enter;
  renderer.setAnimationLoop(loop);
}

// ================= Musiqa =================
let audio = null, soundOn = false;
if (CFG.music) {
  audio = new Audio(CFG.music);
  audio.loop = true; audio.volume = 0.55;
  $('soundBtn').classList.remove('hidden');
}
function setSound(on) {
  soundOn = on && !!audio;
  if (audio) { if (soundOn) audio.play().catch(() => {}); else audio.pause(); }
  $('soundOn').classList.toggle('hidden', !soundOn);
  $('soundOff').classList.toggle('hidden', soundOn);
}
$('soundBtn').onclick = () => setSound(!soundOn);

function enter() {
  $('loader').classList.add('fade');
  setTimeout(() => $('loader').remove(), 900);
  state.started = true;
  setSound(true);
  if (CFG.hint) showHint(CFG.hint, 7000);
}

// ================= UI yordamchilari =================
let hintTimer, toastTimer;
function showHint(text, ms) {
  const h = $('hint');
  h.textContent = text;
  h.classList.remove('hidden');
  h.style.opacity = 1;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, ms);
}
function hideHint() {
  const h = $('hint');
  h.style.opacity = 0;
  setTimeout(() => h.classList.add('hidden'), 600);
}
function toast(text, ms = 3200) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden');
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

let openModalId = null;
function openModal(id) {
  closeModal();
  openModalId = id;
  state.ui = true;
  $('overlay').classList.toggle('hidden', id === 'lightbox');
  $(id).classList.remove('hidden');
  joyReset();
}
function closeModal() {
  if (!openModalId) return;
  $(openModalId).classList.add('hidden');
  $('overlay').classList.add('hidden');
  openModalId = null;
  state.ui = false;
  clearInterval(countdownTimer);
}
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
$('overlay').addEventListener('click', closeModal);
$('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* */ }
    ta.remove();
    return ok;
  }
}

// ================= Ob'ektlar bilan ishlash =================
const viewed = new Set();
let allViewedShown = false;
function markViewed(i) {
  if (viewed.has(i)) return;
  viewed.add(i);
  const total = hall.interactables.filter((x) => x.type === 'photo').length;
  if (viewed.size === total && !allViewedShown) {
    allViewedShown = true;
    toast('♥ Barcha rasmlarni ko\'rib chiqdingiz!');
  }
}

function interact(it) {
  if (!it) return;
  if (it.type === 'photo') {
    markViewed(it.index);
    $('lightImg').src = it.url;
    $('lightCaption').textContent = it.caption;
    openModal('lightbox');
  } else if (it.type === 'address') {
    $('addrText').textContent = CFG.address;
    const y = $('yandexBtn'), g = $('googleBtn');
    y.href = CFG.yandexUrl || '#'; y.classList.toggle('hidden', !CFG.yandexUrl);
    g.href = CFG.googleUrl || '#'; g.classList.toggle('hidden', !CFG.googleUrl);
    openModal('modalAddress');
  } else if (it.type === 'wishes') {
    openWishes();
  } else if (it.type === 'toyona') {
    copyText(CFG.card.replace(/\s+/g, ''));
    $('cardNum').textContent = CFG.card;
    $('cardHolder').textContent = CFG.cardHolder || '';
    openModal('modalCard');
  } else if (it.type === 'calendar') {
    openDate();
  }
}

$('copyAddrBtn').onclick = async () => { await copyText(CFG.address); toast('Manzil nusxalandi'); };
$('copyCardBtn').onclick = async () => { await copyText(CFG.card.replace(/\s+/g, '')); toast('Karta raqami nusxalandi'); };

let countdownTimer;
function openDate() {
  const d = new Date(CFG.date + 'T00:00:00');
  $('dateBig').textContent = CFG.dateText;
  $('dateSub').textContent = `${CFG.groom} & ${CFG.bride} · ${CFG.monthName} ${d.getFullYear()}${CFG.time ? ' · ' + CFG.time : ''}`;
  const [hh, mm] = (CFG.time || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  d.setHours(hh, mm);
  const tick = () => {
    let s = Math.floor((d - Date.now()) / 1000);
    if (s <= 0) { $('countdown').innerHTML = '<div style="padding:12px 18px"><b>♥</b><small>To\'y kuni keldi!</small></div>'; return; }
    const parts = [[Math.floor(s / 86400), 'kun'], [Math.floor(s / 3600) % 24, 'soat'], [Math.floor(s / 60) % 60, 'daqiqa'], [s % 60, 'soniya']];
    $('countdown').innerHTML = parts.map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join('');
  };
  tick();
  openModal('modalDate');
  countdownTimer = setInterval(tick, 1000);
}

// ================= Tilaklar =================
function setWishCount(n) {
  $('wishCount').textContent = n;
  $('wishBadge').textContent = n;
  state.wishCount = n;
}
function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hozirgina';
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return `${Math.floor(s / 86400)} kun oldin`;
}
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function renderWishes(items) {
  $('wishList').innerHTML = items.length
    ? items.map((w) => `<div class="wish"><div class="wish-head"><b>${esc(w.name)}</b><span>${timeAgo(w.created)}</span></div><p>${esc(w.text)}</p></div>`).join('')
    : '<div class="empty">Hali tilak yo\'q. Birinchi bo\'ling! ♥</div>';
}
let wishItems = [];
async function openWishes() {
  $('wishName').value = store.get('wishName') || $('wishName').value;
  openModal('modalWishes');
  renderWishes(wishItems);
  try {
    const r = await fetch('api/wishes/');
    const data = await r.json();
    wishItems = data.items; setWishCount(data.count);
    renderWishes(wishItems);
  } catch { /* oflayn */ }
}
$('wishText').addEventListener('input', () => { $('wishLen').textContent = $('wishText').value.length; });
$('wishForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('wishName').value.trim(), text = $('wishText').value.trim();
  if (!name || !text) return;
  const btn = $('wishSubmit');
  btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
  try {
    const r = await fetch('api/wishes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.CSRF },
      body: JSON.stringify({ name, text }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Xatolik');
    store.set('wishName', name);
    wishItems.unshift(data.item);
    setWishCount(data.count);
    renderWishes(wishItems);
    $('wishText').value = ''; $('wishLen').textContent = '0';
    toast('♥ Tilagingiz yuborildi! Rahmat!');
  } catch (err) {
    toast(err.message || 'Yuborib bo\'lmadi, qayta urinib ko\'ring');
  } finally {
    btn.disabled = false; btn.textContent = 'Yuborish';
  }
});

// ================= Boshqaruv: joystik =================
const joy = { x: 0, y: 0, id: null };
const joyEl = $('joystick'), knob = $('joyKnob');
function joyMove(e) {
  const r = joyEl.getBoundingClientRect();
  const max = r.width / 2 - 12;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / max; joy.y = -dy / max;
}
function joyReset() {
  joy.x = joy.y = 0; joy.id = null;
  knob.style.transform = '';
}
joyEl.addEventListener('pointerdown', (e) => {
  if (state.ui) return;
  joy.id = e.pointerId;
  joyEl.setPointerCapture(e.pointerId);
  joyMove(e);
  e.stopPropagation();
});
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
  joyEl.addEventListener(ev, (e) => { if (e.pointerId === joy.id) joyReset(); }));

// ================= Boshqaruv: ekranni surish, bosish, pinch =================
const canvas = renderer.domElement;
const ptrs = new Map();
let pinchD = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (state.ui) return;
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    state.yaw -= dx * 0.006;
    state.pitch = THREE.MathUtils.clamp(state.pitch + dy * 0.004, 0.02, 1.15);
    state.lastDrag = performance.now();
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    state.distTarget = THREE.MathUtils.clamp(state.distTarget * (pinchD / d), 2.2, 9);
    pinchD = d;
  }
});
const endPtr = (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  ptrs.delete(e.pointerId);
  const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
  if (e.type === 'pointerup' && moved < 8 && performance.now() - p.t < 400 && ptrs.size === 0) tap(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => {
  state.distTarget = THREE.MathUtils.clamp(state.distTarget + e.deltaY * 0.004, 2.2, 9);
  e.preventDefault();
}, { passive: false });

const raycaster = new THREE.Raycaster();
function tap(x, y) {
  if (!hall || state.ui) return;
  const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const objs = hall.interactables.map((i) => i.object);
  const hit = raycaster.intersectObjects(objs, true)[0];
  if (!hit || hit.distance > 20) return;
  let o = hit.object;
  while (o && !objs.includes(o)) o = o.parent;
  const it = hall.interactables.find((i) => i.object === o);
  if (it) interact(it);
}

// Klaviatura
const keys = new Set();
window.addEventListener('keydown', (e) => { if (!state.ui) keys.add(e.code); });
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// ================= Sayohat (avtomatik tur) =================
const tour = { active: false, i: 0, path: [], wait: 0, stop: null };
function setTourBtn() {
  $('tourIcon').textContent = tour.active ? '❚❚' : '▶';
  $('tourText').textContent = tour.active ? 'To\'xtatish' : 'Sayohat';
}
function planTo(stop) {
  const P = state.pos, S = stop.stand;
  const path = [];
  if (Math.abs(P.x) > 0.8 && Math.abs(P.z - S.y) > 0.5) path.push(new THREE.Vector2(0, P.z));
  if (Math.abs(S.x) > 0.8 && Math.abs(P.z - S.y) > 0.5) path.push(new THREE.Vector2(0, S.y));
  path.push(S.clone());
  tour.path = path; tour.stop = stop; tour.wait = 0;
}
function startTour() {
  tour.active = true; tour.i = 0;
  planTo(hall.tourStops[0]);
  setTourBtn();
  hideHint();
}
function stopTour(msg) {
  if (!tour.active) return;
  tour.active = false;
  setTourBtn();
  if (msg) toast(msg);
}
$('tourBtn').onclick = () => (tour.active ? stopTour() : startTour());

function tourStep(dt, out) {
  if (tour.wait > 0) {
    tour.wait -= dt;
    const lk = tour.stop.look;
    const want = Math.atan2(lk.x - state.pos.x, lk.z - state.pos.z);
    state.heading = lerpAngle(state.heading, want, 1 - Math.exp(-dt * 5));
    if (tour.wait <= 0) {
      tour.i++;
      if (tour.i >= hall.tourStops.length) { stopTour('♥ Sayohat tugadi'); return; }
      planTo(hall.tourStops[tour.i]);
    }
    return;
  }
  const target = tour.path[0];
  const dx = target.x - state.pos.x, dz = target.y - state.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.18) {
    tour.path.shift();
    if (!tour.path.length) {
      tour.wait = tour.stop.type === 'photo' ? 2.6 : 3.2;
      if (tour.stop.type === 'photo') markViewed(tour.stop.index);
    }
    return;
  }
  const sp = Math.min(1.75, d * 1.6 + 0.4);
  out.set(dx / d * sp, 0, dz / d * sp);
}

// ================= Asosiy sikl =================
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3(), desiredVel = new THREE.Vector3();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let nearest = null;

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

function collide(p) {
  p.x = THREE.MathUtils.clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
  p.z = THREE.MathUtils.clamp(p.z, BOUNDS.minZ, BOUNDS.maxZ);
  for (const c of hall.colliders) {
    const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + 0.28;
    const d = Math.hypot(dx, dz);
    if (d < rr && d > 1e-4) { p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
  }
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // --- kiritish ---
  let ix = joy.x, iy = joy.y;
  if (!state.ui) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  }
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  if (state.ui || !state.started) { ix = iy = mag = 0; }
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || mag > 0.97;
  if (mag > 0.12) { if (tour.active) stopTour(); }

  fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  desiredVel.set(0, 0, 0);
  if (tour.active && !state.ui) tourStep(dt, desiredVel);
  else if (mag > 0.08) {
    desiredVel.copy(fwd).multiplyScalar(iy).addScaledVector(right, ix).normalize()
      .multiplyScalar((running ? 3.4 : 1.9) * Math.min(1, mag * 1.15));
  }
  state.vel.lerp(desiredVel, 1 - Math.exp(-dt * 9));
  const speed = Math.hypot(state.vel.x, state.vel.z);
  state.pos.addScaledVector(state.vel, dt);
  collide(state.pos);
  // supachaga chiqish
  const pf = hall.platform;
  const onPf = Math.hypot(state.pos.x - pf.x, state.pos.z - pf.z) < pf.r ? pf.h : 0;
  state.pos.y += (onPf - state.pos.y) * Math.min(1, dt * 14);

  if (speed > 0.15) {
    const want = Math.atan2(state.vel.x, state.vel.z);
    state.heading = lerpAngle(state.heading, want, 1 - Math.exp(-dt * 10));
    // kamera asta-sekin qahramon orqasiga o'tadi
    const dragging = ptrs.size > 0 || performance.now() - (state.lastDrag || 0) < 900;
    if (!dragging && (iy > -0.3 || tour.active)) {
      state.yaw = lerpAngle(state.yaw, state.heading + Math.PI, 1 - Math.exp(-dt * (tour.active ? 2.2 : 1.2) * Math.min(1, speed / 1.5)));
    }
  } else if (tour.active && tour.wait > 0) {
    state.yaw = lerpAngle(state.yaw, state.heading + Math.PI, 1 - Math.exp(-dt * 2.5));
  }

  player.position.copy(state.pos);
  player.rotation.y = state.heading;
  if (player.userData.gltf) updateGLTF(player, dt, speed);
  else if (player.userData.man) updateHuman(player, dt, speed);
  else updatePerson(player, dt, speed);

  hall.update(t, dt);

  // --- kamera ---
  state.dist += (state.distTarget - state.dist) * (1 - Math.exp(-dt * 8));
  tmpV.set(state.pos.x, 1.15 + state.pos.y, state.pos.z);
  state.camTarget.lerp(tmpV, 1 - Math.exp(-dt * 12));
  const cp = Math.cos(state.pitch);
  const off = new THREE.Vector3(Math.sin(state.yaw) * cp, Math.sin(state.pitch), Math.cos(state.yaw) * cp);
  let d = state.dist;
  // kamera devordan chiqib ketmasin
  const tgt = state.camTarget;
  const lim = (v, o, lo, hi) => (o > 0 ? (hi - v) / o : o < 0 ? (lo - v) / o : Infinity);
  d = Math.min(d,
    lim(tgt.x, off.x, -7.75, 7.75), lim(tgt.z, off.z, -31.6, 7.75), lim(tgt.y, off.y, 0.25, 7.6));
  d = Math.max(0.6, d);
  camera.position.copy(tgt).addScaledVector(off, d);
  camera.lookAt(tgt.x, tgt.y + 0.55, tgt.z);

  // soya player bilan yursin
  sun.position.set(state.pos.x + 3, 10, state.pos.z + 5);
  sun.target.position.set(state.pos.x, 0, state.pos.z);

  // --- yaqin ob'ekt ---
  let best = null, bestD = Infinity;
  for (const it of hall.interactables) {
    if (!it.radius) continue;
    const dd = Math.hypot(it.pos.x - state.pos.x, it.pos.z - state.pos.z);
    if (dd < it.radius && dd < bestD) { best = it; bestD = dd; }
    if (it.type === 'photo' && dd < 2.6) markViewed(it.index);
  }
  if (best !== nearest) {
    nearest = best;
    const b = $('actionBtn');
    if (best && best.type !== 'photo') { b.textContent = best.label; b.classList.remove('hidden'); }
    else if (best) { b.textContent = best.label; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  }
  $('actionBtn').classList.toggle('hidden', !nearest || state.ui || !state.started);

  // --- tilaklar soni belgisi (badge) ---
  const badge = $('wishBadge');
  tmpV.copy(hall.badgeAnchor).project(camera);
  const far = camera.position.distanceTo(hall.badgeAnchor) > 22;
  if (state.wishCount > 0 && tmpV.z < 1 && !far && !state.ui && state.started) {
    badge.style.left = ((tmpV.x + 1) / 2 * window.innerWidth) + 'px';
    badge.style.top = ((1 - tmpV.y) / 2 * window.innerHeight) + 'px';
    badge.classList.remove('hidden');
  } else badge.classList.add('hidden');

  if (speed > 0.3 && !$('hint').classList.contains('hidden') && t > 3) hideHint();

  renderer.render(scene, camera);
}
$('actionBtn').onclick = () => interact(nearest);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init().catch((e) => {
  console.error(e);
  $('enterBtn').textContent = 'Xatolik: sahifani yangilang';
});
