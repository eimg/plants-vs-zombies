import * as THREE from 'three';

function makeCanvas(w, h, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  return canvas;
}

function toTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Seeded pseudo-random so textures look deterministic & handcrafted
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cached = null;

export function getTextures() {
  if (cached) return cached;

  // 1. Grass Tile (Light & Dark) with blades, organic mottling & optional soft tile bevel
  const makeGrass = (baseHex, hiHex, loHex, seed, withBevel = true) => {
    const rand = mulberry32(seed);
    const c = makeCanvas(256, 256, (ctx, w, h) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, w, h);

      // Soft dappled sun mottling
      for (let i = 0; i < 45; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 18 + rand() * 38;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rand() > 0.5 ? 'rgba(255,255,200,0.08)' : 'rgba(20,70,20,0.08)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fine manicured grass blade strokes
      for (let i = 0; i < 650; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const len = 5 + rand() * 10;
        const lean = (rand() - 0.5) * 4;
        ctx.strokeStyle = rand() > 0.45 ? hiHex : loHex;
        ctx.globalAlpha = 0.28 + rand() * 0.35;
        ctx.lineWidth = 1.1 + rand() * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean, y - len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (withBevel) {
        // Subtle inner bevel for crisp readable grid tiles
        const edge = ctx.createLinearGradient(0, 0, 0, h);
        edge.addColorStop(0, 'rgba(255,255,255,0.12)');
        edge.addColorStop(0.08, 'rgba(255,255,255,0)');
        edge.addColorStop(0.92, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, w, h);
      }
    });
    return toTexture(c);
  };

  // Grass bump map for tactile sheen
  const grassBumpCanvas = makeCanvas(256, 256, (ctx, w, h) => {
    const rand = mulberry32(901);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const v = Math.floor(95 + rand() * 90);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 4, y - (4 + rand() * 8));
      ctx.stroke();
    }
  });

  // 2. Outer yard lawn (seamless tiled meadow without tile bevel lines)
  const outerGrass = makeGrass('#3e8e39', '#56ab48', '#2c6c29', 77, false);
  outerGrass.repeat.set(14, 14);

  // 3. Asphalt Road with fine aggregate speckle & worn tire tracks
  const roadCanvas = makeCanvas(512, 256, (ctx, w, h) => {
    const rand = mulberry32(404);
    ctx.fillStyle = '#383d45';
    ctx.fillRect(0, 0, w, h);

    // Subtle darker tire wear bands
    ctx.fillStyle = 'rgba(20,24,30,0.22)';
    ctx.fillRect(0, h * 0.22, w, h * 0.16);
    ctx.fillRect(0, h * 0.62, w, h * 0.16);

    // Aggregate speckle
    for (let i = 0; i < 4500; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const shade = Math.floor(42 + rand() * 52);
      ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 6},0.45)`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Hairline cracks
    ctx.strokeStyle = 'rgba(18,20,24,0.45)';
    ctx.lineWidth = 1.4;
    for (let c = 0; c < 4; c++) {
      let x = rand() * w;
      let y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 8; s++) {
        x += (rand() - 0.5) * 28;
        y += (rand() - 0.5) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });

  // 4. Concrete sidewalk / stone paver strip
  const stoneCanvas = makeCanvas(512, 128, (ctx, w, h) => {
    const rand = mulberry32(303);
    ctx.fillStyle = '#d3d5cf';
    ctx.fillRect(0, 0, w, h);

    // Paver blocks
    const cols = 8;
    const rows = 2;
    const bw = w / cols;
    const bh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = r % 2 === 1 ? bw * 0.5 : 0;
        const bx = (c * bw + offset) % w;
        const tone = 202 + Math.floor(rand() * 20);
        ctx.fillStyle = `rgb(${tone},${tone - 2},${tone - 7})`;
        ctx.fillRect(bx + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
    // Fine concrete grain
    for (let i = 0; i < 1800; i++) {
      const shade = Math.floor(155 + rand() * 70);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.28)`;
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
    // Grout lines
    ctx.strokeStyle = 'rgba(90,95,90,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, bh);
    ctx.lineTo(w, bh);
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * bw, 0);
      ctx.lineTo(c * bw, bh);
      ctx.moveTo((c * bw + bw * 0.5) % w, bh);
      ctx.lineTo((c * bw + bw * 0.5) % w, h);
    }
    ctx.stroke();
  });

  // 5. Warm Wooden Porch Planks
  const woodCanvas = makeCanvas(512, 256, (ctx, w, h) => {
    const rand = mulberry32(555);
    const planks = 6;
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * ph;
      const r = 148 + Math.floor(rand() * 22);
      const g = 88 + Math.floor(rand() * 16);
      const b = 46 + Math.floor(rand() * 12);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, w, ph);

      // Wood grain streaks
      for (let s = 0; s < 35; s++) {
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(65,30,10,0.16)' : 'rgba(220,165,105,0.12)';
        ctx.lineWidth = 1 + rand() * 2;
        const gy = y + rand() * ph;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(w * 0.33, gy + (rand() - 0.5) * 6, w * 0.66, gy + (rand() - 0.5) * 6, w, gy);
        ctx.stroke();
      }
      // Plank seam
      ctx.fillStyle = 'rgba(42,20,8,0.65)';
      ctx.fillRect(0, y, w, 2.5);

      // Nail heads
      ctx.fillStyle = 'rgba(40,25,18,0.6)';
      for (let nx = 32; nx < w; nx += 128) {
        ctx.beginPath();
        ctx.arc(nx, y + 9, 2.2, 0, Math.PI * 2);
        ctx.arc(nx, y + ph - 9, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // 6. Woven Coir Welcome Doormat
  const doormatCanvas = makeCanvas(256, 128, (ctx, w, h) => {
    const rand = mulberry32(808);
    ctx.fillStyle = '#c47b35';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(245,205,135,0.32)' : 'rgba(110,55,15,0.32)';
      ctx.fillRect(rand() * w, rand() * h, 3, 2);
    }
    ctx.strokeStyle = '#6b3410';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#4a2108';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOME', w / 2, h / 2 + 2);
  });

  // 7. Walnut woody shell texture
  const walnutCanvas = makeCanvas(256, 256, (ctx, w, h) => {
    const rand = mulberry32(616);
    ctx.fillStyle = '#c4833e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 65; i++) {
      const x = rand() * w;
      ctx.strokeStyle = rand() > 0.5 ? 'rgba(92,46,12,0.22)' : 'rgba(245,200,140,0.18)';
      ctx.lineWidth = 2 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (rand() - 0.5) * 26, h * 0.35, x + (rand() - 0.5) * 26, h * 0.7, x, h);
      ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = 'rgba(72,34,8,0.18)';
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
  });

  // 8. Rich Soil / Mulch texture
  const soilCanvas = makeCanvas(256, 256, (ctx, w, h) => {
    const rand = mulberry32(999);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) {
      const s = rand() > 0.5 ? '#3d2410' : '#7a502c';
      ctx.fillStyle = s;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 3);
    }
    ctx.globalAlpha = 1;
  });

  // 9. Soft Radial Glow Sprite (for Suns, Lamps, Frost, Explosions)
  const makeRadialSprite = (stops) => {
    const c = makeCanvas(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      stops.forEach(([offset, color]) => g.addColorStop(offset, color));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const sunGlow = makeRadialSprite([
    [0, 'rgba(255,252,210,0.95)'],
    [0.32, 'rgba(253,224,71,0.58)'],
    [0.68, 'rgba(251,146,60,0.18)'],
    [1, 'rgba(251,146,60,0)'],
  ]);

  const iceGlow = makeRadialSprite([
    [0, 'rgba(224,242,254,0.9)'],
    [0.45, 'rgba(56,189,248,0.45)'],
    [1, 'rgba(56,189,248,0)'],
  ]);

  const lampGlow = makeRadialSprite([
    [0, 'rgba(255,250,205,0.95)'],
    [0.4, 'rgba(253,224,71,0.35)'],
    [1, 'rgba(253,224,71,0)'],
  ]);

  const contactShadow = makeRadialSprite([
    [0, 'rgba(10,28,10,0.46)'],
    [0.55, 'rgba(10,28,10,0.22)'],
    [1, 'rgba(10,28,10,0)'],
  ]);

  cached = {
    grassLight: makeGrass('#66cc4e', '#86e36a', '#4da639', 101),
    grassDark: makeGrass('#50b63e', '#6fd158', '#3c912d', 202),
    grassBump: toTexture(grassBumpCanvas, { srgb: false }),
    outerGrass,
    road: toTexture(roadCanvas, { repeatX: 4, repeatY: 1 }),
    stone: toTexture(stoneCanvas, { repeatX: 2, repeatY: 1 }),
    sidewalk: toTexture(stoneCanvas, { repeatX: 7, repeatY: 1 }),
    wood: toTexture(woodCanvas, { repeatX: 2, repeatY: 1 }),
    doormat: toTexture(doormatCanvas),
    walnut: toTexture(walnutCanvas),
    soil: toTexture(soilCanvas, { repeatX: 3, repeatY: 4 }),
    sunGlow,
    iceGlow,
    lampGlow,
    contactShadow,
  };

  return cached;
}

// Procedural studio/garden sky environment map for realistic specular reflections on buckets, eyes & mowers
export function createGardenEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  // Gradient sky dome inside virtual env scene
  const skyCanvas = makeCanvas(256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#38bdf8');
    g.addColorStop(0.45, '#bae6fd');
    g.addColorStop(0.54, '#fef3c7');
    g.addColorStop(0.6, '#4d9a3e');
    g.addColorStop(1.0, '#224a20');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Bright virtual sun disc for crisp specular glints
    const sunGrad = ctx.createRadialGradient(w * 0.72, h * 0.25, 2, w * 0.72, h * 0.25, 28);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.4, '#fef08a');
    sunGrad.addColorStop(1, 'rgba(254,240,138,0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);
  });

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  envScene.add(dome);

  const envRT = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  skyTex.dispose();
  return envRT.texture;
}
