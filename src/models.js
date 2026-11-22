import * as THREE from 'three';
import { GRID, LAWN_WIDTH, LAWN_DEPTH, laneToX, rowToZ, MOWER_Z } from './config.js';
import { getTextures } from './textures.js';

function mat(color, roughness = 0.72, metalness = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function addContactShadow(group, radius = 0.36, y = 0.048, opacity = 0.85) {
  const tex = getTextures().contactShadow;
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.2, radius * 2.2),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = y;
  group.add(disc);
  return disc;
}

// ==========================================
// ENVIRONMENT: Textured Sunlit Suburban 3D Yard
// ==========================================
export function createEnvironment(scene) {
  const tex = getTextures();
  const envGroup = new THREE.Group();
  const tileMeshes = [];

  // Lush textured outer meadow extending smoothly beyond the yard
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 54),
    new THREE.MeshStandardMaterial({
      map: tex.outerGrass,
      bumpMap: tex.grassBump,
      bumpScale: 0.03,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.14;
  outerGround.receiveShadow = true;
  envGroup.add(outerGround);

  // Raised rich soil/mulch garden bed frame with wooden edging
  const soilBase = new THREE.Mesh(
    new THREE.BoxGeometry(LAWN_WIDTH + 0.34, 0.22, LAWN_DEPTH + 0.34),
    new THREE.MeshStandardMaterial({
      map: tex.soil,
      roughness: 0.95,
    })
  );
  soilBase.position.set(0, -0.09, 0);
  soilBase.receiveShadow = true;
  envGroup.add(soilBase);

  // Subtle timber trim strips framing left/right/top/bottom of lawn bed
  const trimMat = mat(0x7c4a21, 0.85);
  [-1, 1].forEach((side) => {
    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.14, LAWN_DEPTH + 0.38),
      trimMat
    );
    sideTrim.position.set(side * (LAWN_WIDTH / 2 + 0.17), -0.01, 0);
    sideTrim.castShadow = true;
    sideTrim.receiveShadow = true;
    envGroup.add(sideTrim);
  });

  // 5x7 Textured Checkerboard 3D grass tiles with subtle tactile bump
  const tileGeo = new THREE.BoxGeometry(GRID.TILE_SIZE - 0.025, 0.085, GRID.TILE_SIZE - 0.025);
  const lightGrassMat = new THREE.MeshStandardMaterial({
    map: tex.grassLight,
    bumpMap: tex.grassBump,
    bumpScale: 0.022,
    roughness: 0.86,
    metalness: 0.0,
  });
  const darkGrassMat = new THREE.MeshStandardMaterial({
    map: tex.grassDark,
    bumpMap: tex.grassBump,
    bumpScale: 0.022,
    roughness: 0.86,
    metalness: 0.0,
  });

  for (let row = 0; row < GRID.ROWS; row++) {
    for (let lane = 0; lane < GRID.LANES; lane++) {
      const isLight = (row + lane) % 2 === 0;
      const tile = new THREE.Mesh(tileGeo, isLight ? lightGrassMat : darkGrassMat);
      tile.position.set(laneToX(lane), 0, rowToZ(row));
      tile.receiveShadow = true;
      tile.userData = { isTile: true, lane, row };
      envGroup.add(tile);
      tileMeshes.push(tile);
    }
  }

  // Top edge: Concrete sidewalk, curb lip & textured asphalt street
  const sidewalkTop = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.16, 1.15),
    new THREE.MeshStandardMaterial({
      map: tex.sidewalk,
      roughness: 0.88,
    })
  );
  sidewalkTop.position.set(0, -0.03, -LAWN_DEPTH / 2 - 0.68);
  sidewalkTop.receiveShadow = true;
  envGroup.add(sidewalkTop);

  // Raised concrete curb along road edge
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.18, 0.16),
    mat(0xc8cac2, 0.88)
  );
  curb.position.set(0, -0.01, -LAWN_DEPTH / 2 - 1.24);
  curb.castShadow = true;
  curb.receiveShadow = true;
  envGroup.add(curb);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.08, 4.4),
    new THREE.MeshStandardMaterial({
      map: tex.road,
      roughness: 0.94,
    })
  );
  road.position.set(0, -0.09, -LAWN_DEPTH / 2 - 3.45);
  road.receiveShadow = true;
  envGroup.add(road);

  // Road dashed painted yellow lines
  const dashMat = mat(0xf5c828, 0.78);
  for (let x = -13; x <= 13; x += 2.3) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.018, 0.14), dashMat);
    dash.position.set(x, -0.04, -LAWN_DEPTH / 2 - 3.15);
    dash.receiveShadow = true;
    envGroup.add(dash);
  }

  // Bottom edge: Flagstone mower walkway & warm planked wooden porch
  const stoneStrip = new THREE.Mesh(
    new THREE.BoxGeometry(LAWN_WIDTH + 0.95, 0.14, 1.38),
    new THREE.MeshStandardMaterial({
      map: tex.stone,
      roughness: 0.85,
    })
  );
  stoneStrip.position.set(0, -0.02, MOWER_Z + 0.05);
  stoneStrip.receiveShadow = true;
  envGroup.add(stoneStrip);

  const porch = new THREE.Mesh(
    new THREE.BoxGeometry(LAWN_WIDTH + 2.8, 0.34, 2.4),
    new THREE.MeshStandardMaterial({
      map: tex.wood,
      roughness: 0.78,
    })
  );
  porch.position.set(0, 0.06, MOWER_Z + 1.72);
  porch.receiveShadow = true;
  porch.castShadow = true;
  envGroup.add(porch);

  // Porch trim step lip
  const porchTrim = new THREE.Mesh(
    new THREE.BoxGeometry(LAWN_WIDTH + 2.9, 0.09, 0.18),
    mat(0x6b3a19, 0.8)
  );
  porchTrim.position.set(0, 0.22, MOWER_Z + 0.56);
  porchTrim.castShadow = true;
  envGroup.add(porchTrim);

  // Woven "HOME" welcome doormat
  const doormat = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.045, 0.82),
    new THREE.MeshStandardMaterial({
      map: tex.doormat,
      roughness: 0.96,
    })
  );
  doormat.position.set(0, 0.245, MOWER_Z + 1.15);
  doormat.receiveShadow = true;
  envGroup.add(doormat);

  // Pointed White Picket Fences with beveled posts & finial caps
  const fenceMat = mat(0xf6f8f5, 0.65);
  const fenceCapMat = mat(0xe2e8f0, 0.55);
  const postGeo = new THREE.BoxGeometry(0.15, 0.82, 0.15);
  const postCapGeo = new THREE.ConeGeometry(0.125, 0.14, 4);
  const picketBodyGeo = new THREE.BoxGeometry(0.075, 0.64, 0.155);
  const picketTipGeo = new THREE.ConeGeometry(0.095, 0.13, 4);
  const railGeo = new THREE.BoxGeometry(0.065, 0.085, LAWN_DEPTH + 1.0);

  [-1, 1].forEach((side) => {
    const fx = side * (LAWN_WIDTH / 2 + 0.44);
    [0.22, 0.52].forEach((ry) => {
      const rail = new THREE.Mesh(railGeo, fenceMat);
      rail.position.set(fx, ry, 0.08);
      rail.castShadow = true;
      rail.receiveShadow = true;
      envGroup.add(rail);
    });
    for (let z = -LAWN_DEPTH / 2 - 0.24; z <= LAWN_DEPTH / 2 + 0.46; z += 0.38) {
      const isPost = Math.abs(z) > LAWN_DEPTH / 2 - 0.1 || Math.abs(z) < 0.2;
      if (isPost) {
        const p = new THREE.Mesh(postGeo, fenceMat);
        p.position.set(fx, 0.38, z);
        p.castShadow = true;
        p.receiveShadow = true;
        envGroup.add(p);
        const cap = new THREE.Mesh(postCapGeo, fenceCapMat);
        cap.position.set(fx, 0.85, z);
        cap.rotation.y = Math.PI / 4;
        cap.castShadow = true;
        envGroup.add(cap);
      } else {
        const p = new THREE.Mesh(picketBodyGeo, fenceMat);
        p.position.set(fx, 0.31, z);
        p.castShadow = true;
        p.receiveShadow = true;
        envGroup.add(p);
        const tip = new THREE.Mesh(picketTipGeo, fenceMat);
        tip.position.set(fx, 0.68, z);
        tip.rotation.y = Math.PI / 4;
        tip.scale.set(0.6, 1, 1.15);
        envGroup.add(tip);
      }
    }
  });

  // Cute Suburban Mailbox near top-right sidewalk
  const mailbox = new THREE.Group();
  const mbPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), mat(0x7c4a22, 0.85));
  mbPost.position.y = 0.45;
  mbPost.castShadow = true;
  mailbox.add(mbPost);
  const mbBox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.46, 10, 1, false, 0, Math.PI),
    mat(0x2563eb, 0.4, 0.35)
  );
  mbBox.rotation.z = Math.PI / 2;
  mbBox.rotation.y = Math.PI / 2;
  mbBox.position.set(0, 0.98, 0);
  mbBox.castShadow = true;
  mailbox.add(mbBox);
  const mbBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.46), mat(0x2563eb, 0.4, 0.35));
  mbBase.position.set(0, 0.92, 0);
  mbBase.castShadow = true;
  mailbox.add(mbBase);
  const mbFlag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), mat(0xef4444, 0.5));
  mbFlag.position.set(0.18, 1.05, 0.06);
  mailbox.add(mbFlag);
  mailbox.position.set(LAWN_WIDTH / 2 + 1.15, 0, -LAWN_DEPTH / 2 - 0.1);
  envGroup.add(mailbox);

  // Stylized Multi-Canopy Trees & Flowering Shrubs framing left & right yards
  const buildTree = (x, z, scale = 1.0, hueShift = 0) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 1.35 * scale, 8),
      mat(0x6e4223, 0.9)
    );
    trunk.position.y = 0.62 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    t.add(trunk);

    const greens = [0x2f8f34, 0x3ba842, 0x247329];
    const canopyClusters = [
      [0, 1.55, 0, 0.72],
      [-0.42, 1.32, 0.22, 0.52],
      [0.44, 1.35, -0.18, 0.55],
      [0.12, 1.88, 0.15, 0.48],
    ];
    canopyClusters.forEach(([cx, cy, cz, cr], idx) => {
      const c = new THREE.Color(greens[(idx + hueShift) % greens.length]);
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(cr * scale, 1),
        mat(c, 0.82)
      );
      puff.position.set(cx * scale, cy * scale, cz * scale);
      puff.castShadow = true;
      puff.receiveShadow = true;
      t.add(puff);
    });

    t.position.set(x, 0, z);
    return t;
  };

  [
    [-5.2, -3.9, 1.05, 0],
    [-5.6, 0.2, 1.12, 2],
    [-5.4, 4.1, 1.15, 1],
    [5.2, -3.6, 1.0, 2],
    [5.6, 0.5, 1.08, 1],
    [5.4, 4.2, 1.1, 0],
  ].forEach(([tx, tz, ts, hs]) => envGroup.add(buildTree(tx, tz, ts, hs)));

  // Lush layered bushes with tiny blossoms along the full 9-row yard
  const bushColors = [0x2e8c33, 0x3aa340, 0x26752a];
  const blossomColors = [0xf472b6, 0xfef08a, 0x93c5fd, 0xfb7185];
  const bushPositions = [
    [-4.1, -4.6, 0.85], [-4.5, -1.7, 1.02], [-4.1, 1.6, 0.88], [-4.4, 4.9, 0.96],
    [4.1, -4.5, 0.88], [4.5, -1.5, 1.0], [4.1, 1.8, 0.9], [4.4, 5.0, 0.94],
  ];
  bushPositions.forEach(([bx, bz, s], i) => {
    const bush = new THREE.Group();
    const bMat = mat(bushColors[i % bushColors.length], 0.86);
    const main = new THREE.Mesh(new THREE.IcosahedronGeometry(0.54 * s, 1), bMat);
    main.position.y = 0.36 * s;
    main.scale.set(1.15, 0.88, 1.05);
    main.castShadow = true;
    main.receiveShadow = true;
    bush.add(main);
    const side1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36 * s, 1), bMat);
    side1.position.set(0.36 * s, 0.24 * s, 0.2 * s);
    side1.castShadow = true;
    bush.add(side1);
    const side2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 1), bMat);
    side2.position.set(-0.34 * s, 0.22 * s, -0.18 * s);
    side2.castShadow = true;
    bush.add(side2);

    // Tiny blossoms perched on bush
    const bCol = blossomColors[i % blossomColors.length];
    for (let f = 0; f < 3; f++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 6, 6), mat(bCol, 0.55));
      const a = f * 2.1 + i;
      dot.position.set(Math.cos(a) * 0.36 * s, (0.48 + (f % 2) * 0.14) * s, Math.sin(a) * 0.34 * s);
      bush.add(dot);
    }

    bush.position.set(bx, 0, bz);
    envGroup.add(bush);
  });

  // Classic Lantern Streetlamps with warm radial glow halos
  [-3.85, 3.85].forEach((lx) => {
    const lamp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.26, 8), mat(0x1e293b, 0.45, 0.65));
    base.position.y = 0.13;
    base.castShadow = true;
    lamp.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 2.25, 10), mat(0x334155, 0.4, 0.72));
    pole.position.y = 1.15;
    pole.castShadow = true;
    lamp.add(pole);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.12, 8), mat(0x1e293b, 0.4, 0.7));
    collar.position.y = 2.22;
    lamp.add(collar);

    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.12, 0.32, 6),
      new THREE.MeshStandardMaterial({
        color: 0xfef9c3,
        emissive: 0xfde047,
        emissiveIntensity: 1.15,
        roughness: 0.2,
      })
    );
    lanternGlass.position.y = 2.42;
    lamp.add(lanternGlass);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 6), mat(0x1e293b, 0.4, 0.7));
    roof.position.y = 2.66;
    lamp.add(roof);

    // Warm additive halo sprite around lantern
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.lampGlow,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.position.y = 2.44;
    halo.scale.set(1.5, 1.5, 1);
    lamp.add(halo);

    lamp.position.set(lx, 0, -LAWN_DEPTH / 2 - 0.85);
    envGroup.add(lamp);
  });

  // Charming 3D Wildflowers & Grass Tufts outside fences
  const flowerColors = [0xf472b6, 0xfacc15, 0x60a5fa, 0xfb7185, 0xc084fc];
  const stemMat = mat(0x15803d, 0.75);
  for (let i = 0; i < 24; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const fx = side * (LAWN_WIDTH / 2 + 0.88 + (i % 4) * 0.42);
    const fz = -4.9 + ((i * 0.56) % 9.9);
    const fg = new THREE.Group();
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.18, 5), stemMat);
    st.position.y = 0.09;
    fg.add(st);
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mat(0xfef08a, 0.5));
    center.position.y = 0.19;
    fg.add(center);
    const pMat = mat(flowerColors[i % flowerColors.length], 0.55);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.048, 5, 5), pMat);
      pet.scale.set(1, 0.45, 1);
      pet.position.set(Math.cos(a) * 0.075, 0.18, Math.sin(a) * 0.075);
      fg.add(pet);
    }
    fg.position.set(fx, -0.04, fz);
    envGroup.add(fg);
  }

  scene.add(envGroup);
  return { envGroup, tileMeshes };
}

// ==========================================
// UPGRADED 3D LAWNMOWER
// ==========================================
export function createLawnmowerMesh() {
  const g = new THREE.Group();
  addContactShadow(g, 0.42, 0.055, 0.75);

  // Glossy painted red mower deck with beveled cowl
  const deckMat = mat(0xdc2626, 0.28, 0.25);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.66), deckMat);
  body.position.y = 0.18;
  body.castShadow = true;
  g.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.48), mat(0xef4444, 0.26, 0.22));
  hood.position.set(0, 0.3, -0.03);
  hood.castShadow = true;
  g.add(hood);

  // Racing stripe accent
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.49), mat(0xf8fafc, 0.35, 0.1));
  stripe.position.set(0, 0.365, -0.03);
  g.add(stripe);

  // Metallic engine block + yellow starter pull cap + exhaust muffler
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.18, 12), mat(0x334155, 0.32, 0.78));
  engine.position.set(0, 0.42, -0.04);
  engine.castShadow = true;
  g.add(engine);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.06, 10), mat(0xfacc15, 0.3, 0.2));
  cap.position.set(0, 0.53, -0.04);
  g.add(cap);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8), mat(0x64748b, 0.3, 0.85));
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(0.2, 0.41, -0.1);
  g.add(exhaust);

  // Chrome handlebar tilted toward porch (+Z)
  const chromeMat = mat(0xe2e8f0, 0.18, 0.88);
  [-0.21, 0.21].forEach((hx) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.64, 8), chromeMat);
    bar.position.set(hx, 0.52, 0.32);
    bar.rotation.x = 0.58;
    bar.castShadow = true;
    g.add(bar);
  });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.48, 10), mat(0x0f172a, 0.7));
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.77, 0.48);
  g.add(grip);

  // Detailed wheels with white hubcaps
  const tireGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.09, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.098, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const tireMat = mat(0x18181b, 0.85);
  const hubMat = mat(0xf1f5f9, 0.3, 0.6);

  const wheels = [];
  [
    [-0.31, -0.21], [0.31, -0.21],
    [-0.31, 0.22], [0.31, 0.22],
  ].forEach(([wx, wz]) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.13, wz);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wg.add(tire);
    wg.add(new THREE.Mesh(hubGeo, hubMat));
    g.add(wg);
    wheels.push(wg);
  });

  g.userData.wheels = wheels;
  return g;
}

// ==========================================
// UPGRADED PLANT MODELS (5 iconic PvZ plants)
// ==========================================
function addSculptedLeafBase(group, colorMain = 0x22c55e, colorTip = 0x16a34a) {
  addContactShadow(group, 0.38, 0.015, 0.78);

  const leafMat1 = mat(colorMain, 0.58, 0.04);
  const leafMat2 = mat(colorTip, 0.62, 0.04);
  const leafGeo = new THREE.SphereGeometry(0.24, 10, 8);
  leafGeo.scale(1.42, 0.22, 0.72);

  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeo, i % 2 === 0 ? leafMat1 : leafMat2);
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    leaf.position.set(Math.cos(angle) * 0.22, 0.08 + (i % 2) * 0.025, Math.sin(angle) * 0.22);
    leaf.rotation.y = -angle;
    leaf.rotation.z = 0.14;
    leaf.castShadow = true;
    group.add(leaf);
  }
}

export function createSunflowerMesh() {
  const tex = getTextures();
  const g = new THREE.Group();
  addSculptedLeafBase(g, 0x22c55e, 0x15803d);

  // Curved organic stem built from 2 angled segments + collar calyx
  const stemMat = mat(0x16a34a, 0.62);
  const stemLower = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.09, 0.32, 10), stemMat);
  stemLower.position.set(0, 0.2, 0.02);
  stemLower.rotation.x = -0.1;
  stemLower.castShadow = true;
  g.add(stemLower);

  const stemUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.32, 10), stemMat);
  stemUpper.position.set(0, 0.48, -0.01);
  stemUpper.rotation.x = 0.08;
  stemUpper.castShadow = true;
  g.add(stemUpper);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.7, 0);

  // Green calyx cup behind the flower face
  const calyx = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), stemMat);
  calyx.scale.set(1.05, 1.05, 0.55);
  calyx.position.set(0, -0.02, -0.08);
  headGroup.add(calyx);

  // Sculpted warm brown face cushion
  const faceMat = mat(0x78350f, 0.68, 0.04);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 12), faceMat);
  face.scale.set(1.0, 1.0, 0.52);
  face.rotation.x = -0.32;
  face.castShadow = true;
  headGroup.add(face);

  // Dual-layer golden & amber petals for rich volume
  const backPetalMat = mat(0xf59e0b, 0.48, 0.05);
  const frontPetalMat = mat(0xfde047, 0.42, 0.05);
  const petalGeo = new THREE.SphereGeometry(0.115, 9, 7);
  petalGeo.scale(0.75, 1.48, 0.36);

  const petalRing = new THREE.Group();
  petalRing.rotation.x = -0.32;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pf = new THREE.Mesh(petalGeo, frontPetalMat);
    pf.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.01);
    pf.rotation.z = a - Math.PI / 2;
    pf.castShadow = true;
    petalRing.add(pf);

    const a2 = a + Math.PI / 12;
    const pb = new THREE.Mesh(petalGeo, backPetalMat);
    pb.position.set(Math.cos(a2) * 0.33, Math.sin(a2) * 0.33, -0.045);
    pb.rotation.z = a2 - Math.PI / 2;
    pb.scale.setScalar(0.95);
    pb.castShadow = true;
    petalRing.add(pb);
  }
  headGroup.add(petalRing);

  // Glossy eyes, catchlights, rosy cheeks & joyful smile facing camera (+Z)
  const eyeMat = mat(0x0f172a, 0.1, 0.15);
  const glintMat = mat(0xffffff, 0.05, 0, { emissive: 0xffffff, emissiveIntensity: 0.35 });
  const cheekMat = mat(0xfb7185, 0.65);

  [-0.088, 0.088].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 10), eyeMat);
    eye.position.set(ex, 0.068, 0.115);
    headGroup.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 6), glintMat);
    glint.position.set(ex + 0.016, 0.086, 0.148);
    headGroup.add(glint);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), cheekMat);
    cheek.scale.set(1.25, 0.7, 0.4);
    cheek.position.set(ex * 1.48, 0.005, 0.118);
    headGroup.add(cheek);
  });

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.072, 0.017, 8, 14, Math.PI),
    mat(0x271204, 0.4)
  );
  smile.position.set(0, -0.01, 0.118);
  smile.rotation.z = Math.PI;
  smile.rotation.x = -0.32;
  headGroup.add(smile);

  // Subtle charging glow sprite (scales up right before popping sun)
  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex.sunGlow,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunHalo.scale.set(1.25, 1.25, 1);
  headGroup.add(sunHalo);

  g.add(headGroup);
  g.userData.head = headGroup;
  g.userData.faceMat = faceMat;
  g.userData.sunHalo = sunHalo;
  return g;
}

export function createPeashooterMesh(isIce = false) {
  const tex = getTextures();
  const g = new THREE.Group();
  const baseGreen = isIce ? 0x0284c7 : 0x22c55e;
  const tipGreen = isIce ? 0x0369a1 : 0x15803d;
  const headColor = isIce ? 0x38bdf8 : 0x4ade80;
  const snoutRimColor = isIce ? 0xbae6fd : 0x86efac;

  addSculptedLeafBase(g, baseGreen, tipGreen);

  // Curved S-neck stem
  const stemMat = mat(baseGreen, 0.56);
  const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.084, 0.28, 10), stemMat);
  stem1.position.set(0, 0.18, 0.03);
  stem1.rotation.x = -0.18;
  stem1.castShadow = true;
  g.add(stem1);

  const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.066, 0.28, 10), stemMat);
  stem2.position.set(0, 0.42, 0.0);
  stem2.rotation.x = 0.16;
  stem2.castShadow = true;
  g.add(stem2);

  // Head aiming -Z (toward incoming zombies)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.63, 0);

  const headMat = mat(headColor, isIce ? 0.24 : 0.36, isIce ? 0.15 : 0.04);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.275, 18, 14), headMat);
  cranium.scale.set(1.0, 0.96, 1.06);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Flared trumpet snout
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.095, 0.36, 16), headMat);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.015, -0.27);
  snout.castShadow = true;
  headGroup.add(snout);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.042, 10, 18), mat(snoutRimColor, 0.3));
  rim.position.set(0, -0.015, -0.44);
  headGroup.add(rim);

  const mouthHole = new THREE.Mesh(new THREE.CircleGeometry(0.125, 14), mat(0x09111f, 0.95));
  mouthHole.rotation.y = Math.PI;
  mouthHole.position.set(0, -0.015, -0.445);
  headGroup.add(mouthHole);

  // Expressive glossy eyes with brows & specular catchlights
  const eyeMat = mat(0x0b1120, 0.08, 0.2);
  const glintMat = mat(0xffffff, 0.05, 0, { emissive: 0xffffff, emissiveIntensity: 0.45 });
  const browMat = mat(tipGreen, 0.55);

  [-0.145, 0.145].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 10), eyeMat);
    eye.position.set(ex, 0.09, -0.175);
    headGroup.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), glintMat);
    glint.position.set(ex * 1.04, 0.112, -0.218);
    headGroup.add(glint);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.04), browMat);
    brow.position.set(ex * 0.98, 0.16, -0.17);
    brow.rotation.z = ex < 0 ? -0.22 : 0.22;
    headGroup.add(brow);
  });

  if (isIce) {
    // Translucent faceted ice crystal crown + cool ambient glow
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28 + (i % 2) * 0.07, 5), crystalMat);
      const spread = (i - 2) * 0.075;
      spike.position.set(spread, 0.15 - Math.abs(spread) * 0.5, 0.24);
      spike.rotation.x = 0.88;
      spike.rotation.z = -spread * 2.4;
      spike.castShadow = true;
      headGroup.add(spike);
    }
    const frostHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.iceGlow,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    frostHalo.scale.set(1.05, 1.05, 1);
    headGroup.add(frostHalo);
  } else {
    // Sculpted back sprout leaf
    const tuft1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(0x16a34a, 0.55));
    tuft1.scale.set(0.65, 1.6, 0.35);
    tuft1.position.set(0, 0.12, 0.28);
    tuft1.rotation.x = 1.05;
    tuft1.castShadow = true;
    headGroup.add(tuft1);
  }

  g.add(headGroup);
  g.userData.head = headGroup;
  return g;
}

export function createWallnutMesh() {
  const tex = getTextures();
  const g = new THREE.Group();
  addContactShadow(g, 0.4, 0.015, 0.82);

  const shellMat = new THREE.MeshStandardMaterial({
    map: tex.walnut,
    roughness: 0.78,
    metalness: 0.02,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.37, 18, 14), shellMat);
  body.scale.set(0.96, 1.24, 0.88);
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);

  // Sculpted crown bump & vertical walnut seam
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), shellMat);
  crown.scale.set(1.05, 0.75, 0.9);
  crown.position.y = 0.78;
  crown.castShadow = true;
  g.add(crown);

  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.026, 8, 18), mat(0x8a4e1c, 0.85));
  ridge.scale.set(0.92, 1.2, 1);
  ridge.position.y = 0.45;
  ridge.rotation.y = Math.PI / 2;
  g.add(ridge);

  // Expressive eyes on BOTH front (-Z facing zombies) AND slightly angled top-visible brows
  const eyeWhiteMat = mat(0xffffff, 0.22);
  const pupilMat = mat(0x0f172a, 0.12);
  const lidMat = mat(0x9a5b25, 0.75);

  [-0.12, 0.12].forEach((ex) => {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 10), eyeWhiteMat);
    white.position.set(ex, 0.56, -0.255);
    g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), pupilMat);
    pupil.position.set(ex * 0.96, 0.56, -0.322);
    g.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.05), lidMat);
    brow.position.set(ex, 0.65, -0.27);
    brow.rotation.z = ex < 0 ? 0.16 : -0.16;
    g.add(brow);
  });

  // Cracks + white bandage shown when damaged
  const crackGroup = new THREE.Group();
  const crackMat = mat(0x3b1504, 0.92);
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.038, 0.05), crackMat);
  c1.position.set(-0.08, 0.74, 0.23);
  c1.rotation.z = 0.52;
  crackGroup.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.038, 0.05), crackMat);
  c2.position.set(0.11, 0.44, 0.3);
  c2.rotation.z = -0.68;
  crackGroup.add(c2);
  const bandage = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.03), mat(0xfef3c7, 0.85));
  bandage.position.set(0.06, 0.66, 0.27);
  bandage.rotation.z = -0.35;
  crackGroup.add(bandage);
  crackGroup.visible = false;
  g.add(crackGroup);

  g.userData.body = body;
  g.userData.cracks = crackGroup;
  return g;
}

export function createCherryBombMesh() {
  const tex = getTextures();
  const g = new THREE.Group();
  addContactShadow(g, 0.44, 0.015, 0.8);

  const cherryMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.28,
    roughness: 0.18,
    metalness: 0.12,
  });

  const browMat = mat(0x3b0707, 0.6);
  const eyeMat = mat(0xfef08a, 0.2, 0, { emissive: 0xfacc15, emissiveIntensity: 0.8 });

  [-0.21, 0.21].forEach((cx, idx) => {
    const cy = 0.26 + idx * 0.03;
    const cz = idx === 0 ? 0.04 : -0.04;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), cherryMat);
    ball.position.set(cx, cy, cz);
    ball.castShadow = true;
    g.add(ball);

    [-0.065, 0.065].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeMat);
      eye.position.set(cx + ex, cy + 0.05, cz + 0.21);
      g.add(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), browMat);
      brow.position.set(cx + ex, cy + 0.095, cz + 0.215);
      brow.rotation.z = ex < 0 ? -0.35 : 0.35;
      g.add(brow);
    });
  });

  const stemMat = mat(0x16a34a, 0.55);
  [-1, 1].forEach((dir) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.46, 8), stemMat);
    s.position.set(dir * 0.11, 0.58, 0);
    s.rotation.z = dir * 0.44;
    s.castShadow = true;
    g.add(s);
  });

  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0x22c55e, 0.5));
  leaf.scale.set(1.55, 0.25, 0.8);
  leaf.position.set(0.09, 0.79, 0);
  leaf.rotation.z = -0.35;
  g.add(leaf);

  // Glowing blast charge halo
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex.sunGlow,
      color: 0xff6b35,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.position.y = 0.35;
  glow.scale.set(1.1, 1.1, 1);
  g.add(glow);

  g.userData.cherryMat = cherryMat;
  g.userData.glow = glow;
  return g;
}

export function createPlantMesh(type) {
  switch (type) {
    case 'sunflower': return createSunflowerMesh();
    case 'peashooter': return createPeashooterMesh(false);
    case 'snowpea': return createPeashooterMesh(true);
    case 'wallnut': return createWallnutMesh();
    case 'cherrybomb': return createCherryBombMesh();
    default: return createPeashooterMesh(false);
  }
}

// ==========================================
// UPGRADED SCULPTED ZOMBIE MODELS
// ==========================================
export function createZombieMesh(type = 'basic') {
  const g = new THREE.Group();
  addContactShadow(g, 0.38, 0.045, 0.82);

  const skinMat = mat(0x88b056, 0.72, 0.02);
  const coatMat = mat(0x5c3f31, 0.84, 0.02);
  const shirtMat = mat(0xd6d3c9, 0.82);
  const pantsMat = mat(0x334155, 0.86);
  const tieMat = mat(0xc81e1e, 0.62);
  const shoeMat = mat(0x1c1917, 0.78);

  const tintableMats = [skinMat, coatMat, shirtMat, pantsMat, tieMat];

  // Sculpted legs with rounded knees & chunky shoes
  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.45, 0);
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.28, 6, 8), pantsMat);
    calf.position.y = -0.21;
    calf.castShadow = true;
    leg.add(calf);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.095, 0.24), shoeMat);
    shoe.position.set(0, -0.4, 0.05);
    shoe.castShadow = true;
    leg.add(shoe);
    return leg;
  };
  const leftLeg = makeLeg(-0.115);
  const rightLeg = makeLeg(0.115);
  g.add(leftLeg, rightLeg);

  // Upper body
  const upperBody = new THREE.Group();
  upperBody.position.set(0, 0.46, 0);

  // Tapered tattered blazer torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.5, 10), coatMat);
  torso.scale.set(1.02, 1.0, 0.68);
  torso.position.y = 0.26;
  torso.castShadow = true;
  upperBody.add(torso);

  // Rumpled shirt V-front & red necktie
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.05), shirtMat);
  shirt.position.set(0, 0.32, 0.14);
  upperBody.add(shirt);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.27, 0.04), tieMat);
  tie.position.set(0, 0.28, 0.165);
  tie.rotation.z = 0.06;
  upperBody.add(tie);

  // Jacket lapels
  [-0.1, 0.1].forEach((lx) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.05), coatMat);
    lapel.position.set(lx, 0.33, 0.155);
    lapel.rotation.z = lx < 0 ? 0.18 : -0.18;
    upperBody.add(lapel);
  });

  // Outstretched zombie arms with sleeves + green hands
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.42, 0.02);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), coatMat);
    arm.add(shoulder);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.32, 6, 8), coatMat);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.set(0, 0, 0.19);
    sleeve.castShadow = true;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMat);
    hand.scale.set(0.95, 0.85, 1.2);
    hand.position.set(0, 0, 0.41);
    arm.add(hand);
    return arm;
  };
  const leftArm = makeArm(-0.265);
  const rightArm = makeArm(0.265);
  upperBody.add(leftArm, rightArm);

  // Sculpted expressive zombie head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.67, 0.04);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 12), skinMat);
  skull.scale.set(0.94, 1.08, 0.96);
  skull.castShadow = true;
  headGroup.add(skull);

  // Prominent goofy jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.14, 0.24), skinMat);
  jaw.position.set(0, -0.11, 0.03);
  jaw.castShadow = true;
  headGroup.add(jaw);

  // Messy hair strands
  const hairMat = mat(0x292524, 0.9);
  for (let h = -1; h <= 1; h++) {
    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.18), hairMat);
    strand.position.set(h * 0.07, 0.22, -0.02);
    strand.rotation.z = h * 0.28;
    headGroup.add(strand);
  }

  // Mismatched bulging cartoon eyes with dark sockets
  const socketMat = mat(0x4a5d34, 0.85);
  const eyeWhite = mat(0xfefce8, 0.2);
  const pupilMat = mat(0x0f172a, 0.15);

  const addEye = (ex, ey, r) => {
    const sock = new THREE.Mesh(new THREE.SphereGeometry(r * 1.24, 8, 8), socketMat);
    sock.position.set(ex, ey, 0.155);
    headGroup.add(sock);
    const white = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), eyeWhite);
    white.position.set(ex, ey, 0.175);
    headGroup.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.44, 8, 8), pupilMat);
    pupil.position.set(ex + (ex < 0 ? 0.008 : -0.006), ey, 0.175 + r * 0.82);
    headGroup.add(pupil);
  };
  addEye(-0.082, 0.045, 0.064);
  addEye(0.082, 0.058, 0.048);

  // Open mouth + crooked teeth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.082, 0.05), mat(0x450a0a, 0.9));
  mouth.position.set(0, -0.095, 0.145);
  headGroup.add(mouth);
  const toothMat = mat(0xfef3c7, 0.4);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.035), toothMat);
  t1.position.set(-0.038, -0.072, 0.168);
  headGroup.add(t1);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.034, 0.035), toothMat);
  t2.position.set(0.042, -0.118, 0.168);
  headGroup.add(t2);

  // Detachable Armor or Wave Flag
  let armorMesh = null;
  if (type === 'cone') {
    const coneGroup = new THREE.Group();
    const coneOrange = mat(0xf97316, 0.45, 0.05);
    const coneBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.44), coneOrange);
    coneBase.castShadow = true;
    coneGroup.add(coneBase);
    const coneBody = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 14), coneOrange);
    coneBody.position.y = 0.27;
    coneBody.castShadow = true;
    coneGroup.add(coneBody);
    const stripe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.145, 0.09, 14), mat(0xf8fafc, 0.35, 0.1));
    stripe1.position.y = 0.21;
    coneGroup.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.082, 0.065, 14), mat(0xf8fafc, 0.35, 0.1));
    stripe2.position.y = 0.36;
    coneGroup.add(stripe2);
    coneGroup.position.set(0, 0.2, 0);
    coneGroup.rotation.z = -0.1;
    headGroup.add(coneGroup);
    armorMesh = coneGroup;
  } else if (type === 'bucket') {
    const bucketGroup = new THREE.Group();
    const metalMat = mat(0x94a3b8, 0.22, 0.85);
    const bucketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.195, 0.38, 16), metalMat);
    bucketBody.castShadow = true;
    bucketGroup.add(bucketBody);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.025, 8, 18), mat(0xe2e8f0, 0.18, 0.9));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.17;
    bucketGroup.add(rim);
    // Wire bail handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 6, 16, Math.PI), mat(0xcbd5e1, 0.2, 0.9));
    handle.position.set(0, -0.02, 0.05);
    handle.rotation.x = 0.85;
    bucketGroup.add(handle);
    // Red paint splash
    const splashMat = mat(0xdc2626, 0.35, 0.08);
    const splash = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), splashMat);
    splash.scale.set(1.0, 1.25, 0.25);
    splash.position.set(0.08, 0.04, 0.2);
    bucketGroup.add(splash);
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 6), splashMat);
    drip.position.set(0.12, -0.08, 0.21);
    bucketGroup.add(drip);

    bucketGroup.position.set(0, 0.2, 0);
    bucketGroup.rotation.z = 0.12;
    bucketGroup.rotation.x = -0.08;
    headGroup.add(bucketGroup);
    armorMesh = bucketGroup;
  } else if (type === 'flag') {
    const flagGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.42, 8), mat(0x92400e, 0.82));
    pole.position.set(0, 0.56, 0.42);
    pole.castShadow = true;
    flagGroup.add(pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xfacc15, 0.3, 0.6));
    finial.position.set(0, 1.28, 0.42);
    flagGroup.add(finial);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.03), mat(0xdc2626, 0.65));
    cloth.position.set(0.28, 1.02, 0.42);
    cloth.castShadow = true;
    flagGroup.add(cloth);
    const brain = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), mat(0xf472b6, 0.45));
    brain.scale.set(1.25, 0.85, 0.45);
    brain.position.set(0.28, 1.02, 0.445);
    flagGroup.add(brain);
    leftArm.add(flagGroup);
    g.userData.flagCloth = cloth;
  }

  upperBody.add(headGroup);
  g.add(upperBody);

  g.userData = {
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    upperBody,
    headGroup,
    armorMesh,
    tintableMats,
    originalColors: tintableMats.map((m) => m.color.clone()),
  };

  return g;
}

// ==========================================
// LUMINOUS SUN & GLOSSY PEA MODELS
// ==========================================
export function createSunMesh() {
  const tex = getTextures();
  const g = new THREE.Group();

  // Warm additive glow halo sprite behind the sun
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex.sunGlow,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.scale.set(1.42, 1.42, 1);
  g.add(halo);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfacc15,
      emissiveIntensity: 0.95,
      roughness: 0.18,
    })
  );
  g.add(core);

  const rays = new THREE.Group();
  const rayMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const rayGeo = new THREE.ConeGeometry(0.11, 0.24, 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = new THREE.Mesh(rayGeo, rayMat);
    r.position.set(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0);
    r.rotation.z = a - Math.PI / 2;
    rays.add(r);
  }
  g.add(rays);

  // Generous invisible touch hit sphere for effortless mobile tapping
  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitSphere.userData.isSunHit = true;
  g.add(hitSphere);

  g.userData.rays = rays;
  g.userData.halo = halo;
  g.userData.hitSphere = hitSphere;
  return g;
}

export function createPeaMesh(isIce = false) {
  const tex = getTextures();
  const g = new THREE.Group();
  const peaMat = new THREE.MeshStandardMaterial({
    color: isIce ? 0xbae6fd : 0x4ade80,
    emissive: isIce ? 0x0ea5e9 : 0x16a34a,
    emissiveIntensity: isIce ? 0.65 : 0.3,
    roughness: 0.16,
    metalness: isIce ? 0.2 : 0.05,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10), peaMat);
  sphere.castShadow = true;
  g.add(sphere);

  if (isIce) {
    const aura = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.19, 0),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.55, wireframe: true })
    );
    g.add(aura);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.iceGlow,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(0.62, 0.62, 1);
    g.add(glow);
    g.userData.aura = aura;
  }
  return g;
}

// ==========================================
// TILE SELECTION RETICLE
// ==========================================
export function createHoverReticle() {
  const g = new THREE.Group();
  const size = GRID.TILE_SIZE - 0.05;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.055;
  g.add(plane);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.4, size * 0.48, 4),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.rotation.z = Math.PI / 4;
  ring.position.y = 0.06;
  g.add(ring);

  g.userData.planeMat = plane.material;
  g.userData.ringMat = ring.material;
  g.visible = false;
  return g;
}
