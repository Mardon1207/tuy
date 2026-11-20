// To'y zali: devorlar, qandillar, gullar, rasmlar, kalendar, kuyov, manzil, tilak qutisi, to'yona.
import * as THREE from 'three';
import { FlowerBatch } from './flowers.js';
import { buildSuit, buildGown } from './garments.js';

export const HALL = { W: 16, ZB: 8, ZE: -32, H: 8 };
export const BOUNDS = { minX: -7.55, maxX: 7.55, minZ: -31.0, maxZ: 7.5 };

const SERIF = '"Playfair Display", Georgia, serif';
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- Yordamchi funksiyalar ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.55);
  ctx.bezierCurveTo(cx - s * 1.0, cy - s * 0.05, cx - s * 0.55, cy - s * 0.85, cx, cy - s * 0.32);
  ctx.bezierCurveTo(cx + s * 0.55, cy - s * 0.85, cx + s * 1.0, cy - s * 0.05, cx, cy + s * 0.55);
  ctx.closePath();
}

let glowTex;
function glowTexture() {
  if (!glowTex) {
    glowTex = canvasTex(128, 128, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,248,230,1)');
      g.addColorStop(0.25, 'rgba(255,236,200,0.55)');
      g.addColorStop(1, 'rgba(255,230,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
  }
  return glowTex;
}
function glow(size, color = 0xffffff, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- Materiallar ----------
const MAT = {
  wall: new THREE.MeshStandardMaterial({ color: 0xdfc3b9, roughness: 0.9 }),
  molding: new THREE.MeshStandardMaterial({ color: 0xecd9d0, roughness: 0.5 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xeedfd9, roughness: 0.95 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe0b462, metalness: 1, roughness: 0.24 }),
  goldGlow: new THREE.MeshStandardMaterial({ color: 0xe7bb64, metalness: 1, roughness: 0.2, emissive: 0x7a5014, emissiveIntensity: 0.55 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1e6de, roughness: 0.35 }),
  led: new THREE.MeshBasicMaterial({ color: 0xffeedb }),
};

// Devorga ramka (molding) chizish: lokal koordinatada (x — devor bo'ylab, y — yuqoriga)
function frameRect(group, cx, cy, w, h, t = 0.06, d = 0.035, mat = MAT.molding) {
  const hb = new THREE.BoxGeometry(w, t, d), vb = new THREE.BoxGeometry(t, h, d);
  [[cx, cy + h / 2 - t / 2, hb], [cx, cy - h / 2 + t / 2, hb], [cx - w / 2 + t / 2, cy, vb], [cx + w / 2 - t / 2, cy, vb]]
    .forEach(([x, y, g]) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, d / 2); group.add(m); });
}

// ---------- Qandil ----------
function chandelier(scale = 1) {
  const g = new THREE.Group();
  const spike = new THREE.CylinderGeometry(0.016, 0.004, 1, 5);
  const items = [];
  const rings = 18;
  for (let k = 0; k <= rings; k++) {
    const f = k / rings;
    const y = -f * 1.45;
    // yurak shakliga o'xshash profil: tepasi keng, pastga qarab ingichkalashadi
    const r = 1.2 * Math.pow(1 - f, 0.7) * (0.92 + 0.12 * Math.sin(f * Math.PI));
    for (const layer of [1, 0.62]) {
      const rr = r * layer;
      const n = Math.max(5, Math.round((Math.PI * 2 * rr) / 0.06));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.17;
        const L = rnd(0.3, 0.6) * (1 - f * 0.4);
        items.push([Math.cos(a) * rr, y - L / 2, Math.sin(a) * rr, L]);
      }
    }
  }
  const im = new THREE.InstancedMesh(spike, MAT.goldGlow, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach(([x, y, z, L], i) => {
    q.setFromEuler(new THREE.Euler(rnd(-0.06, 0.06), 0, rnd(-0.06, 0.06)));
    m.compose(p.set(x, y, z), q, s.set(1, L, 1));
    im.setMatrixAt(i, m);
  });
  g.add(im);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.2, 0.1, 40), MAT.gold);
  canopy.position.y = 0.05;
  g.add(canopy);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), MAT.gold);
  rod.position.y = 1.05;
  g.add(rod);
  const gl = glow(4.2, 0xffe2b0, 0.55);
  gl.position.y = -0.6;
  g.add(gl);
  g.scale.setScalar(scale);
  return g;
}

// ---------- Kalendar ----------
function calendarTexture(cfg) {
  const d = new Date(cfg.date + 'T00:00:00');
  const year = d.getFullYear(), month = d.getMonth(), day = d.getDate();
  return canvasTex(1024, 1100, (ctx, W, H) => {
    ctx.fillStyle = '#fffdf9'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d9be88'; ctx.lineWidth = 8; ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.lineWidth = 2; ctx.strokeRect(42, 42, W - 84, H - 84);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2b2f3a';
    ctx.font = `italic 700 150px ${SERIF}`;
    ctx.fillText(cfg.dateText, W / 2, 210);
    // nikoh uzuklari belgisi
    ctx.strokeStyle = '#b99a5e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W / 2 - 13, 262, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2 + 13, 262, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(250, 262); ctx.lineTo(W / 2 - 42, 262); ctx.moveTo(W / 2 + 42, 262); ctx.lineTo(W - 250, 262); ctx.stroke();
    ctx.fillStyle = '#2b2f3a';
    ctx.font = `italic 500 78px ${SERIF}`;
    ctx.fillText(`${cfg.monthName} ${year}`, W / 2, 365);
    const names = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
    const x0 = 130, cw = (W - 260) / 7;
    ctx.font = `500 40px ${SERIF}`; ctx.fillStyle = '#6b6573';
    names.forEach((n, i) => ctx.fillText(n, x0 + cw * i + cw / 2, 440));
    const first = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    ctx.font = `500 50px ${SERIF}`;
    for (let dd = 1; dd <= days; dd++) {
      const idx = first + dd - 1, row = Math.floor(idx / 7), col = idx % 7;
      const x = x0 + cw * col + cw / 2, y = 530 + row * 84;
      if (dd === day) {
        ctx.fillStyle = '#e8365f';
        heartPath(ctx, x, y - 20, 44); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `700 46px ${SERIF}`;
        ctx.fillText(dd, x, y - 4);
        ctx.font = `500 50px ${SERIF}`;
      } else {
        ctx.fillStyle = '#2b2f3a';
        ctx.fillText(dd, x, y);
      }
    }
    ctx.fillStyle = '#a58a5a';
    ctx.font = `italic 500 52px ${SERIF}`;
    ctx.fillText(`${cfg.groom} & ${cfg.bride}${cfg.time ? '  ·  ' + cfg.time : ''}`, W / 2, H - 80);
  });
}

// ---------- Rasm joy-lari (chap/o'ng devorlar) ----------
const PHOTO_SLOTS = [
  [-1, -2], [1, -2], [-1, -10], [1, -10], [-1, -18], [1, -18], [-1, 2], [1, 2],
];

function placeholderPhoto(i, cfg) {
  const palettes = [['#f7d6df', '#e9b5c6'], ['#e6e0f5', '#c9bde9'], ['#fbe7d2', '#efc9a3']];
  const [a, b] = palettes[i % 3];
  const c = document.createElement('canvas');
  c.width = 600; c.height = 800;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 600, 800);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 800);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  heartPath(ctx, 300, 330, 150); ctx.fill();
  ctx.textAlign = 'center'; ctx.fillStyle = '#5a4a58';
  ctx.font = `italic 700 64px ${SERIF}`;
  ctx.fillText(`${cfg.groom} & ${cfg.bride}`, 300, 560);
  ctx.font = `500 30px ${SERIF}`;
  ctx.fillText(`Rasm ${i + 1} — admin paneldan yuklang`, 300, 640);
  return c.toDataURL('image/jpeg', 0.9);
}

// ---------- Asosiy qurilish ----------
export function buildHall(scene, cfg, manager, extras = {}) {
  const { W, ZB, ZE, H } = HALL;
  const L = ZB - ZE, cz = (ZB + ZE) / 2;
  const colliders = [];
  const interactables = [];
  const animated = [];
  const flowers = new FlowerBatch();
  const texLoader = new THREE.TextureLoader(manager);

  // Pol — och pushti-bej marmar, katta plitalar
  const floorTex = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#e2cdc7'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {           // dog'lar
      const g = ctx.createRadialGradient(rnd(0, w), rnd(0, h), 0, rnd(0, w), rnd(0, h), rnd(80, 260));
      g.addColorStop(0, `rgba(${rnd(0, 1) < 0.5 ? '240,228,224' : '208,186,180'},0.5)`);
      g.addColorStop(1, 'rgba(226,205,199,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 14; i++) {           // marmar tomirlari
      ctx.strokeStyle = `rgba(${rnd(0, 1) < 0.5 ? '190,165,160' : '255,250,248'},${rnd(0.18, 0.4)})`;
      ctx.lineWidth = rnd(0.6, 2.2);
      ctx.beginPath();
      let x = rnd(0, w), y = rnd(0, h);
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { const nx = x + rnd(-200, 200), ny = y + rnd(-200, 200); ctx.quadraticCurveTo(x + rnd(-80, 80), y + rnd(-80, 80), nx, ny); x = nx; y = ny; }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,180,175,0.55)'; ctx.lineWidth = 2;   // plita choklari
    ctx.strokeRect(0, 0, w, h);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 2.5, L / 2.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ map: floorTex, color: 0xe9dcd8, roughness: 0.2, metalness: 0.0, envMapIntensity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = cz;
  floor.receiveShadow = true;
  scene.add(floor);

  // Yo'lak (gilam) va oltin chiziqlar
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 27), new THREE.MeshStandardMaterial({ color: 0xdcaab6, roughness: 0.8 }));
  aisle.rotation.x = -Math.PI / 2; aisle.position.set(0, 0.006, -9.5);
  aisle.receiveShadow = true;
  scene.add(aisle);
  for (const sx of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 27), MAT.gold);
    line.position.set(sx * 1.22, 0.006, -9.5);
    scene.add(line);
  }

  // Shift
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), MAT.ceiling);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, cz);
  scene.add(ceil);
  // Shiftdagi yorug'lik chiziqlari (LED)
  const ledInset = 1.4;
  [[W - ledInset * 2, 0.08, 0.1, 0, ZB - ledInset], [W - ledInset * 2, 0.08, 0.1, 0, ZE + ledInset],
    [0.1, 0.08, L - ledInset * 2, -W / 2 + ledInset, cz], [0.1, 0.08, L - ledInset * 2, W / 2 - ledInset, cz]]
    .forEach(([w, h, d, x, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.led);
      m.position.set(x, H - 0.05, z); scene.add(m);
    });
  const coffer = new THREE.Group();
  frameRect(coffer, 0, 0, W - ledInset * 2 - 0.4, L - ledInset * 2 - 0.4, 0.14, 0.12);
  coffer.rotation.x = Math.PI / 2; coffer.position.set(0, H, cz);
  scene.add(coffer);

  // Devorlar
  const addWall = (w, x, z, ry) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), MAT.wall);
    m.position.y = H / 2; m.receiveShadow = true;
    g.add(m);
    // Plintus va karniz
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.06), MAT.molding);
    base.position.set(0, 0.11, 0.03); g.add(base);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.16), MAT.molding);
    crown.position.set(0, H - 0.15, 0.08); g.add(crown);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.02), MAT.led);
    strip.position.set(0, H - 0.34, 0.15); g.add(strip);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.05), MAT.molding);
    rail.position.set(0, 6.05, 0.025); g.add(rail);
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    return g;
  };
  const left = addWall(L, -W / 2, cz, Math.PI / 2);
  const right = addWall(L, W / 2, cz, -Math.PI / 2);
  const back = addWall(W, 0, ZB, Math.PI);
  const end = addWall(W, 0, ZE, 0);
  // Devor panellari
  for (const wall of [left, right]) {
    for (let i = 0; i < 10; i++) {
      const zc = ZB - 2 - i * 4;            // global z
      const lx = wall === left ? -(zc - cz) : (zc - cz);  // devor lokal x
      frameRect(wall, lx, 3.15, 3.3, 4.9);
      frameRect(wall, lx, 6.6, 3.3, 0.7, 0.04);
    }
  }
  for (const lx of [-5.6, 5.6]) { frameRect(end, lx, 3.15, 3.6, 4.9); frameRect(back, lx, 3.15, 3.6, 4.9); }
  frameRect(back, 0, 3.15, 3.4, 4.9);

  // ---- Ark va kalendar (old devor) ----
  const arch = new THREE.Shape();
  arch.moveTo(-2.7, 0); arch.lineTo(2.7, 0); arch.lineTo(2.7, 6.1); arch.lineTo(-2.7, 6.1); arch.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-1.95, 0); hole.lineTo(1.95, 0); hole.lineTo(1.95, 3.6);
  hole.absarc(0, 3.6, 1.95, 0, Math.PI, false);
  hole.lineTo(-1.95, 0);
  arch.holes.push(hole);
  const archMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.4, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 40 }), MAT.molding);
  archMesh.position.set(0, 0, ZE + 0.02);
  archMesh.castShadow = true;
  scene.add(archMesh);
  // Ark ichidagi yorug' chiziq
  const archPts = [];
  for (let i = 0; i <= 10; i++) archPts.push(new THREE.Vector3(-1.9, 0.2 + (3.4 * i) / 10, 0));
  for (let i = 1; i < 40; i++) {
    const a = Math.PI - (i / 40) * Math.PI;
    archPts.push(new THREE.Vector3(Math.cos(a) * 1.9, 3.6 + Math.sin(a) * 1.9, 0));
  }
  for (let i = 0; i <= 10; i++) archPts.push(new THREE.Vector3(1.9, 3.6 - (3.4 * i) / 10, 0));
  const archCurve = new THREE.CatmullRomCurve3(archPts);
  const archLed = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 160, 0.025, 6, false), MAT.led);
  archLed.position.set(0, 0, ZE + 0.45);
  scene.add(archLed);
  // Kalendar taxtasi
  const calTex = calendarTexture(cfg);
  const calBoard = new THREE.Group();
  const calW = 3.0, calH = 3.0 * 1100 / 1024;
  const calFrame = new THREE.Mesh(new THREE.BoxGeometry(calW + 0.16, calH + 0.16, 0.06), MAT.gold);
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(calW, calH), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.7, emissive: 0xffffff, emissiveMap: calTex, emissiveIntensity: 0.22 }));
  cal.position.z = 0.035;
  calBoard.add(calFrame, cal);
  calBoard.position.set(0, 2.55, ZE + 0.08);
  scene.add(calBoard);
  interactables.push({ type: 'calendar', label: '📅 To\'y sanasi', pos: new THREE.Vector3(0, 0, ZE + 3.5), radius: 0, object: calBoard });
  // Ark ustidagi sarlavha
  const titleTex = canvasTex(2048, 420, (ctx, w, h) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b3442';
    ctx.font = `700 170px ${SERIF}`;
    ctx.fillText(cfg.title, w / 2, 200);
    ctx.fillStyle = '#a58a5a';
    ctx.font = `500 54px ${SERIF}`;
    const sub = `${cfg.groom}  &  ${cfg.bride}`.toUpperCase().split('').join(String.fromCharCode(8202));
    ctx.fillText(sub, w / 2, 320);
  });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6 * 420 / 2048), new THREE.MeshBasicMaterial({ map: titleTex, transparent: true }));
  title.position.set(0, 6.95, ZE + 0.05);
  scene.add(title);

  // ---- Qandillar ----
  const lights = [];
  for (const [z, s, y] of [[-6, 1, H - 0.1], [-19, 1, H - 0.1], [ZE + 1.2, 0.45, 5.1]]) {
    const ch = chandelier(s);
    ch.position.set(0, y, z);
    scene.add(ch);
    animated.push((t) => { ch.rotation.y = t * 0.05; });
    if (s === 1) {
      const pl = new THREE.PointLight(0xffdcae, 14, 16, 1.6);
      pl.position.set(0, y - 1.6, z);
      scene.add(pl);
      lights.push(pl);
    }
  }

  // ---- Gul vazalari ----
  const stand = (x, z, h = 1.15, R = 0.5) => {
    const g = new THREE.Group();
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, h, 28, 1, true), MAT.gold);
    vase.position.y = h / 2; vase.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28), MAT.gold);
    top.position.y = h;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 28), MAT.gold);
    foot.position.y = 0.03;
    g.add(vase, top, foot);
    g.position.set(x, 0, z);
    scene.add(g);
    flowers.bouquet(new THREE.Vector3(x, h + R * 0.25, z), R);
    colliders.push({ x, z, r: 0.45 });
  };
  for (const z of [-6, -14, -22]) { stand(-3.3, z); stand(3.3, z); }
  for (const z of [-6, -22]) { stand(-7.1, z, 1.35, 0.55); stand(7.1, z, 1.35, 0.55); }
  stand(-7.1, -14, 1.35, 0.55);
  stand(-2.75, ZE + 1.0, 1.5, 0.6); stand(2.75, ZE + 1.0, 1.5, 0.6);
  stand(-6.9, 5.5, 1.3); stand(6.9, 5.5, 1.3);

  // ---- Yo'lak shamlari (fonarlar) ----
  const lanternZ = [0, -4, -8, -12, -16, -20];
  const lPos = [];
  lanternZ.forEach((z) => { lPos.push([-1.65, z], [1.65, z]); });
  const glass = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), lPos.length);
  const cap = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20), MAT.white, lPos.length);
  const candle = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }), lPos.length);
  const mtx = new THREE.Matrix4();
  lPos.forEach(([x, z], i) => {
    glass.setMatrixAt(i, mtx.makeTranslation(x, 0.17, z));
    cap.setMatrixAt(i, mtx.makeTranslation(x, 0.015, z));
    candle.setMatrixAt(i, mtx.makeTranslation(x, 0.1, z));
    const gl = glow(0.4, 0xffd9a8, 0.3);
    gl.position.set(x, 0.26, z);
    scene.add(gl);
    animated.push((t) => { gl.material.opacity = 0.26 + Math.sin(t * 7 + i * 1.7) * 0.06 + Math.sin(t * 13 + i) * 0.04; });
    colliders.push({ x, z, r: 0.22 });
  });
  scene.add(glass, cap, candle);

  // ---- Devordagi rasmlar ----
  const photos = (cfg.photos && cfg.photos.length ? cfg.photos : [0, 1, 2].map((i) => ({ url: placeholderPhoto(i, cfg), caption: `${cfg.groom} & ${cfg.bride}`, placeholder: true })))
    .slice(0, PHOTO_SLOTS.length);
  photos.forEach((ph, i) => {
    const [side, z] = PHOTO_SLOTS[i];
    const x = side * (W / 2 - 0.06);
    const g = new THREE.Group();
    g.position.set(x, 3.0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.08), MAT.gold);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.06 });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    pic.position.z = 0.045;
    const mount = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xfffcf6, roughness: 0.8 }));
    mount.position.z = 0.042;
    g.add(frame, mount, pic);
    const spot = glow(3.4, 0xfff3e0, 0.08);
    spot.position.set(0, 0.2, 0.3);
    g.add(spot);
    const setSize = (aspect) => {
      let w = 1.9, h = w / aspect;
      if (h > 2.5) { h = 2.5; w = h * aspect; }
      pic.scale.set(w, h, 1);
      mount.scale.set(w + 0.24, h + 0.24, 1);
      frame.scale.set(w + 0.4, h + 0.4, 1);
    };
    setSize(0.75);
    texLoader.load(ph.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      mat.map = tex; mat.emissiveMap = tex; mat.needsUpdate = true;
      setSize(tex.image.width / tex.image.height);
    });
    interactables.push({
      type: 'photo', index: i, url: ph.url, caption: ph.caption || '', label: '🖼 Rasmni ko\'rish',
      pos: new THREE.Vector3(side * (W / 2 - 1.2), 0, z), radius: 3.0, object: g,
      stand: new THREE.Vector2(side * (W / 2 - 2.7), z), look: new THREE.Vector3(x, 2.4, z),
    });
  });

  // ---- Kuyov (supachada) ----
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.42, 0.16, 48), MAT.white);
  plat.position.set(0, 0.08, ZE + 4.4); plat.receiveShadow = true; plat.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.025, 8, 64), MAT.gold);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.16, ZE + 4.4);
  scene.add(plat, ring);
  // Kuyov kostyumi va kelin ko'ylagi (manekenda)
  const suit = buildSuit(MAT.gold);
  suit.position.set(0.62, 0.16, ZE + 4.4);
  const gown = buildGown(MAT.gold);
  gown.position.set(-0.6, 0.16, ZE + 4.35);
  gown.rotation.y = 0.12; suit.rotation.y = -0.1;
  scene.add(suit, gown);
  colliders.push({ x: 0.62, z: ZE + 4.4, r: 0.32 }, { x: -0.6, z: ZE + 4.3, r: 0.62 });

  // ---- Postament (tagkursi) ----
  const pedestal = (x, z) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.75), MAT.white);
    b.position.y = 0.5; b.castShadow = true; b.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.85), MAT.gold);
    top.position.y = 1.02;
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.85), MAT.gold);
    bot.position.y = 0.03;
    g.add(b, top, bot);
    g.position.set(x, 0, z);
    scene.add(g);
    colliders.push({ x, z, r: 0.6 });
    return g;
  };

  // ---- Manzil (xarita belgisi) ----
  const pinX = -4.6, pinZ = -26.2;
  const pinBase = pedestal(pinX, pinZ);
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + 0.62 + (i / 24) * (Math.PI - 0.62);
    pts.push(new THREE.Vector2(Math.max(0.0001, 0.2 * Math.cos(a)), 0.44 + 0.2 * Math.sin(a)));
  }
  const pin = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xe3263b, roughness: 0.22, metalness: 0.05, emissive: 0x5a0610, emissiveIntensity: 0.6 });
  pin.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), red));
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 24), MAT.white);
  dot.rotation.x = Math.PI / 2; dot.position.y = 0.45; dot.scale.z = 1;
  pin.add(dot);
  pin.children[0].castShadow = true;
  pin.position.set(0, 1.25, 0);
  pinBase.add(pin);
  const pinGlow = glow(1.6, 0xff8a9a, 0.5);
  pinGlow.position.set(0, 1.7, 0);
  pinBase.add(pinGlow);
  animated.push((t) => { pin.position.y = 1.25 + Math.sin(t * 2) * 0.07; pin.rotation.y = t * 1.2; });
  interactables.push({
    type: 'address', label: '📍 Manzilni ko\'rish', pos: new THREE.Vector3(pinX, 0, pinZ), radius: 2.4, object: pinBase,
    stand: new THREE.Vector2(pinX + 0.4, pinZ + 2.1), look: new THREE.Vector3(pinX, 1.4, pinZ),
  });

  // ---- Tilak qutisi ----
  const boxX = 4.6, boxZ = -26.2;
  const wishBase = pedestal(boxX, boxZ);
  const box = new THREE.Group();
  const bmain = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.44), MAT.white);
  bmain.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.48), new THREE.MeshStandardMaterial({ color: 0xf3eee8, roughness: 0.4 }));
  lid.position.y = 0.2;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.04), new THREE.MeshBasicMaterial({ color: 0x333333 }));
  slot.position.y = 0.228;
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28), red);
  seal.rotation.x = Math.PI / 2; seal.position.set(0, 0.0, 0.225);
  // ichidan chiqib turgan xat
  const letter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.008), new THREE.MeshStandardMaterial({ color: 0xfff6f2, roughness: 0.6 }));
  letter.position.y = 0.3; letter.rotation.z = 0.08;
  box.add(bmain, lid, slot, seal, letter);
  box.position.y = 1.23;
  wishBase.add(box);
  const boxGlow = glow(1.8, 0xffe4ea, 0.45);
  boxGlow.position.y = 1.4;
  wishBase.add(boxGlow);
  animated.push((t) => { letter.position.y = 0.3 + Math.sin(t * 2.2) * 0.03; });
  interactables.push({
    type: 'wishes', label: '💌 Tilak qoldirish', pos: new THREE.Vector3(boxX, 0, boxZ), radius: 2.4, object: wishBase,
    stand: new THREE.Vector2(boxX - 0.4, boxZ + 2.1), look: new THREE.Vector3(boxX, 1.3, boxZ),
  });
  const badgeAnchor = new THREE.Vector3(boxX + 0.3, 1.75, boxZ);

  // ---- To'yona bankomati ----
  const atmX = 6.75, atmZ = -12.6;
  const atm = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf1ebe2, roughness: 0.45 });
  const abody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.7), cream);
  abody.position.y = 0.95; abody.castShadow = true; abody.receiveShadow = true;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.0, 0.06), MAT.gold);
  bezel.position.set(0, 1.25, 0.36);
  const screenTex = canvasTex(400, 300, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff6f8'); g.addColorStop(1, '#fde1e9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8365f'; heartPath(ctx, w / 2, 120, 70); ctx.fill();
    ctx.fillStyle = '#5b4060'; ctx.textAlign = 'center';
    ctx.font = `700 46px ${SERIF}`; ctx.fillText('To\'yona', w / 2, 245);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, 1.42, 0.395);
  const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.26), MAT.gold);
  keypad.position.set(0, 0.93, 0.45); keypad.rotation.x = 0.35;
  const keys = new THREE.Group();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.045), new THREE.MeshStandardMaterial({ color: 0x8a6a33, metalness: 0.6, roughness: 0.4 }));
    k.position.set((c - 1) * 0.1, 0.035, (r - 1.5) * 0.055);
    keys.add(k);
  }
  keypad.add(keys);
  const slotA = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  slotA.position.set(0.18, 0.72, 0.37);
  const signTex = canvasTex(512, 110, (ctx, w, h) => {
    ctx.fillStyle = '#d9b260'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3f2e12'; ctx.textAlign = 'center';
    ctx.font = `700 68px ${SERIF}`; ctx.fillText('TO\'YONA', w / 2, 80);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.22, 0.08), [MAT.gold, MAT.gold, MAT.gold, MAT.gold, new THREE.MeshStandardMaterial({ map: signTex, metalness: 0.5, roughness: 0.35 }), MAT.gold]);
  sign.position.set(0, 2.0, 0.05);
  atm.add(abody, bezel, screen, keypad, slotA, sign);
  const atmGlow = glow(2.2, 0xfff0d8, 0.35);
  atmGlow.position.set(0, 1.4, 0.6);
  atm.add(atmGlow);
  atm.position.set(atmX, 0, atmZ);
  atm.rotation.y = -Math.PI / 2;
  scene.add(atm);
  colliders.push({ x: atmX, z: atmZ, r: 0.75 });
  interactables.push({
    type: 'toyona', label: '💳 To\'yona yuborish', pos: new THREE.Vector3(atmX - 0.5, 0, atmZ), radius: 2.4, object: atm,
    stand: new THREE.Vector2(atmX - 2.3, atmZ), look: new THREE.Vector3(atmX, 1.3, atmZ),
  });

  // ---- Uchib yuruvchi gul barglari ----
  const PN = 170;
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf6b6c6, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x552030, emissiveIntensity: 0.25 });
  const petals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.035, 6).scale(1, 0.7, 1), petalMat, PN);
  const ps = Array.from({ length: PN }, () => ({
    x: rnd(-7.5, 7.5), y: rnd(0, H), z: rnd(ZE, ZB), sp: rnd(0.15, 0.35), ph: rnd(0, 6.28), rs: rnd(0.5, 2),
  }));
  scene.add(petals);
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pe = new THREE.Euler(), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  animated.push((t, dt) => {
    ps.forEach((p, i) => {
      p.y -= p.sp * dt;
      if (p.y < 0.02) { p.y = H - 0.5; p.x = rnd(-7.5, 7.5); p.z = rnd(ZE, ZB); }
      pe.set(t * p.rs + p.ph, t * p.rs * 0.7, p.ph);
      pq.setFromEuler(pe);
      pm.compose(pv.set(p.x + Math.sin(t * 0.6 + p.ph) * 0.4, p.y, p.z + Math.cos(t * 0.5 + p.ph) * 0.3), pq, one);
      petals.setMatrixAt(i, pm);
    });
    petals.instanceMatrix.needsUpdate = true;
  });

  flowers.build(scene, extras.flowerGLTF);

  // ---- Sayohat (tur) to'xtash joylari ----
  const tourStops = [];
  interactables.filter((it) => it.type === 'photo').sort((a, b) => b.pos.z - a.pos.z)
    .forEach((it) => tourStops.push(it));
  tourStops.splice(tourStops.findIndex((s) => s.pos.z < atmZ) === -1 ? tourStops.length : tourStops.findIndex((s) => s.pos.z < atmZ), 0,
    interactables.find((i) => i.type === 'toyona'));
  tourStops.push({ type: 'calendar', stand: new THREE.Vector2(0, ZE + 7.6), look: new THREE.Vector3(0, 2.4, ZE) });
  tourStops.push(interactables.find((i) => i.type === 'address'));
  tourStops.push(interactables.find((i) => i.type === 'wishes'));

  return {
    colliders, interactables, tourStops, badgeAnchor, lights,
    platform: { x: 0, z: ZE + 4.4, r: 1.36, h: 0.16 },
    update(t, dt) { animated.forEach((f) => f(t, dt)); },
  };
}
