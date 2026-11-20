// Kostyum kiygan odam: bo'g'imlari bor (son, tizza, yelka, tirsak...) va tabiiy yuradi.
import * as THREE from 'three';

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

function mesh(g, m, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  return o;
}

export function createPerson(opts = {}) {
  const o = Object.assign({
    skin: 0xf0c8a8, hair: 0x2a1c14, suit: 0x26324f, pants: null, shirt: 0xffffff,
    tie: 0xb0284a, shoes: 0x18181c, bowtie: false, pocket: 0xffffff,
  }, opts);
  const M = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const mSkin = M(o.skin, 0.55), mHair = M(o.hair, 0.75), mSuit = M(o.suit, 0.6);
  const mPants = M(o.pants ?? o.suit, 0.62), mShirt = M(o.shirt, 0.5), mTie = M(o.tie, 0.35);
  const mShoe = M(o.shoes, 0.25, 0.15), mDark = M(0x1a1412, 0.4), mLip = M(0xc07a72, 0.6);

  const cap = (r, l) => geo(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 14));
  const sph = (r) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 20, 14));

  const root = new THREE.Group();
  const body = new THREE.Group();          // tebranish (bob) uchun
  root.add(body);

  // ---- Bel (hips) ----
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);
  const pelvis = mesh(sph(0.15), mPants);
  pelvis.scale.set(1.05, 0.6, 0.72); pelvis.position.y = -0.04;
  hips.add(pelvis);
  // Pidjak etagi
  const skirt = mesh(geo('skirt', () => new THREE.CylinderGeometry(0.17, 0.182, 0.3, 24, 1, true)), mSuit);
  skirt.material = mSuit.clone(); skirt.material.side = THREE.DoubleSide;
  skirt.scale.z = 0.66; skirt.position.y = 0.02;
  hips.add(skirt);

  // ---- Tana (spine) ----
  const spine = new THREE.Group();
  spine.position.y = 0.1;
  hips.add(spine);
  const chest = mesh(geo('chest', () => new THREE.CylinderGeometry(0.205, 0.168, 0.5, 24)), mSuit);
  chest.scale.z = 0.64; chest.position.y = 0.25;
  spine.add(chest);
  // Yelka "qopqog'i"
  const shoulderTop = mesh(geo('shTop', () => new THREE.SphereGeometry(0.205, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mSuit);
  shoulderTop.scale.set(1, 0.32, 0.64); shoulderTop.position.y = 0.5;
  spine.add(shoulderTop);
  for (const sx of [-1, 1]) {
    const sh = mesh(sph(0.064), mSuit);
    sh.position.set(sx * 0.195, 0.465, 0); sh.scale.set(1, 0.85, 1.05);
    spine.add(sh);
  }
  // Ko'ylak (V shakl), galstuk, tugmalar
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.075, 0.13); vShape.lineTo(0.075, 0.13); vShape.lineTo(0, -0.12); vShape.closePath();
  const shirtV = new THREE.Mesh(geo('shirtV', () => new THREE.ShapeGeometry(vShape)), mShirt);
  shirtV.position.set(0, 0.4, 0.128); shirtV.rotation.x = -0.08;
  spine.add(shirtV);
  // Lattsalar (yoqa)
  for (const sx of [-1, 1]) {
    const lap = new THREE.Shape();
    lap.moveTo(0, 0.0); lap.lineTo(sx * 0.077, 0.255); lap.lineTo(sx * 0.125, 0.235); lap.lineTo(sx * 0.098, 0.165); lap.lineTo(sx * 0.03, 0.0); lap.closePath();
    const l = new THREE.Mesh(new THREE.ShapeGeometry(lap), M(o.suit, 0.35));
    l.material.color.offsetHSL(0, 0, -0.04);
    l.material.side = THREE.DoubleSide;
    l.position.set(0, 0.275, 0.133); l.rotation.x = -0.08;
    spine.add(l);
  }
  if (o.bowtie) {
    const bt = mesh(geo('bow', () => new THREE.BoxGeometry(0.1, 0.035, 0.02)), mTie, false);
    bt.position.set(0, 0.515, 0.13);
    spine.add(bt);
  } else {
    const knot = mesh(geo('knot', () => new THREE.BoxGeometry(0.03, 0.03, 0.02)), mTie, false);
    knot.position.set(0, 0.51, 0.132);
    const tie = mesh(geo('tie', () => new THREE.BoxGeometry(0.036, 0.2, 0.012)), mTie, false);
    tie.position.set(0, 0.39, 0.136); tie.rotation.x = -0.08;
    spine.add(knot, tie);
  }
  for (const by of [0.2, 0.11]) {
    const b = mesh(sph(0.011), mDark, false);
    b.position.set(0, by, 0.112);
    spine.add(b);
  }
  // Ko'krak cho'ntagidagi ro'molcha
  const pocket = mesh(geo('pocket', () => new THREE.BoxGeometry(0.055, 0.025, 0.01)), M(o.pocket, 0.5), false);
  pocket.position.set(0.1, 0.39, 0.127);
  spine.add(pocket);

  // ---- Bo'yin va bosh ----
  const collar = mesh(geo('collar', () => new THREE.CylinderGeometry(0.068, 0.075, 0.06, 16)), mShirt);
  collar.position.y = 0.545;
  spine.add(collar);
  const neck = mesh(geo('neck', () => new THREE.CylinderGeometry(0.052, 0.058, 0.1, 14)), mSkin);
  neck.position.y = 0.6;
  spine.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.64;
  spine.add(head);
  const skull = mesh(sph(0.105), mSkin);
  skull.scale.set(0.93, 1.12, 1.0); skull.position.y = 0.1;
  head.add(skull);
  const jaw = mesh(sph(0.08), mSkin);
  jaw.scale.set(0.95, 0.8, 0.95); jaw.position.set(0, 0.04, 0.02);
  head.add(jaw);
  const hair = mesh(geo('hair', () => new THREE.SphereGeometry(0.112, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52)), mHair);
  hair.scale.set(0.95, 1.08, 1.04); hair.position.set(0, 0.125, -0.008); hair.rotation.x = -0.32;
  head.add(hair);
  const hairBack = mesh(sph(0.1), mHair);
  hairBack.scale.set(0.95, 0.9, 0.7); hairBack.position.set(0, 0.11, -0.04);
  head.add(hairBack);
  for (const sx of [-1, 1]) {
    const ear = mesh(sph(0.022), mSkin, false);
    ear.scale.set(0.5, 1, 0.8); ear.position.set(sx * 0.097, 0.1, 0);
    const eyeW = mesh(sph(0.014), M(0xffffff, 0.3), false);
    eyeW.position.set(sx * 0.036, 0.115, 0.088); eyeW.scale.set(1.2, 0.8, 0.5);
    const eye = mesh(sph(0.0095), mDark, false);
    eye.position.set(sx * 0.036, 0.115, 0.094);
    const brow = mesh(geo('brow', () => new THREE.BoxGeometry(0.035, 0.008, 0.01)), mHair, false);
    brow.position.set(sx * 0.037, 0.138, 0.094); brow.rotation.z = sx * -0.12;
    head.add(ear, eyeW, eye, brow);
  }
  const nose = mesh(sph(0.016), mSkin, false);
  nose.scale.set(0.8, 1.2, 1); nose.position.set(0, 0.09, 0.104);
  const mouth = mesh(geo('mouth', () => new THREE.BoxGeometry(0.034, 0.006, 0.006)), mLip, false);
  mouth.position.set(0, 0.055, 0.093);
  head.add(nose, mouth);

  // ---- Qo'llar ----
  const arms = [];
  for (const sx of [1, -1]) {           // 1 = chap (+x), -1 = o'ng
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.215, 0.46, 0);
    spine.add(shoulder);
    const upper = mesh(cap(0.05, 0.23), mSuit);
    upper.position.y = -0.15;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const fore = mesh(cap(0.045, 0.2), mSuit);
    fore.position.y = -0.13;
    elbow.add(fore);
    const cuff = mesh(geo('cuff', () => new THREE.CylinderGeometry(0.044, 0.044, 0.03, 12)), mShirt, false);
    cuff.position.y = -0.27;
    elbow.add(cuff);
    const hand = mesh(sph(0.045), mSkin);
    hand.scale.set(0.75, 1.25, 0.6); hand.position.y = -0.32;
    elbow.add(hand);
    arms.push({ shoulder, elbow, side: sx });
  }

  // ---- Oyoqlar ----
  const legs = [];
  for (const sx of [1, -1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.092, -0.03, 0);
    hips.add(hip);
    const thigh = mesh(cap(0.074, 0.3), mPants);
    thigh.position.y = -0.21;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);
    const shin = mesh(cap(0.06, 0.32), mPants);
    shin.position.y = -0.2;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.43;
    knee.add(ankle);
    const shoe = mesh(geo('shoe', () => {
      const g = new THREE.CapsuleGeometry(0.048, 0.16, 4, 10);
      g.rotateX(Math.PI / 2);
      return g;
    }), mShoe);
    shoe.scale.set(1.05, 0.75, 1);
    shoe.position.set(0, -0.034, 0.05);
    ankle.add(shoe);
    legs.push({ hip, knee, ankle, side: sx });
  }

  root.traverse((c) => { if (c.isMesh) c.receiveShadow = false; });
  root.userData.rig = { body, hips, spine, head, arms, legs, chest, phase: 0, walkW: 0, t: Math.random() * 10 };
  return root;
}

// speed — m/s. Har kadrda chaqiriladi.
export function updatePerson(person, dt, speed) {
  const r = person.userData.rig;
  r.t += dt;
  const target = THREE.MathUtils.clamp(speed / 1.5, 0, 1.25);
  r.walkW += (target - r.walkW) * Math.min(1, dt * 7);
  const w = Math.min(1, r.walkW);
  const run = Math.max(0, r.walkW - 1) * 4;          // 0..1 yugurish qo'shimchasi
  r.phase += dt * speed * 4.4;
  const s = Math.sin(r.phase), c = Math.cos(r.phase);
  const A = 0.5 + run * 0.25;
  const t = r.t;

  // Oyoqlar
  const [L, R] = r.legs;
  const thL = -s * A * w, thR = s * A * w;
  const knL = (0.05 + Math.max(0, c) * (0.95 + run * 0.4)) * w;
  const knR = (0.05 + Math.max(0, -c) * (0.95 + run * 0.4)) * w;
  L.hip.rotation.x = thL; R.hip.rotation.x = thR;
  L.knee.rotation.x = knL; R.knee.rotation.x = knR;
  L.ankle.rotation.x = -(thL + knL) * 0.75 + Math.max(0, -thL) * 0.3 * w;
  R.ankle.rotation.x = -(thR + knR) * 0.75 + Math.max(0, -thR) * 0.3 * w;

  // Qo'llar (oyoqqa teskari)
  const idle = 1 - w;
  const breathe = Math.sin(t * 1.7);
  const [aL, aR] = r.arms;
  aL.shoulder.rotation.x = s * (0.42 + run * 0.3) * w + breathe * 0.015 * idle;
  aR.shoulder.rotation.x = -s * (0.42 + run * 0.3) * w - breathe * 0.015 * idle;
  aL.shoulder.rotation.z = 0.085 + 0.02 * w + Math.sin(t * 1.1) * 0.012 * idle;
  aR.shoulder.rotation.z = -0.085 - 0.02 * w - Math.sin(t * 1.1 + 1) * 0.012 * idle;
  aL.elbow.rotation.x = -(0.12 + 0.2 * w + Math.max(0, -s) * 0.35 * w + run * 0.7);
  aR.elbow.rotation.x = -(0.12 + 0.2 * w + Math.max(0, s) * 0.35 * w + run * 0.7);

  // Tana harakati
  r.body.position.y = (Math.abs(c) * 0.04 - 0.025) * w;
  r.hips.rotation.y = s * 0.1 * w;
  r.hips.rotation.z = s * 0.025 * w;
  r.spine.rotation.y = -s * 0.14 * w;
  r.spine.rotation.x = (0.05 + run * 0.12) * w + breathe * 0.012 * idle;
  r.chest.scale.x = 1 + breathe * 0.012 * idle;
  r.head.rotation.y = Math.sin(t * 0.37) * 0.22 * idle + s * 0.05 * w;
  r.head.rotation.x = -0.04 * w + Math.sin(t * 0.5) * 0.03 * idle;
}

// ---- Admin yuklagan GLB model uchun (ixtiyoriy) ----
export function wrapGLTF(gltf) {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y || 1;
  const k = 1.76 / h;
  model.scale.setScalar(k);
  model.position.y = -box.min.y * k;
  model.traverse((c) => { if (c.isMesh) { c.castShadow = true; } });
  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const find = (re) => gltf.animations.find((a) => re.test(a.name));
  const idleClip = find(/idle|stand/i) || gltf.animations[0];
  const walkClip = find(/walk/i) || gltf.animations[1] || idleClip;
  const runClip = find(/run/i);
  const idle = idleClip && mixer.clipAction(idleClip);
  const walk = walkClip && mixer.clipAction(walkClip);
  const runA = runClip && mixer.clipAction(runClip);
  [idle, walk, runA].forEach((a) => { if (a) { a.play(); a.setEffectiveWeight(0); } });
  if (idle) idle.setEffectiveWeight(1);
  root.userData.gltf = { mixer, idle, walk, run: runA, w: 0 };
  return root;
}

export function updateGLTF(person, dt, speed) {
  const g = person.userData.gltf;
  const target = THREE.MathUtils.clamp(speed / 1.5, 0, 1);
  g.w += (target - g.w) * Math.min(1, dt * 7);
  const runW = g.run ? THREE.MathUtils.clamp((speed - 2.4) / 1.2, 0, 1) : 0;
  if (g.idle) g.idle.setEffectiveWeight(1 - g.w);
  if (g.walk) { g.walk.setEffectiveWeight(g.w * (1 - runW)); g.walk.timeScale = Math.max(0.6, speed / 1.5); }
  if (g.run) g.run.setEffectiveWeight(g.w * runW);
  g.mixer.update(dt);
}
