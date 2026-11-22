export const GRID = {
  LANES: 5,
  ROWS: 9,
  TILE_SIZE: 1.15,
};

// Derived world bounds for the longer 5x9 lawn centered at (0, 0, 0)
export const LAWN_WIDTH = GRID.LANES * GRID.TILE_SIZE; // 5.75
export const LAWN_DEPTH = GRID.ROWS * GRID.TILE_SIZE;  // 10.35
export const SPAWN_Z = -LAWN_DEPTH / 2 - 1.1;          // Top edge (road) where zombies appear
export const MOWER_Z = LAWN_DEPTH / 2 + 0.62;          // Bottom edge where lawnmowers park
export const HOUSE_BREACH_Z = LAWN_DEPTH / 2 + 1.18;   // Game over threshold if mower already gone

export function laneToX(lane) {
  return (lane - (GRID.LANES - 1) / 2) * GRID.TILE_SIZE;
}

export function rowToZ(row) {
  return (row - (GRID.ROWS - 1) / 2) * GRID.TILE_SIZE;
}

export function worldToGrid(x, z) {
  const lane = Math.round(x / GRID.TILE_SIZE + (GRID.LANES - 1) / 2);
  const row = Math.round(z / GRID.TILE_SIZE + (GRID.ROWS - 1) / 2);
  if (lane < 0 || lane >= GRID.LANES || row < 0 || row >= GRID.ROWS) {
    return null;
  }
  return { lane, row };
}

export const ECONOMY = {
  STARTING_SUN: 175,
  SUN_VALUE: 25,
  SKY_SUN_FIRST_DELAY: 2.0,
  SKY_SUN_INTERVAL: 5.0,
  SUN_LIFETIME: 12.0,
};

export const PLANT_TYPES = {
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    cost: 50,
    hp: 150,
    cooldown: 4.2,
    firstSunDelay: 4.8,
    sunInterval: 9.8,
    color: '#fbbf24',
    accent: '#92400e',
    tip: 'Sun +25 ထုတ်ပေးသည်',
  },
  peashooter: {
    id: 'peashooter',
    name: 'Peashooter',
    cost: 100,
    hp: 150,
    cooldown: 4.2,
    fireRate: 1.3,
    damage: 20,
    peaSpeed: 7.6,
    color: '#4ade80',
    accent: '#15803d',
    tip: 'တစ်လိုင်းလုံး ပဲစေ့ပစ်တိုက်ခိုက်သည်',
  },
  wallnut: {
    id: 'wallnut',
    name: 'Wall-nut',
    cost: 50,
    hp: 1000,
    cooldown: 9.5,
    color: '#d97706',
    accent: '#78350f',
    tip: 'Zombie တွေကို တားဆီးပေးသည်',
  },
  snowpea: {
    id: 'snowpea',
    name: 'Snow Pea',
    cost: 175,
    hp: 150,
    cooldown: 5.2,
    fireRate: 1.3,
    damage: 20,
    peaSpeed: 7.6,
    chillDuration: 4.5,
    chillFactor: 0.45,
    color: '#38bdf8',
    accent: '#0369a1',
    tip: 'Zombie တွေကို အေးခဲနှေးစေသည်',
  },
  cherrybomb: {
    id: 'cherrybomb',
    name: 'Cherry',
    cost: 150,
    hp: 9999,
    cooldown: 13.0,
    fuseTime: 0.82,
    damage: 1800,
    radius: GRID.TILE_SIZE * 1.65,
    color: '#ef4444',
    accent: '#7f1d1d',
    tip: '3×3 ဧရိယာ ဗုံးခွဲတိုက်ခိုက်သည်!',
  },
};

export const PLANT_ORDER = ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'cherrybomb'];

export const ZOMBIE_TYPES = {
  basic: {
    id: 'basic',
    name: 'Zombie',
    hp: 100,
    armorHp: 0,
    armorType: null,
    speed: 0.39,
    biteDamage: 18,
    biteInterval: 0.54,
    scale: 1.0,
  },
  flag: {
    id: 'flag',
    name: 'Flag Zombie',
    hp: 120,
    armorHp: 0,
    armorType: null,
    speed: 0.47,
    biteDamage: 18,
    biteInterval: 0.52,
    scale: 1.04,
  },
  cone: {
    id: 'cone',
    name: 'Conehead',
    hp: 100,
    armorHp: 130,
    armorType: 'cone',
    speed: 0.38,
    biteDamage: 18,
    biteInterval: 0.54,
    scale: 1.02,
  },
  bucket: {
    id: 'bucket',
    name: 'Buckethead',
    hp: 100,
    armorHp: 250,
    armorType: 'bucket',
    speed: 0.36,
    biteDamage: 20,
    biteInterval: 0.54,
    scale: 1.05,
  },
};

// Short, fun single-level timeline with relaxed pacing on the longer 9-row lawn
export const LEVEL_EVENTS = [
  { time: 1.0, banner: 'Zombie တွေ ရောက်လာပြီ!', sub: 'Sunflower နဲ့ Peashooter တွေ အရင်စိုက်ပါ', style: 'info' },
  { time: 5.5, type: 'basic' },
  { time: 14.0, type: 'basic' },

  { time: 22.0, type: 'basic' },
  { time: 26.5, type: 'cone' },
  { time: 33.0, type: 'basic' },
  { time: 36.5, type: 'cone' },

  { time: 43.5, type: 'basic' },
  { time: 46.5, type: 'cone' },
  { time: 51.0, type: 'bucket' },
  { time: 54.0, type: 'basic' },

  { time: 60.0, banner: 'Zombie အုပ်စုကြီး ချီတက်လာနေပြီ!', style: 'warning', sound: 'wave' },
  { time: 63.0, banner: 'FINAL WAVE!', sub: 'နောက်ဆုံးလှိုင်း ရောက်လာပြီ!', style: 'danger' },
  { time: 63.3, type: 'flag', forcedLane: 2 },
  { time: 64.1, type: 'cone', forcedLane: 0 },
  { time: 64.9, type: 'basic', forcedLane: 4 },
  { time: 65.8, type: 'bucket', forcedLane: 1 },
  { time: 66.8, type: 'cone', forcedLane: 3 },
];

export const TOTAL_ZOMBIES = LEVEL_EVENTS.filter((e) => e.type).length;
export const FINAL_WAVE_TIME = 63.0;
export const LEVEL_SPAWN_DURATION = 67.0;
