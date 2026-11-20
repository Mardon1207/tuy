// Odam modellari (Quaternius, CC0): mehmon, kuyov va kelin.
// Yuzlar yaxshilangan (ko'z, qorachiq, kiprik, lab), kelinga libos, fata, toj va guldasta qo'shiladi.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FlowerBatch } from './flowers.js';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();

// Yassi qirralarni silliqlash (bir marta)
function smooth(scene) {
  const done = new Set();
  scene.traverse((o) => {
    if (!o.isSkinnedMesh || done.has(o.geometry)) return;
    let g = o.geometry.clone();
    g.deleteAttribute('normal');
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
    o.geometry = g;
    done.add(g);
  });
}

// Model turlari: suyak nomlari, o'lcham, ko'z joylashuvi (bosh suyagiga nisbatan, model o'qlarida)
const KINDS = {
  man: {
    scale: 0.96, clips: { idle: 'Idle_Neutral', walk: 'Walk', run: 'Run', wave: 'Wave' },
    eye: [0.044, 0.141, 0.066], eyeSize: [0.017, 0.0105, 0.006], iris: 0.0082, hide: ['Eye'],
    mouth: [0, -0.07, 0.02], eyeOff: [0, 0.001, 0.007], lip: 0xb27a6c, lipSize: [0.02, 0.0045, 0.006],
    bones: { ua: 'UpperArm', la: 'LowerArm', wr: 'Wrist' }, fat: 1.1,
  },
  woman: {
    scale: 0.37 * 0.97, clips: { idle: 'Female_Idle', clap: 'Female_Clapping', walk: 'Female_Walk' },
    eye: [0.041, 0.091, 0.063], eyeSize: [0.0155, 0.01, 0.0055], iris: 0.0078, hide: ['Eyes'], lashes: true,
    mouth: [0, -0.063, 0.02], eyeOff: [0, 0.0, 0.013], lip: 0xc8546a, lipSize: [0.017, 0.005, 0.007],
    bones: { ua: 'UpperArm', la: 'LowerArm', wr: 'Palm' }, fat: 1.12,
  },
};

export function prepare(gltf, kind) {
  smooth(gltf.scene);
  const K = KINDS[kind];
  const clips = {};
  for (const [k, n] of Object.entries(K.clips)) {
    clips[k] = gltf.animations.find((c) => c.name.endsWith('|' + n) || c.name === n);
  }
  if (!clips.idle) clips.idle = gltf.animations.find((c) => /idle/i.test(c.name)) || gltf.animations[0];
  return { gltf, kind, K, clips };
}

// Ob'ektni suyakka "dam olish holati" koordinatalarida biriktirish (oyoq y=0, yuz +z tomonga)
function attachRest(model, bone, obj) {
  model.updateMatrixWorld(true);
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  bone.matrixWorld.decompose(wp, wq, ws);
  const g = new THREE.Group();
  g.quaternion.copy(wq).invert();
  g.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
  const inner = new THREE.Group();
  inner.position.copy(wp).negate();
  inner.add(obj);
  g.add(inner);
  bone.add(g);
  return g;
}

function std(color, rough = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra));
}

// Yaxshilangan yuz: ko'z oqi, rangli qorachiq, ko'z qorachig'i, yaltiroq nuqta, qovoq/kiprik, lab.
// Ko'zlar modelning o'z (yashirilgan) ko'z nuqtalarini har kadrda kuzatib boradi.
function buildFace(K, irisColor) {
  const f = new THREE.Group();
  const sph = new THREE.SphereGeometry(1, 20, 14);
  const disc = new THREE.CircleGeometry(1, 20);
  const white = std(0xf6f2ee, 0.25), iris = std(irisColor, 0.3), pupil = std(0x0b0806, 0.2);
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lid = std(K.lashes ? 0x120c0a : 0x3a2a22, 0.6);
  const eyes = [];
  for (const s of [1, -1]) {
    const e = new THREE.Group();
    const [ex, ey, ez] = K.eyeSize;
    const sc = new THREE.Mesh(sph, white);
    sc.scale.set(ex, ey, ez);
    const ir = new THREE.Mesh(disc, iris);
    ir.scale.setScalar(K.iris); ir.position.set(0, -0.0004, ez + 0.0004);
    const pu = new THREE.Mesh(disc, pupil);
    pu.scale.setScalar(K.iris * 0.45); pu.position.set(0, -0.0004, ez + 0.0007);
    const sh = new THREE.Mesh(disc, shine);
    sh.scale.setScalar(K.iris * 0.25); sh.position.set(s * 0.0025, 0.0026, ez + 0.001);
    const lh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lid);
    lh.scale.set(ex * 2.15, K.lashes ? 0.0035 : 0.0022, 0.004);
    lh.position.set(0, ey * 0.92, ez * 0.6);
    lh.rotation.z = s * 0.1;
    e.add(sc, ir, pu, sh, lh);
    if (K.lashes) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lid);
      tip.scale.set(0.007, 0.0028, 0.003);
      tip.position.set(s * ex * 1.08, ey * 0.75, ez * 0.4);
      tip.rotation.z = s * 0.35;
      e.add(tip);
    }
    eyes.push(e);
    f.add(e);
  }
  const lip = new THREE.Mesh(sph, std(K.lip, 0.4));
  lip.scale.set(...K.lipSize);
  f.add(lip);
  return { group: f, eyes, lip };
}

// Kelin libosi, fata, soch turmagi, toj
function bridalSet(model, bones, headPos) {
  const satin = std(0xfbf8f4, 0.42, { side: THREE.DoubleSide });
  // Polgacha uzun yubka (belga biriktiriladi — tana bilan birga qimirlaydi)
  const prof = [[0.118, 1.03], [0.13, 0.97], [0.165, 0.86], [0.235, 0.62], [0.33, 0.36], [0.43, 0.12], [0.47, 0.02], [0.468, 0.0]]
    .map(([r, y]) => new THREE.Vector2(r, y)).reverse();
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), satin);
  skirt.scale.z = 0.88; skirt.castShadow = true;
  // Burmalar (yubka yuzasidagi to'lqinlar)
  const pos = skirt.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const a = Math.atan2(z, x), k = 1 + 0.035 * Math.sin(a * 14) * (1 - y);
    pos.setXYZ(i, x * k, y, z * k);
  }
  skirt.geometry.computeVertexNormals();
  // Bel kamari
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.012, 8, 40), std(0xe9d2b0, 0.3, { metalness: 0.4 }));
  belt.rotation.x = Math.PI / 2; belt.scale.y = 0.85; belt.position.y = 1.025;
  const sk = new THREE.Group();
  sk.add(skirt, belt);
  attachRest(model, bones.hips, sk);

  // Soch turmagi, fata va toj — boshga biriktiriladi
  const h = new THREE.Group();
  const hairM = std(0x3a2418, 0.55);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 14), hairM);
  bun.scale.set(1.1, 0.9, 0.85); bun.position.set(0, 0.17, -0.1);
  const veilProf = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; veilProf.push(new THREE.Vector2(0.05 + t * 0.3 + Math.sin(t * 3) * 0.02, 0.2 - t * 1.0)); }
  const veil = new THREE.Mesh(new THREE.LatheGeometry(veilProf, 40, Math.PI * 0.62, Math.PI * 1.76),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  veil.position.set(0, 0.0, -0.075);
  const tiara = new THREE.Group();
  const silver = std(0xf1ead9, 0.2, { metalness: 0.9 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.005, 6, 32, Math.PI), silver);
  tiara.add(band);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(i === 4 ? 0.011 : 0.007, 10, 8), std(0xffffff, 0.15));
    pearl.position.set(Math.cos(a) * 0.083, Math.sin(a) * 0.083 + (i === 4 ? 0.01 : 0), 0);
    tiara.add(pearl);
  }
  tiara.rotation.x = -0.35;
  tiara.position.set(0, 0.155, 0.0);
  h.add(bun, veil, tiara);
  h.position.copy(headPos);
  attachRest(model, bones.head, h);

  // Qo'ldagi guldasta (har kadrda kaftlar o'rtasiga qo'yiladi)
  const bq = new THREE.Group();
  const fb = new FlowerBatch();
  fb.bouquet(new THREE.Vector3(0, 0.05, 0), 0.11);
  fb.build(bq);
  const stems = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.16, 10), std(0x557a45, 0.6));
  stems.position.y = -0.06;
  const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 12), std(0xfbf2ec, 0.4));
  ribbon.position.y = -0.03;
  bq.add(stems, ribbon);
  return bq;
}

export function makePerson(base, opts = {}) {
  const K = base.K;
  const o = Object.assign({ suit: null, tie: null, shirt: 0xf3f1ee, skin: null, hair: null, dress: null, iris: 0x5a3a22, flower: false, bride: false }, opts);
  const model = SkeletonUtils.clone(base.gltf.scene);
  model.scale.setScalar(K.scale);
  const mats = new Map();
  model.traverse((m) => {
    if (!m.isMesh) return;
    m.castShadow = true;
    m.frustumCulled = false;
    const arr = Array.isArray(m.material) ? m.material : [m.material];
    const res = arr.map((mat) => {
      if (!mats.has(mat)) {
        const c = mat.clone();
        c.metalness = 0;
        c.roughness = /Black|Shoes/.test(mat.name) ? 0.35 : 0.6;
        if (mat.name === 'Suit' && o.suit != null) c.color.setHex(o.suit);
        if (mat.name === 'Tie' && o.tie != null) c.color.setHex(o.tie);
        if (mat.name === 'White') c.color.setHex(o.shirt);
        if (mat.name === 'Skin' && o.skin != null) c.color.setHex(o.skin);
        if (/Hair/.test(mat.name) && o.hair != null) c.color.setHex(o.hair);
        if (mat.name === 'Dress' && o.dress != null) { c.color.setHex(o.dress); c.roughness = 0.42; }
        if (mat.name === 'Shoes' && o.bride) c.color.setHex(0xf3ece4);
        if (K.hide.includes(mat.name)) c.visible = false;
        mats.set(mat, c);
      }
      return mats.get(mat);
    });
    m.material = Array.isArray(m.material) ? res : res[0];
  });
  const root = new THREE.Group();
  root.add(model);

  const bone = (n) => model.getObjectByName(n);
  const B = K.bones;
  const bones = {
    head: bone('Head'), neck: bone('Neck'), hips: bone('Hips'), chest: bone('Chest') || bone('Torso'),
    uaL: bone(B.ua + 'L'), laL: bone(B.la + 'L'), wrL: bone(B.wr + 'L'),
    uaR: bone(B.ua + 'R'), laR: bone(B.la + 'R'), wrR: bone(B.wr + 'R'),
  };

  // Yuz: modelning ko'z uchlarini topib, yangi ko'zlarni ularga bog'laymiz
  model.updateMatrixWorld(true);
  const headPos = bones.head.getWorldPosition(new THREE.Vector3());
  const face = buildFace(K, o.iris);
  root.add(face.group);
  let eyeMesh = null;
  model.traverse((m) => { if (m.isSkinnedMesh && K.hide.includes((Array.isArray(m.material) ? m.material[0] : m.material).name)) eyeMesh = m; });
  const eyeIdx = [[], []];
  if (eyeMesh) {
    const pa = eyeMesh.geometry.attributes.position, tv = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      tv.fromBufferAttribute(pa, i).applyMatrix4(eyeMesh.matrixWorld);
      eyeIdx[tv.x > 0 ? 0 : 1].push(i);
    }
  }
  face.mesh = eyeMesh; face.idx = eyeIdx;

  let bouquet = null;
  if (o.bride) { bouquet = bridalSet(model, bones, headPos); root.add(bouquet); }

  // Ozgina to'ladroq gavda
  model.scale.set(K.scale * K.fat, K.scale, K.scale * K.fat);

  // Kuyov uchun ko'krakdagi oq gul
  if (o.flower) {
    const flower = new THREE.Group();
    const petal = std(0xffffff, 0.6);
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), petal);
      p.position.set(Math.cos(i) * 0.012, Math.sin(i * 2.1) * 0.006, Math.sin(i) * 0.012);
      flower.add(p);
    }
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4).scale(0.5, 1.4, 0.3), std(0x3f6b3c));
    leaf.position.set(0.012, -0.022, 0);
    flower.add(leaf);
    flower.position.set(0.1, 1.42, 0.17);
    root.add(flower);
  }

  const mixer = new THREE.AnimationMixer(model);
  const act = {};
  for (const [k, clip] of Object.entries(base.clips)) {
    if (!clip) continue;
    act[k] = mixer.clipAction(clip);
    if (k === 'wave' || k === 'clap') { act[k].setLoop(k === 'clap' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); continue; }
    act[k].play();
    act[k].setEffectiveWeight(k === 'idle' ? 1 : 0);
  }
  if (act.idle) act.idle.time = Math.random() * act.idle.getClip().duration;
  root.userData.man = { mixer, act, bones, w: 0, runW: 0, gestT: 0, gest: null, bouquet, bride: o.bride, face, K };
  return root;
}

// Bir martalik imo-ishora: 'wave' (qo'l silkitish) yoki 'clap' (qarsak), dur — soniya
export function gesture(p, name, dur) {
  const u = p.userData.man;
  const a = u.act[name];
  if (!a || u.gestT > 0) return;
  a.reset().play();
  u.gest = name;
  u.gestT = dur || a.getClip().duration;
  u.gestDur = u.gestT;
}

export function updatePerson(p, dt, speed) {
  const u = p.userData.man;
  const target = THREE.MathUtils.clamp(speed / 1.4, 0, 1);
  u.w += (target - u.w) * Math.min(1, dt * 8);
  const runT = THREE.MathUtils.clamp((speed - 2.2) / 1.0, 0, 1);
  u.runW += (runT - u.runW) * Math.min(1, dt * 6);
  let gw = 0;
  if (u.gestT > 0) {
    u.gestT -= dt;
    const t = u.gestDur - u.gestT;
    gw = Math.max(0, Math.min(1, t / 0.3, u.gestT / 0.3)) * (1 - u.w);
    u.act[u.gest].setEffectiveWeight(gw);
    if (u.gestT <= 0) { u.act[u.gest].stop(); u.gest = null; }
  }
  const rest = 1 - gw;
  u.act.idle.setEffectiveWeight((1 - u.w) * rest);
  if (u.act.walk) {
    u.act.walk.setEffectiveWeight(u.w * (1 - u.runW) * rest);
    u.act.walk.timeScale = THREE.MathUtils.clamp(speed / 1.45, 0.7, 1.6);
  }
  if (u.act.run) {
    u.act.run.setEffectiveWeight(u.w * u.runW * rest);
    u.act.run.timeScale = THREE.MathUtils.clamp(speed / 3.4, 0.8, 1.3);
  }
  u.mixer.update(dt);
  p.updateMatrixWorld(true);
  placeFace(p, u);

  // Kelin guldastani ikki qo'llab ushlab turadi (qarsak chalayotganda emas)
  if (u.bride && u.bouquet) {
    const hold = 1 - gw;
    reach(p, 1, new THREE.Vector3(0.17, 0.98, 0.07), new THREE.Vector3(0.035, 0.9, 0.2), hold);
    reach(p, -1, new THREE.Vector3(-0.17, 0.98, 0.07), new THREE.Vector3(-0.035, 0.9, 0.2), hold);
    u.bones.wrL.getWorldPosition(v1);
    u.bones.wrR.getWorldPosition(v2);
    v1.add(v2).multiplyScalar(0.5);
    u.bouquet.position.copy(p.worldToLocal(v1)).add(new THREE.Vector3(0, 0.04, 0.03));
    u.bouquet.visible = hold > 0.5;
  }
}

// Yangi ko'zlar va labni modelning hozirgi (animatsiyadagi) ko'z nuqtalariga qo'yish
const fv = new THREE.Vector3(), fs = new THREE.Vector3();
function placeFace(p, u) {
  const f = u.face;
  if (!f.mesh) { f.group.visible = false; return; }
  const mid = new THREE.Vector3();
  for (let k = 0; k < 2; k++) {
    fs.set(0, 0, 0);
    for (const i of f.idx[k]) { f.mesh.getVertexPosition(i, fv); fs.add(fv); }
    fs.divideScalar(Math.max(1, f.idx[k].length)).applyMatrix4(f.mesh.matrixWorld);
    p.worldToLocal(fs);
    mid.add(fs);
    f.eyes[k].position.copy(fs).add(new THREE.Vector3(...(u.K.eyeOff || [0, 0, 0])));
  }
  mid.multiplyScalar(0.5);
  f.lip.position.copy(mid).add(new THREE.Vector3(...u.K.mouth));
}

// Suyakni shunday buradiki, uning bolasi targetWorld nuqtasiga qarasin
function aim(bone, child, targetWorld, weight) {
  if (!bone || !child || weight <= 0) return;
  bone.getWorldPosition(v1);
  child.getWorldPosition(v2);
  const cur = v2.sub(v1).normalize();
  const want = v3.copy(targetWorld).sub(v1).normalize();
  q1.setFromUnitVectors(cur, want);
  bone.getWorldQuaternion(q2);
  bone.parent.getWorldQuaternion(q3);
  const local = q3.invert().multiply(q1.multiply(q2));
  bone.quaternion.slerp(local, weight);
  bone.updateMatrixWorld(true);
}

// side: 1 = chap qo'l, -1 = o'ng qo'l. elbowLocal — tirsak nishoni (odamning o'z koordinatasida),
// hand — kaft nishoni (handIsWorld=true bo'lsa dunyo koordinatasida)
export function reach(p, side, elbowLocal, hand, weight, handIsWorld = false) {
  if (weight <= 0) return;
  const b = p.userData.man.bones;
  p.updateMatrixWorld(true);
  const ua = side > 0 ? b.uaL : b.uaR, la = side > 0 ? b.laL : b.laR, wr = side > 0 ? b.wrL : b.wrR;
  aim(ua, la, p.localToWorld(elbowLocal.clone()), weight);
  aim(la, wr, handIsWorld ? hand : p.localToWorld(hand.clone()), weight);
}

// Qo'l berib ko'rishish: o'ng qo'l handWorld nuqtasiga cho'ziladi, bosh ozgina egiladi
export function applyHandshake(p, handWorld, weight) {
  if (weight <= 0) return;
  reach(p, -1, new THREE.Vector3(-0.2, 1.06, 0.16), handWorld, weight, true);
  const b = p.userData.man.bones;
  if (b.head) { b.head.rotateX(0.1 * weight); b.head.updateMatrixWorld(true); }
}
