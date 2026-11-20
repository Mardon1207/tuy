// Haqiqiyga o'xshash atirgul guldastalari: har bir gul gulbarglardan yig'iladi (InstancedMesh — tez ishlaydi).
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const Y = new THREE.Vector3(0, 1, 0);

// Gulbarg: pasti ingichka, tepasi yumaloq, chetlari ichkariga qayrilgan, uchi tashqariga egilgan
function petalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 6, 7);
  const p = g.attributes.position;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;
    const w = 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.55) / 0.55, 2))) * (0.75 + 0.25 * v);
    const x = u * 2 * w;
    const z = 0.9 * x * x - 0.28 * v * v * v + 0.06 * Math.sin(u * 9) * v;
    p.setXYZ(i, x, v, z);
    const shade = 0.72 + 0.28 * THREE.MathUtils.smoothstep(v, 0.0, 0.55);
    col.push(shade, shade * (0.97 + 0.03 * v), shade * (0.9 + 0.1 * v));
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Barg: o'rtasidan bukilgan, uchi o'tkir
function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 6);
  const p = g.attributes.position;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;
    const w = 0.42 * Math.pow(Math.sin(Math.PI * v), 0.8) * (1 - 0.35 * v);
    const x = u * 2 * w;
    p.setXYZ(i, x, v, 0.5 * Math.abs(x) - 0.25 * v * v);
    const s = 0.8 + 0.2 * (1 - Math.abs(u) * 2);
    col.push(s, s, s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Bitta atirgul ichidagi gulbarglar joylashuvi (gul o'lchami 1 birlik)
const ROSE = (() => {
  const rings = [
    { n: 5, s: 0.42, tilt: 0.08, r: 0.02, y: 0.05 },
    { n: 6, s: 0.62, tilt: 0.42, r: 0.06, y: 0.0 },
    { n: 8, s: 0.82, tilt: 0.95, r: 0.1, y: -0.05 },
  ];
  const out = [];
  const m = new THREE.Matrix4(), rx = new THREE.Matrix4(), ry = new THREE.Matrix4(), sc = new THREE.Matrix4();
  rings.forEach((rg, ri) => {
    const off = ri * 0.7;
    for (let i = 0; i < rg.n; i++) {
      const a = (i / rg.n) * Math.PI * 2 + off;
      ry.makeRotationY(a + Math.PI);
      rx.makeRotationX(-rg.tilt);
      sc.makeScale(rg.s, rg.s, rg.s);
      m.makeTranslation(Math.sin(a) * rg.r, rg.y, Math.cos(a) * rg.r).multiply(ry).multiply(rx).multiply(sc);
      out.push({ m: m.clone(), shade: 0.86 + ri * 0.07 });
    }
  });
  return out;
})();

const PALETTE = [0xf7d7de, 0xf2b8c6, 0xfdf3f0, 0xfbe6e9, 0xe995ab, 0xf6c9d3, 0xfffaf6, 0xf0a7b9];

export class FlowerBatch {
  constructor() {
    this.petals = []; this.leaves = []; this.tiny = []; this.models = []; this.cores = [];
  }

  bouquet(c, R = 0.5) {
    this.models.push({ c: c.clone(), R });
    this.cores.push([new THREE.Matrix4().compose(c, new THREE.Quaternion(), new THREE.Vector3(R * 0.86, R * 0.68, R * 0.86)), new THREE.Color(0x2f4f2c)]);
    const bm = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const count = 64;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      // Fibonachchi bo'yicha gumbaz sirtiga teng taqsimlash
      const yy = 1 - (i / (count - 1)) * 1.25;
      const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
      const th = i * golden;
      n.set(Math.cos(th) * rad, yy, Math.sin(th) * rad).normalize();
      p.copy(n).multiply(new THREE.Vector3(R, R * 0.78, R)).add(c);
      n.x += rnd(-0.15, 0.15); n.z += rnd(-0.15, 0.15); n.normalize();
      q.setFromUnitVectors(Y, n).multiply(qr.setFromAxisAngle(Y, rnd(0, 6.28)));
      const k = rnd(0.11, 0.15) * R / 0.5;
      bm.compose(p, q, s.set(k, k * rnd(0.85, 1), k));
      const color = new THREE.Color(PALETTE[(Math.random() * PALETTE.length) | 0]);
      for (const pt of ROSE) {
        this.petals.push([bm.clone().multiply(pt.m), color.clone().multiplyScalar(pt.shade)]);
      }
    }
    // Barglar
    for (let i = 0; i < 34; i++) {
      const th = rnd(0, Math.PI * 2), ph = rnd(0.5, Math.PI * 0.62);
      n.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      p.copy(n).multiplyScalar(R * rnd(0.72, 0.9)).add(c);
      p.y -= R * 0.05;
      q.setFromUnitVectors(Y, n).multiply(qr.setFromAxisAngle(Y, rnd(-0.6, 0.6)));
      const k = rnd(0.16, 0.24) * R / 0.5;
      bm.compose(p, q, s.set(k, k, k));
      this.leaves.push([bm.clone(), new THREE.Color(Math.random() < 0.5 ? 0x4a7a46 : 0x3a6640)]);
    }
    // Gipsofila (mayda oq gullar)
    for (let i = 0; i < 70; i++) {
      const th = rnd(0, Math.PI * 2), ph = rnd(0, Math.PI * 0.7);
      n.set(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.8, Math.sin(ph) * Math.sin(th));
      p.copy(n).multiplyScalar(R * rnd(1.0, 1.15)).add(c);
      const k = rnd(0.008, 0.014);
      bm.compose(p, q.identity(), s.set(k, k, k));
      this.tiny.push([bm.clone(), new THREE.Color(0xffffff)]);
    }
  }

  build(scene, flowerGLTF) {
    if (flowerGLTF) {
      // Admin yuklagan 3D gul modeli har bir vazaga qo'yiladi
      const src = flowerGLTF.scene;
      const box = new THREE.Box3().setFromObject(src);
      const size = box.getSize(new THREE.Vector3());
      for (const { c, R } of this.models) {
        const m = SkeletonUtils.clone(src);
        const k = (R * 2.2) / Math.max(size.x, size.z, size.y * 0.8);
        m.scale.setScalar(k);
        m.position.set(c.x - (box.min.x + size.x / 2) * k, c.y - R * 0.45 - box.min.y * k, c.z - (box.min.z + size.z / 2) * k);
        m.rotation.y = rnd(0, 6.28);
        m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(m);
      }
      return;
    }
    const mk = (list, geo, mat) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(([m, col], i) => { im.setMatrixAt(i, m); im.setColorAt(i, col); });
      im.castShadow = true;
      scene.add(im);
    };
    mk(this.petals, petalGeometry(), new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, emissive: 0x2a1418, emissiveIntensity: 0.25,
    }));
    mk(this.leaves, leafGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }));
    mk(this.cores, new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    mk(this.tiny, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x444444 }));
  }
}
