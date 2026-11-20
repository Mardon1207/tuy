// Kuyov kostyumi (smoking: pidjak, shim, ko'ylak, kapalak galstuk, tufli) va kelin ko'ylagi
// (korset, to'rli bezak, keng yubka, shleyf, fata) — manekenga kiydirilgan holda.
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- Mato teksturalari (canvasda yasaladi) ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Jun mato to'qimasi (normal map)
function weaveNormal(rep = 18) {
  const t = canvasTex(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const tw = Math.sin((x + y) * 0.9) * 18 + rnd(-10, 10);
      img.data[i] = 128 + tw; img.data[i + 1] = 128 + Math.sin((x - y) * 0.9) * 14 + rnd(-8, 8); img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, false);
  t.repeat.set(rep, rep);
  return t;
}

// Kelin ko'ylagi uchun to'r (dantel) naqshi — shaffof fonda gullar
function laceTexture() {
  const t = canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    // nozik to'r
    ctx.lineWidth = 0.7;
    for (let i = -h; i < w; i += 9) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    // gullar
    for (let k = 0; k < 26; k++) {
      const cx = rnd(0, w), cy = rnd(0, h), r = rnd(10, 26);
      ctx.lineWidth = 2;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.45, r * 0.22, a, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2); ctx.fill();
      // barg-shoxchalar
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx + r, cy);
      ctx.quadraticCurveTo(cx + r * 1.8, cy - r, cx + r * 2.4, cy + rnd(-r, r)); ctx.stroke();
    }
  });
  t.repeat.set(3, 2);
  return t;
}

// Tyulda yaltiraydigan mayda toshlar
function sparkleTexture() {
  const t = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const a = rnd(0.4, 1);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(rnd(0, w), rnd(0, h), rnd(0.6, 1.8), 0, Math.PI * 2); ctx.fill();
    }
  });
  t.repeat.set(4, 3);
  return t;
}

const phys = (o) => new THREE.MeshPhysicalMaterial(o);

// Profil bo'yicha aylanma sirt (r,y) — pastdan yuqoriga
function lathe(points, seg = 64, phiStart = 0, phiLen = Math.PI * 2) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
}

// ---------- Maneken (do'kondagi kabi) ----------
function dressForm(neckY, mat) {
  const g = new THREE.Group();
  const linen = phys({ color: 0xe9dfd0, roughness: 0.85, sheen: 0.4, sheenColor: 0xffffff });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 24), linen);
  neck.position.y = neckY + 0.04;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.052, 0.012, 24), mat);
  cap.position.y = neckY + 0.105;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), mat);
  knob.position.y = neckY + 0.13;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.025, 40), mat);
  base.position.y = 0.0125;
  g.add(neck, cap, knob, base);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, linen };
}

// ================= KUYOV KOSTYUMI =================
export function buildSuit(gold) {
  const root = new THREE.Group();
  const wool = phys({ color: 0x131317, roughness: 0.72, sheen: 0.8, sheenColor: 0x4a4a58, sheenRoughness: 0.45, normalMap: weaveNormal(22), normalScale: new THREE.Vector2(0.35, 0.35) });
  const satin = phys({ color: 0x24242a, roughness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.25, sheen: 1, sheenColor: 0x8a8a9a });
  const shirt = phys({ color: 0xfbfaf7, roughness: 0.55, sheen: 0.6, sheenColor: 0xffffff, normalMap: weaveNormal(30), normalScale: new THREE.Vector2(0.15, 0.15) });
  const lining = phys({ color: 0x4a1220, roughness: 0.4, sheen: 1, sheenColor: 0xa04060, side: THREE.BackSide });
  const patent = phys({ color: 0x08080a, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });

  const { g: form } = dressForm(1.47, gold);
  root.add(form);

  // --- Shim (o'rtasida dazmol chizig'i bilan) ---
  for (const s of [1, -1]) {
    const geo = new THREE.CylinderGeometry(0.088, 0.068, 0.92, 40, 12, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
      const th = Math.atan2(x, z);
      const crease = 1 + 0.08 * Math.pow(Math.max(0, Math.cos(th)), 10) + 0.05 * Math.pow(Math.max(0, -Math.cos(th)), 10);
      const wr = 1 + 0.015 * Math.sin(y * 30 + th * 3) * (y < -0.38 ? 1 : 0.2);   // pastda burmalar
      p.setXYZ(i, x * crease * wr, y, z * crease * wr);
    }
    geo.computeVertexNormals();
    const leg = new THREE.Mesh(geo, wool);
    leg.position.set(s * 0.092, 0.53, 0);
    leg.rotation.z = s * 0.025;
    // yon tomondagi atlas chiziq (smoking belgisi)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.9, 0.004), satin);
    stripe.position.set(s * 0.172, 0.53, 0.0); stripe.rotation.z = s * 0.025;
    // tufli
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.17, 6, 16), patent);
    shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.0, 1, 0.62);
    shoe.position.set(s * 0.1, 0.04, 0.045);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.27), phys({ color: 0x1a1210, roughness: 0.6 }));
    sole.position.set(s * 0.1, 0.008, 0.045);
    root.add(leg, stripe, shoe, sole);
  }
  // Bel qismi
  const seat = new THREE.Mesh(lathe([[0.15, 0.9], [0.16, 0.97], [0.155, 1.04], [0.15, 1.06]], 48), wool);
  seat.scale.z = 0.66;
  root.add(seat);

  // --- Pidjak ---
  const jacketProf = [[0.205, 0.76], [0.2, 0.84], [0.188, 0.95], [0.168, 1.06], [0.18, 1.16], [0.205, 1.26], [0.212, 1.33], [0.205, 1.39], [0.17, 1.43], [0.1, 1.46], [0.07, 1.47]];
  const jgeo = lathe(jacketProf, 72);
  const jp = jgeo.attributes.position;
  for (let i = 0; i < jp.count; i++) {
    const x = jp.getX(i), y = jp.getY(i), z = jp.getZ(i);
    // yelkalarni kengroq va to'rtburchakroq qilish
    const sh = THREE.MathUtils.smoothstep(y, 1.22, 1.38) * (1 - THREE.MathUtils.smoothstep(y, 1.41, 1.46));
    jp.setXYZ(i, x * (1.12 + 0.16 * sh), y, z * 0.62);
  }
  jgeo.computeVertexNormals();
  const jacket = new THREE.Mesh(jgeo, wool);
  // Pidjak old yuzasining z koordinatasi (x, y nuqtada) — bezaklarni yuzaga yopishtirish uchun
  const rAt = (y) => {
    for (let k = 0; k < jacketProf.length - 1; k++) {
      const [r0, y0] = jacketProf[k], [r1, y1] = jacketProf[k + 1];
      if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
    }
    return y < jacketProf[0][1] ? jacketProf[0][0] : 0.07;
  };
  const frontZ = (x, y, lift = 0.003) => {
    const r = rAt(y);
    const sh = THREE.MathUtils.smoothstep(y, 1.22, 1.38) * (1 - THREE.MathUtils.smoothstep(y, 1.41, 1.46));
    const ax = r * (1.12 + 0.16 * sh), az = r * 0.62;
    return az * Math.sqrt(Math.max(0, 1 - (x / ax) ** 2)) + lift;
  };
  // Ikki chegara (chap va o'ng x — y ga bog'liq) orasidagi zich to'r, yuzaga yopishtirilgan
  const ribbon = (y0, y1, xa, xb, lift, rows = 40, cols = 8) => {
    const pos = [], idx = [];
    for (let j = 0; j <= rows; j++) {
      const y = y0 + (y1 - y0) * (j / rows);
      const a = xa(y), b = xb(y);
      for (let i = 0; i <= cols; i++) {
        const x = a + (b - a) * (i / cols);
        pos.push(x, y, frontZ(x, y, lift));
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * (cols + 1) + i;
      idx.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const vHalf = (y) => 0.085 * (y - 1.075) / 0.365;
  const outerPts = [[0.03, 1.075], [0.115, 1.3], [0.13, 1.36], [0.155, 1.385], [0.11, 1.445]];
  const outerX = (y) => {
    for (let k = 0; k < outerPts.length - 1; k++) {
      const [x0, a] = outerPts[k], [x1, b] = outerPts[k + 1];
      if (y >= a && y <= b) return x0 + (x1 - x0) * (y - a) / (b - a);
    }
    return 0.11;
  };
  const stick = (geo, lift) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, frontZ(p.getX(i), p.getY(i), lift));
    geo.computeVertexNormals();
    return geo;
  };
  const jIn = new THREE.Mesh(jgeo, lining);
  root.add(jacket, jIn);

  // Old qismdagi ochiq V (ko'ylak ko'rinadi) — ko'ylak, tugmachalar, kapalak galstuk
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.085, 1.44); vShape.lineTo(0.085, 1.44); vShape.lineTo(0.0, 1.075); vShape.closePath();
  const shirtV = new THREE.Mesh(ribbon(1.075, 1.44, (y) => -vHalf(y), (y) => vHalf(y), 0.004), shirt);
  root.add(shirtV);
  for (const y of [1.2, 1.27, 1.34]) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), satin);
    stud.position.set(0, y, frontZ(0, y, 0.008));
    root.add(stud);
  }
  // yoqa (ko'ylak yoqasi) va kapalak galstuk
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.006), shirt);
    wing.position.set(s * 0.028, 1.455, 0.112); wing.rotation.set(-0.3, s * 0.5, s * 0.5);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 16), satin);
    bow.rotation.z = s * Math.PI / 2; bow.scale.set(1, 1, 0.45);
    bow.position.set(s * 0.027, 1.43, 0.13);
    root.add(wing, bow);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), satin);
  knot.scale.set(1, 1.1, 0.7); knot.position.set(0, 1.43, 0.136);
  root.add(knot);

  // Atlas lattsalar (peak lapel)
  for (const s of [1, -1]) {
    const L = new THREE.Shape();
    L.moveTo(0, 1.075);
    L.lineTo(s * 0.085, 1.44);
    L.lineTo(s * 0.11, 1.445);
    L.lineTo(s * 0.155, 1.385);   // cho'qqi
    L.lineTo(s * 0.13, 1.36);
    L.lineTo(s * 0.115, 1.3);
    L.lineTo(s * 0.03, 1.075);
    L.closePath();
    const lap = new THREE.Mesh(ribbon(1.075, 1.44, (y) => s * vHalf(y), (y) => s * Math.max(outerX(y), vHalf(y) + 0.004), 0.007), satin);
    lap.material = satin.clone(); lap.material.side = THREE.DoubleSide;
    root.add(lap);
  }
  // Tugma
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 16), satin);
  btn.rotation.x = Math.PI / 2; btn.position.set(0.0, 1.075, frontZ(0, 1.075, 0.004));
  root.add(btn);
  // Cho'ntaklar va ro'molcha
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.006), satin);
  for (const s of [1, -1]) { const f = flap.clone(); f.position.set(s * 0.13, 0.92, frontZ(s * 0.13, 0.92, 0.004)); f.rotation.y = s * 0.55; root.add(f); }
  const sq = new THREE.Shape();
  sq.moveTo(-0.03, 0); sq.lineTo(0.03, 0); sq.lineTo(0.022, 0.03); sq.lineTo(0.0, 0.018); sq.lineTo(-0.02, 0.032); sq.closePath();
  const square = new THREE.Mesh(new THREE.ShapeGeometry(sq), shirt);
  square.position.set(0.12, 1.3, frontZ(0.12, 1.3, 0.004)); square.rotation.y = 0.35;
  root.add(square);
  // Butonyerka (oq atirgul)
  const rose = new THREE.Group();
  const rm = phys({ color: 0xfffdf8, roughness: 0.5, sheen: 1, sheenColor: 0xffffff });
  for (let i = 0; i < 10; i++) {
    const pet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), rm);
    const a = i * 2.4, r = 0.004 + i * 0.0012;
    pet.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.004 - i * 0.0005);
    pet.scale.set(1, 0.8, 0.5);
    rose.add(pet);
  }
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), phys({ color: 0x3d6b38, roughness: 0.5 }));
  lf.scale.set(0.5, 1.3, 0.3); lf.position.set(0.012, -0.018, -0.003); lf.rotation.z = 0.6;
  rose.add(lf);
  rose.position.set(-0.135, 1.35, frontZ(-0.135, 1.35, 0.01));
  root.add(rose);

  // Yenglar (biroz bukilgan holda osilib turadi)
  for (const s of [1, -1]) {
    const sleeve = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.066, 0.054, 0.6, 32, 8, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {   // tirsak burmalari
      const y = p.getY(i), x = p.getX(i), z = p.getZ(i);
      const k = 1 + 0.03 * Math.sin(y * 40) * Math.exp(-Math.pow((y + 0.02) / 0.06, 2));
      p.setXYZ(i, x * k, y, z * k);
    }
    geo.computeVertexNormals();
    const sl = new THREE.Mesh(geo, wool);
    const slIn = new THREE.Mesh(geo, lining);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24, 1, true), shirt);
    cuff.position.y = -0.29;
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), phys({ color: 0x0a0a0c, roughness: 0.9 }));
    end.rotation.x = Math.PI / 2; end.position.y = -0.3;
    sleeve.add(sl, slIn, cuff, end);
    sleeve.position.set(s * 0.238, 1.085, 0.0);
    sleeve.rotation.z = s * 0.075; sleeve.rotation.x = -0.08;
    root.add(sleeve);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// ================= KELIN KO'YLAGI =================
export function buildGown(gold) {
  const root = new THREE.Group();
  const satin = phys({ color: 0xfcf8f1, roughness: 0.32, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.3, clearcoat: 0.15, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const lace = phys({ color: 0xffffff, map: laceTexture(), transparent: true, alphaTest: 0.08, roughness: 0.6, sheen: 0.8, sheenColor: 0xffffff, side: THREE.DoubleSide, depthWrite: false });
  const tulle = phys({ color: 0xffffff, map: sparkleTexture(), transparent: true, opacity: 0.5, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const crystal = phys({ color: 0xffffff, metalness: 0.2, roughness: 0.02, clearcoat: 1, iridescence: 0.6, emissive: 0xffffff, emissiveIntensity: 0.15 });

  const { g: form, linen } = dressForm(1.43, gold);
  root.add(form);
  // Manekenning yelkasi va ko'kragi (ko'ylakdan yuqorida ko'rinadi)
  const shoulders = new THREE.Mesh(lathe([[0.14, 1.26], [0.16, 1.33], [0.155, 1.37], [0.13, 1.41], [0.08, 1.44], [0.055, 1.45]], 48), linen);
  shoulders.scale.set(1.25, 1, 0.72);
  root.add(shoulders);

  // --- Korset (yurak shaklidagi yoqa bilan) ---
  const bodiceProf = [[0.118, 0.99], [0.122, 1.04], [0.135, 1.12], [0.158, 1.2], [0.165, 1.26], [0.162, 1.32], [0.16, 1.34]];
  const bgeo = lathe(bodiceProf, 72);
  const bp = bgeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const th = Math.atan2(x, z);
    if (y > 1.25) {
      // yurak shaklidagi yoqa: oldi o'rtada pastroq, ikki yonida yuqoriroq, orqasi to'g'ri
      const front = Math.max(0, Math.cos(th));
      const sweet = 1.33 - 0.065 * Math.pow(front, 6) + 0.012 * Math.sin(Math.abs(th) * 2.4) * front - 0.03 * (1 - front);
      y = Math.min(y, sweet);
    }
    bp.setXYZ(i, x * 1.15, y, z * 0.74);
  }
  bgeo.computeVertexNormals();
  root.add(new THREE.Mesh(bgeo, satin));
  const laceB = new THREE.Mesh(bgeo, lace);
  laceB.scale.set(1.015, 1, 1.015);
  root.add(laceB);
  // Bel kamari va tosh bezaklar
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.014, 10, 64), satin);
  belt.rotation.x = Math.PI / 2; belt.scale.set(1.15, 0.74, 1.3); belt.position.y = 1.0;
  root.add(belt);
  const gem = new THREE.IcosahedronGeometry(0.0042, 0);
  for (let k = 0; k < 46; k++) {
    const a = (k / 46) * Math.PI * 2;
    if (Math.cos(a) < -0.2) continue;
    const c = new THREE.Mesh(gem, crystal);
    c.position.set(Math.sin(a) * 0.14 * 1.15, 1.0 + Math.sin(k * 1.7) * 0.004, Math.cos(a) * 0.14 * 0.74);
    root.add(c);
  }
  const brooch = new THREE.Group();
  for (let k = 0; k < 9; k++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(k === 0 ? 0.011 : 0.007, 0), crystal);
    const a = (k / 8) * Math.PI * 2;
    if (k) c.position.set(Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0);
    brooch.add(c);
  }
  brooch.position.set(0.0, 1.0, 0.112);
  root.add(brooch);

  // --- Keng yubka + shleyf (orqaga cho'zilgan etak) ---
  const skirtGeo = (scale) => {
    const prof = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;                          // 0 = pastki etak, 1 = bel
      const y = 1.0 * t;
      const r = 0.125 + (0.6 - 0.125) * Math.pow(1 - t, 1.55);
      prof.push([r * scale, y]);
    }
    const g = lathe(prof, 120);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = Math.atan2(x, z);
      const low = 1 - y;                           // pastga qarab ko'payadi
      const fold = 1 + (0.045 * Math.sin(th * 11) + 0.025 * Math.sin(th * 23 + 1.3)) * Math.pow(low, 1.6);
      x *= fold; z *= fold;
      // orqada shleyf
      const back = Math.pow(Math.max(0, -Math.cos(th)), 2);
      const tr = Math.pow(Math.max(0, (0.55 - y) / 0.55), 2);
      z -= 0.55 * back * tr;
      y = Math.max(0.004, y - 0.03 * back * tr);
      p.setXYZ(i, x * 1.05, y, z * 0.95);
    }
    g.computeVertexNormals();
    return g;
  };
  const skirt = new THREE.Mesh(skirtGeo(1), satin);
  const tul = new THREE.Mesh(skirtGeo(1.035), tulle);
  tul.renderOrder = 2;
  root.add(skirt, tul);
  // Yubka ustidagi to'r gullar (pastki qismida)
  const laceSkirt = new THREE.Mesh(skirtGeo(1.02), lace);
  laceSkirt.material = lace.clone();
  laceSkirt.material.map = laceTexture();
  laceSkirt.material.map.repeat.set(10, 3);
  laceSkirt.material.opacity = 0.9;
  root.add(laceSkirt);

  // --- Fata (manekenning boshidan orqaga tushadi) ---
  const veilProf = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    veilProf.push([0.05 + t * 0.42 + Math.sin(t * 9) * 0.008, 1.56 - t * 1.5]);
  }
  const vg = lathe(veilProf.reverse(), 64, Math.PI * 0.55, Math.PI * 0.9);
  const vp = vg.attributes.position;
  for (let i = 0; i < vp.count; i++) {
    const x = vp.getX(i), z = vp.getZ(i), y = vp.getY(i);
    const th = Math.atan2(x, z);
    const k = 1 + 0.05 * Math.sin(th * 14 + y * 3);
    vp.setXYZ(i, x * k, y, z * k - 0.04);
  }
  vg.computeVertexNormals();
  const veil = new THREE.Mesh(vg, phys({ color: 0xffffff, map: sparkleTexture(), transparent: true, opacity: 0.32, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  veil.renderOrder = 3;
  const comb = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 24, Math.PI), crystal);
  comb.position.set(0, 1.565, -0.01);
  root.add(veil, comb);

  root.traverse((o) => { if (o.isMesh && o.material !== tulle) o.castShadow = true; });
  veil.castShadow = false; tul.castShadow = false;
  return root;
}
