import * as THREE from 'three';
import {
  GRID,
  LAWN_WIDTH,
  LAWN_DEPTH,
  SPAWN_Z,
  MOWER_Z,
  HOUSE_BREACH_Z,
  ECONOMY,
  PLANT_TYPES,
  PLANT_ORDER,
  ZOMBIE_TYPES,
  LEVEL_EVENTS,
  TOTAL_ZOMBIES,
  LEVEL_SPAWN_DURATION,
  laneToX,
  rowToZ,
  worldToGrid,
} from './config.js';
import {
  createEnvironment,
  createLawnmowerMesh,
  createPlantMesh,
  createZombieMesh,
  createSunMesh,
  createPeaMesh,
  createHoverReticle,
} from './models.js';
import { ParticleSystem } from './particles.js';
import { createGardenEnvMap } from './textures.js';
import { soundFX } from './audio.js';

export class PvZGame {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'victory' | 'gameover'
    this.elapsedTime = 0;
    this.sun = ECONOMY.STARTING_SUN;
    this.skySunTimer = ECONOMY.SKY_SUN_FIRST_DELAY;

    this.selectedPlant = null;
    this.shovelMode = false;
    this.cooldowns = {};
    PLANT_ORDER.forEach((id) => { this.cooldowns[id] = 0; });

    this.grid = Array.from({ length: GRID.ROWS }, () => Array(GRID.LANES).fill(null));
    this.plants = [];
    this.zombies = [];
    this.dyingZombies = [];
    this.peas = [];
    this.suns = [];
    this.mowers = [];

    this.nextEventIndex = 0;
    this.lastSpawnLane = -1;
    this.zombiesSpawned = 0;
    this.zombiesDefeated = 0;
    this.plantsPlaced = 0;
    this.victoryDelay = 0;

    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.menuTime = 0;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.04);
    this.hoveredCell = null;

    this._initThree();
    this._initScene();
    this._initMowers();
    this._bindInput();

    this._lastFrame = performance.now();
    this._rafId = requestAnimationFrame((now) => this._loop(now));
    this._emitHUD();
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc);
    this.scene.fog = new THREE.Fog(0x8fd8f8, 22, 42);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 80);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // Procedural sunlit garden sky environment map for metallic & glossy specular reflections
    this.scene.environment = createGardenEnvMap(this.renderer);
    this.scene.environmentIntensity = 0.65;

    this.container.appendChild(this.renderer.domElement);

    // Base camera framing anchor (computed dynamically in _updateCameraFraming)
    this.baseCamPos = new THREE.Vector3();
    this.baseCamLookAt = new THREE.Vector3(0, 0, 0.45);
    this._updateCameraFraming();

    window.addEventListener('resize', () => this._onResize());
  }

  _updateCameraFraming() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    const isPortraitMobile = aspect < 0.72;

    this.camera.aspect = aspect;
    // Slightly wider immersive FOV + lower dramatic angle on small portrait phones
    const fov = isPortraitMobile ? 43 : 42;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    const pitch = THREE.MathUtils.degToRad(isPortraitMobile ? 53.5 : 56);
    const vFovRad = THREE.MathUtils.degToRad(fov);
    const tanHalfFov = Math.tan(vFovRad / 2);

    // Frame the 5 lanes cleanly across small portrait phones while keeping the familiar cozy angle
    const worldWidth = isPortraitMobile ? LAWN_WIDTH + 0.55 : LAWN_WIDTH + 1.05;
    const worldDepth = LAWN_DEPTH + (isPortraitMobile ? 3.25 : 3.55);

    const usableHeightFrac = isPortraitMobile ? 0.75 : 0.72;

    const dWidth = (worldWidth / 2) / (tanHalfFov * aspect * (isPortraitMobile ? 0.98 : 0.96));
    const dHeight = ((worldDepth * Math.sin(pitch)) / 2) / (tanHalfFov * usableHeightFrac);
    const dist = Math.max(dWidth, dHeight);

    // Offset lookAt slightly toward +Z so bottom seed tray sits cleanly below the 5 lawnmowers
    this.baseCamLookAt.set(0, 0, isPortraitMobile ? 1.0 : 0.85);
    this.baseCamPos.set(
      0,
      this.baseCamLookAt.y + dist * Math.sin(pitch),
      this.baseCamLookAt.z + dist * Math.cos(pitch)
    );
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseCamLookAt);
  }

  _onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this._updateCameraFraming();
  }

  _initScene() {
    // Golden-hour suburban sunlit sky + crisp soft shadows
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x2a662d, 0.85);
    this.scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.6);
    sunLight.position.set(8.0, 15.5, 8.0);
    sunLight.castShadow = true;
    const shadowRes = window.innerWidth > 720 ? 2048 : 1024;
    sunLight.shadow.mapSize.width = shadowRes;
    sunLight.shadow.mapSize.height = shadowRes;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 42;
    sunLight.shadow.camera.left = -9.5;
    sunLight.shadow.camera.right = 9.5;
    sunLight.shadow.camera.top = 12.8;
    sunLight.shadow.camera.bottom = -12.8;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    this.scene.add(sunLight);

    // Cool sky rim light from back-left so characters pop with 3D edge highlights
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.48);
    fill.position.set(-9, 8, -7);
    this.scene.add(fill);

    const { tileMeshes } = createEnvironment(this.scene);
    this.tileMeshes = tileMeshes;

    this.particles = new ParticleSystem(this.scene);

    // Selection reticle & ghost preview container
    this.reticle = createHoverReticle();
    this.scene.add(this.reticle);
    this.ghostGroup = new THREE.Group();
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);
    this._ghostPlantType = null;
  }

  _initMowers() {
    for (const m of this.mowers) {
      this.scene.remove(m.mesh);
    }
    this.mowers = [];
    for (let lane = 0; lane < GRID.LANES; lane++) {
      const mesh = createLawnmowerMesh();
      mesh.position.set(laneToX(lane), 0, MOWER_Z);
      this.scene.add(mesh);
      this.mowers.push({
        lane,
        mesh,
        state: 'ready', // 'ready' | 'active' | 'gone'
        z: MOWER_Z,
        particleTimer: 0,
      });
    }
  }

  // ==========================================
  // PUBLIC CONTROLS (called by UI)
  // ==========================================
  startGame() {
    soundFX.unlock();
    this._resetEntities();
    this.state = 'playing';
    this._emitHUD();
    this.callbacks.onStateChange?.('playing');
  }

  restartGame() {
    this.startGame();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.callbacks.onStateChange?.('paused');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this._lastFrame = performance.now();
      this.callbacks.onStateChange?.('playing');
    }
  }

  selectPlant(typeId) {
    if (this.state !== 'playing') return;
    soundFX.unlock();
    const def = PLANT_TYPES[typeId];
    if (!def) return;

    if (this.selectedPlant === typeId) {
      this.selectedPlant = null;
      this._hidePreview();
      soundFX.playSelect();
      this._emitHUD();
      return;
    }

    if (this.sun < def.cost || this.cooldowns[typeId] > 0) {
      soundFX.playError();
      this.callbacks.onInsufficientSun?.(typeId);
      return;
    }

    this.shovelMode = false;
    this.selectedPlant = typeId;
    this._setGhostType(typeId);
    soundFX.playSelect();
    this._emitHUD();
  }

  toggleShovel() {
    if (this.state !== 'playing') return;
    soundFX.unlock();
    this.shovelMode = !this.shovelMode;
    if (this.shovelMode) {
      this.selectedPlant = null;
      this._hidePreview();
    }
    soundFX.playSelect();
    this._emitHUD();
  }

  cancelSelection() {
    this.selectedPlant = null;
    this.shovelMode = false;
    this._hidePreview();
    this._emitHUD();
  }

  _resetEntities() {
    for (const p of this.plants) this.scene.remove(p.mesh);
    for (const z of this.zombies) this.scene.remove(z.mesh);
    for (const dz of this.dyingZombies) this.scene.remove(dz.mesh);
    for (const pea of this.peas) this.scene.remove(pea.mesh);
    for (const s of this.suns) this.scene.remove(s.mesh);
    this.particles.clear();

    this.grid = Array.from({ length: GRID.ROWS }, () => Array(GRID.LANES).fill(null));
    this.plants = [];
    this.zombies = [];
    this.dyingZombies = [];
    this.peas = [];
    this.suns = [];

    this._initMowers();

    this.elapsedTime = 0;
    this.sun = ECONOMY.STARTING_SUN;
    this.skySunTimer = ECONOMY.SKY_SUN_FIRST_DELAY;
    this.selectedPlant = null;
    this.shovelMode = false;
    PLANT_ORDER.forEach((id) => { this.cooldowns[id] = 0; });

    this.nextEventIndex = 0;
    this.lastSpawnLane = -1;
    this.zombiesSpawned = 0;
    this.zombiesDefeated = 0;
    this.plantsPlaced = 0;
    this.victoryDelay = 0;
    this.shakeTime = 0;
    this._hidePreview();
  }

  // ==========================================
  // INPUT & RAYCASTING (Mobile Touch + Mouse)
  // ==========================================
  _bindInput() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', (e) => {
      if (this.state !== 'playing') return;
      this._updatePointerNDC(e);
      // Allow easy finger-swipe sun collection on touch devices too!
      if (e.buttons > 0 || e.pointerType === 'touch') {
        this._tryCollectSunAtPointer(e.clientX, e.clientY);
      }
      this._updateHoverPreview();
    });

    dom.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return;
      soundFX.unlock();
      this._updatePointerNDC(e);

      // Priority 1: Always collect sun if user tapped near one (never wastes plant selection!)
      if (this._tryCollectSunAtPointer(e.clientX, e.clientY)) {
        return;
      }

      // Priority 2: Interact with lawn tile (plant or shovel)
      const cell = this._raycastCell();
      if (!cell) {
        if (this.selectedPlant || this.shovelMode) {
          this.cancelSelection();
        }
        return;
      }

      if (this.shovelMode) {
        this._tryShovelCell(cell.lane, cell.row);
      } else if (this.selectedPlant) {
        this._tryPlantCell(cell.lane, cell.row);
      }
    });

    dom.addEventListener('pointerleave', () => {
      this._hidePreview();
    });
  }

  _updatePointerNDC(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _raycastCell() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitPoint = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
      return null;
    }
    return worldToGrid(hitPoint.x, hitPoint.z);
  }

  _tryCollectSunAtPointer(clientX, clientY) {
    const collectible = this.suns.filter((s) => !s.collected);
    if (collectible.length === 0) return false;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitTargets = collectible.map((s) => s.mesh.userData.hitSphere);
    const hits = this.raycaster.intersectObjects(hitTargets, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const sunObj = collectible.find((s) => s.mesh.userData.hitSphere === hitObj);
      if (sunObj) {
        this._collectSun(sunObj, clientX, clientY);
        return true;
      }
    }
    return false;
  }

  _collectSun(sunObj, clientX, clientY) {
    sunObj.collected = true;
    sunObj.collectProgress = 0;
    sunObj.collectStart.copy(sunObj.mesh.position);
    this.sun += ECONOMY.SUN_VALUE;
    soundFX.playSunCollect();
    navigator.vibrate?.(12);
    this.particles.burst(sunObj.mesh.position, 0xfacc15, 8, 2.3, 3.0, 0.9, 0xf59e0b);
    this.particles.spawnSunPulse(sunObj.mesh.position);
    this.callbacks.onSunCollected?.(ECONOMY.SUN_VALUE, clientX, clientY);
    this._emitHUD();
  }

  _setGhostType(typeId) {
    if (this._ghostPlantType === typeId) return;
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }
    const preview = createPlantMesh(typeId);
    preview.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        obj.material = obj.material.clone();
        obj.material.transparent = true;
        obj.material.opacity = 0.52;
        obj.castShadow = false;
      }
    });
    this.ghostGroup.add(preview);
    this._ghostPlantType = typeId;
  }

  _hidePreview() {
    this.reticle.visible = false;
    this.ghostGroup.visible = false;
    this.hoveredCell = null;
  }

  _updateHoverPreview() {
    if (!this.selectedPlant && !this.shovelMode) {
      this._hidePreview();
      return;
    }
    const cell = this._raycastCell();
    if (!cell) {
      this._hidePreview();
      return;
    }
    this.hoveredCell = cell;
    const x = laneToX(cell.lane);
    const z = rowToZ(cell.row);
    const occupied = Boolean(this.grid[cell.row][cell.lane]);

    this.reticle.position.set(x, 0, z);
    this.reticle.visible = true;

    if (this.shovelMode) {
      this.ghostGroup.visible = false;
      const color = occupied ? 0xef4444 : 0x94a3b8;
      this.reticle.userData.planeMat.color.setHex(color);
      this.reticle.userData.planeMat.opacity = occupied ? 0.42 : 0.18;
    } else {
      const canPlace = !occupied;
      this.reticle.userData.planeMat.color.setHex(canPlace ? 0xfef08a : 0xef4444);
      this.reticle.userData.planeMat.opacity = canPlace ? 0.35 : 0.42;
      this.ghostGroup.position.set(x, 0.04, z);
      this.ghostGroup.visible = canPlace;
    }
  }

  _tryPlantCell(lane, row) {
    if (this.grid[row][lane]) {
      soundFX.playError();
      return;
    }
    const typeId = this.selectedPlant;
    const def = PLANT_TYPES[typeId];
    if (!def || this.sun < def.cost || this.cooldowns[typeId] > 0) {
      soundFX.playError();
      return;
    }

    this.sun -= def.cost;
    this.cooldowns[typeId] = def.cooldown;
    this.plantsPlaced += 1;

    const x = laneToX(lane);
    const z = rowToZ(row);
    const mesh = createPlantMesh(typeId);
    mesh.position.set(x, 0.04, z);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);

    const plant = {
      type: typeId,
      def,
      lane,
      row,
      x,
      z,
      mesh,
      hp: def.hp,
      maxHp: def.hp,
      age: 0,
      actionTimer: typeId === 'sunflower'
        ? def.firstSunDelay
        : typeId === 'cherrybomb'
          ? def.fuseTime
          : 0.45,
      recoil: 0,
      hurtFlash: 0,
      bobOffset: Math.random() * Math.PI * 2,
    };

    this.grid[row][lane] = plant;
    this.plants.push(plant);

    soundFX.playPlant();
    navigator.vibrate?.(14);
    this.particles.burst(new THREE.Vector3(x, 0.12, z), 0x854d0e, 7, 2.1, 7.5, 0.9);
    this.particles.burst(new THREE.Vector3(x, 0.2, z), 0x4ade80, 5, 2.0, 6.0, 0.75);

    this.selectedPlant = null;
    this._hidePreview();
    this._emitHUD();
  }

  _tryShovelCell(lane, row) {
    const plant = this.grid[row][lane];
    if (!plant) {
      soundFX.playError();
      return;
    }
    this._removePlant(plant);
    soundFX.playShovel();
    this.particles.burst(new THREE.Vector3(plant.x, 0.2, plant.z), 0x78350f, 10, 2.6, 8.0, 1.0);
    this.shovelMode = false;
    this._hidePreview();
    this._emitHUD();
  }

  _removePlant(plant) {
    if (this.grid[plant.row][plant.lane] === plant) {
      this.grid[plant.row][plant.lane] = null;
    }
    this.scene.remove(plant.mesh);
    const idx = this.plants.indexOf(plant);
    if (idx !== -1) this.plants.splice(idx, 1);
  }

  // ==========================================
  // SPAWNERS (Suns, Zombies, Peas)
  // ==========================================
  _spawnSun(startPos, targetPos, isFromSky = true) {
    const mesh = createSunMesh();
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.suns.push({
      mesh,
      isFromSky,
      startPos: startPos.clone(),
      targetPos: targetPos.clone(),
      travelTime: 0,
      travelDuration: isFromSky ? 2.4 : 0.65,
      landed: false,
      age: 0,
      collected: false,
      collectProgress: 0,
      collectStart: new THREE.Vector3(),
    });
  }

  _spawnZombie(typeId, forcedLane = null) {
    const def = ZOMBIE_TYPES[typeId] || ZOMBIE_TYPES.basic;
    let lane = forcedLane;
    if (lane === null || lane === undefined) {
      // Pick a lane, avoiding back-to-back repeats for lively spread
      const candidates = [];
      for (let i = 0; i < GRID.LANES; i++) {
        if (i !== this.lastSpawnLane) candidates.push(i);
      }
      lane = candidates[Math.floor(Math.random() * candidates.length)];
    }
    this.lastSpawnLane = lane;

    const x = laneToX(lane);
    const z = SPAWN_Z;
    const mesh = createZombieMesh(typeId);
    mesh.position.set(x, 0.02, z);
    mesh.scale.setScalar(def.scale);
    this.scene.add(mesh);

    this.zombiesSpawned += 1;
    this.zombies.push({
      type: typeId,
      def,
      lane,
      x,
      z,
      mesh,
      hp: def.hp,
      armorHp: def.armorHp,
      armorType: def.armorType,
      chillTimer: 0,
      hitFlash: 0,
      biteTimer: 0.25,
      isBiting: false,
      walkPhase: Math.random() * Math.PI * 2,
    });
  }

  _spawnPea(plant, isIce) {
    const mesh = createPeaMesh(isIce);
    const startZ = plant.z - 0.42;
    mesh.position.set(plant.x, 0.62, startZ);
    this.scene.add(mesh);

    this.peas.push({
      mesh,
      lane: plant.lane,
      x: plant.x,
      z: startZ,
      speed: plant.def.peaSpeed,
      damage: plant.def.damage,
      isIce,
      chillDuration: isIce ? plant.def.chillDuration : 0,
      trailTimer: 0.03,
    });
  }

  // ==========================================
  // MAIN GAME LOOP
  // ==========================================
  _loop(now) {
    this._rafId = requestAnimationFrame((t) => this._loop(t));
    const dt = Math.min(0.05, (now - this._lastFrame) / 1000);
    this._lastFrame = now;

    if (this.state === 'menu') {
      this.menuTime += dt;
      // Gentle living diorama camera sway while on start menu
      this.camera.position.x = this.baseCamPos.x + Math.sin(this.menuTime * 0.45) * 0.65;
      this.camera.position.y = this.baseCamPos.y + Math.cos(this.menuTime * 0.35) * 0.15;
      this.camera.position.z = this.baseCamPos.z;
      this.camera.lookAt(this.baseCamLookAt);
      this.particles.update(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === 'playing') {
      this._updatePlaying(dt);
    } else {
      // Keep particles settling softly during victory / gameover
      this.particles.update(dt * 0.6);
      this._updateDyingZombies(dt * 0.6);
    }

    this._updateCameraShake(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateCameraShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const amp = this.shakeIntensity * (this.shakeTime / 0.35);
      this.camera.position.set(
        this.baseCamPos.x + (Math.random() - 0.5) * amp,
        this.baseCamPos.y + (Math.random() - 0.5) * amp * 0.6,
        this.baseCamPos.z
      );
      this.camera.lookAt(this.baseCamLookAt);
    } else if (this.state !== 'menu') {
      this.camera.position.copy(this.baseCamPos);
      this.camera.lookAt(this.baseCamLookAt);
    }
  }

  _triggerShake(intensity = 0.28, duration = 0.35) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  _updatePlaying(dt) {
    this.elapsedTime += dt;

    // 1. Update seed cooldowns
    let cooldownChanged = false;
    for (const id of PLANT_ORDER) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
        cooldownChanged = true;
      }
    }

    // 2. Sky sun drops
    this.skySunTimer -= dt;
    if (this.skySunTimer <= 0) {
      this.skySunTimer = ECONOMY.SKY_SUN_INTERVAL + (Math.random() - 0.5) * 1.2;
      const lane = Math.floor(Math.random() * GRID.LANES);
      const row = 1 + Math.floor(Math.random() * (GRID.ROWS - 2));
      const tx = laneToX(lane) + (Math.random() - 0.5) * 0.45;
      const tz = rowToZ(row) + (Math.random() - 0.5) * 0.45;
      this._spawnSun(new THREE.Vector3(tx, 6.2, tz), new THREE.Vector3(tx, 0.58, tz), true);
    }

    // 3. Wave timeline events
    while (
      this.nextEventIndex < LEVEL_EVENTS.length &&
      this.elapsedTime >= LEVEL_EVENTS[this.nextEventIndex].time
    ) {
      const ev = LEVEL_EVENTS[this.nextEventIndex];
      this.nextEventIndex += 1;
      if (ev.banner) {
        this.callbacks.onBanner?.(ev.banner, ev.sub || '', ev.style || 'info');
      }
      if (ev.sound === 'wave') {
        soundFX.playWave();
      }
      if (ev.type) {
        this._spawnZombie(ev.type, ev.forcedLane);
      }
    }

    // 4. Update all active entities
    this._updatePlants(dt);
    this._updatePeas(dt);
    this._updateZombies(dt);
    this._updateDyingZombies(dt);
    this._updateMowers(dt);
    this._updateSuns(dt);
    this.particles.update(dt);

    // 5. Check Victory!
    if (
      this.nextEventIndex >= LEVEL_EVENTS.length &&
      this.zombies.length === 0 &&
      this.zombiesDefeated >= TOTAL_ZOMBIES
    ) {
      this.victoryDelay += dt;
      if (this.victoryDelay >= 0.7) {
        this.state = 'victory';
        this.cancelSelection();
        soundFX.playVictory();
        this.callbacks.onVictory?.({
          time: this.elapsedTime,
          zombiesDefeated: this.zombiesDefeated,
          plantsPlaced: this.plantsPlaced,
          mowersLeft: this.mowers.filter((m) => m.state === 'ready').length,
        });
        this.callbacks.onStateChange?.('victory');
      }
    }

    if (cooldownChanged || Math.floor(this.elapsedTime * 10) !== Math.floor((this.elapsedTime - dt) * 10)) {
      this._emitHUD();
    }
  }

  _updatePlants(dt) {
    for (let i = this.plants.length - 1; i >= 0; i--) {
      const p = this.plants[i];
      p.age += dt;

      // Pop-in elastic spawn scale
      if (p.age < 0.24) {
        const t = p.age / 0.24;
        const s = 1 + Math.sin(t * Math.PI) * 0.22;
        p.mesh.scale.setScalar(Math.min(1.2, t * 1.15) * (t > 0.7 ? s : 1));
      } else if (p.type !== 'cherrybomb') {
        p.mesh.scale.setScalar(1);
      }

      // Gentle alive bobbing
      const sway = Math.sin(p.age * 3.1 + p.bobOffset);
      if (p.mesh.userData.head) {
        p.mesh.userData.head.rotation.z = sway * 0.08;
        p.mesh.userData.head.position.y = (p.type === 'sunflower' ? 0.68 : 0.62) + Math.abs(sway) * 0.03;
      }

      // Shoot recoil recovery
      if (p.recoil > 0) {
        p.recoil = Math.max(0, p.recoil - dt * 5.5);
        if (p.mesh.userData.head) {
          p.mesh.userData.head.position.z = p.recoil * 0.16;
          p.mesh.userData.head.scale.set(1 + p.recoil * 0.14, 1 - p.recoil * 0.1, 1 - p.recoil * 0.14);
        }
      } else if (p.mesh.userData.head) {
        p.mesh.userData.head.position.z = 0;
        p.mesh.userData.head.scale.set(1, 1, 1);
      }

      // Hurt wobble
      if (p.hurtFlash > 0) {
        p.hurtFlash = Math.max(0, p.hurtFlash - dt);
        p.mesh.rotation.z = Math.sin(p.hurtFlash * 42) * 0.1;
      } else {
        p.mesh.rotation.z = 0;
      }

      // Plant-specific behaviors
      if (p.type === 'sunflower') {
        p.actionTimer -= dt;
        // Warm glow & radiant halo right before producing sun
        const glow = p.actionTimer < 1.35 ? (1.35 - p.actionTimer) / 1.35 : 0;
        if (p.mesh.userData.faceMat) {
          p.mesh.userData.faceMat.emissive.setHex(0xf59e0b);
          p.mesh.userData.faceMat.emissiveIntensity = glow * 0.85;
        }
        if (p.mesh.userData.sunHalo) {
          p.mesh.userData.sunHalo.material.opacity = glow * 0.85;
          p.mesh.userData.sunHalo.scale.setScalar(1.0 + glow * 0.55);
        }
        if (p.actionTimer <= 0) {
          p.actionTimer = p.def.sunInterval;
          const ox = (Math.random() - 0.5) * 0.65;
          const oz = 0.25 + (Math.random() - 0.5) * 0.45;
          this._spawnSun(
            new THREE.Vector3(p.x, 0.78, p.z),
            new THREE.Vector3(
              THREE.MathUtils.clamp(p.x + ox, -LAWN_WIDTH / 2 + 0.35, LAWN_WIDTH / 2 - 0.35),
              0.56,
              THREE.MathUtils.clamp(p.z + oz, -LAWN_DEPTH / 2 + 0.35, LAWN_DEPTH / 2 - 0.35)
            ),
            false
          );
        }
      } else if (p.type === 'peashooter' || p.type === 'snowpea') {
        p.actionTimer -= dt;
        if (p.actionTimer <= 0) {
          // Check if any zombie is ahead in this lane (z <= plant.z + 0.35)
          const hasTarget = this.zombies.some(
            (z) => z.lane === p.lane && z.z <= p.z + 0.35 && z.z >= SPAWN_Z - 0.3
          );
          if (hasTarget) {
            const isIce = p.type === 'snowpea';
            this._spawnPea(p, isIce);
            soundFX.playPeaShoot(isIce);
            p.recoil = 1.0;
            p.actionTimer = p.def.fireRate;
          } else {
            p.actionTimer = 0.14;
          }
        }
      } else if (p.type === 'wallnut') {
        const hpRatio = p.hp / p.maxHp;
        if (p.mesh.userData.cracks) {
          p.mesh.userData.cracks.visible = hpRatio < 0.66;
        }
        if (hpRatio < 0.35 && p.mesh.userData.body) {
          p.mesh.userData.body.rotation.z = 0.12;
        }
      } else if (p.type === 'cherrybomb') {
        p.actionTimer -= dt;
        const progress = 1 - Math.max(0, p.actionTimer / p.def.fuseTime);
        const pulse = 1 + progress * 0.65 + Math.sin(progress * 26) * 0.08;
        p.mesh.scale.setScalar(pulse);
        if (p.mesh.userData.cherryMat) {
          p.mesh.userData.cherryMat.emissiveIntensity = 0.3 + progress * 2.1;
        }
        if (p.mesh.userData.glow) {
          p.mesh.userData.glow.material.opacity = 0.45 + progress * 0.55;
          p.mesh.userData.glow.scale.setScalar(1.1 + progress * 1.4);
        }
        if (p.actionTimer <= 0) {
          this._explodeCherryBomb(p);
        }
      }
    }
  }

  _explodeCherryBomb(plant) {
    const center = new THREE.Vector3(plant.x, 0.35, plant.z);
    this.particles.spawnExplosion(center);
    soundFX.playExplosion();
    navigator.vibrate?.([35, 25, 65]);
    this._triggerShake(0.45, 0.42);

    const r = plant.def.radius;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (Math.abs(z.x - plant.x) <= r && Math.abs(z.z - plant.z) <= r) {
        this._damageZombie(z, plant.def.damage, false, true);
      }
    }
    this._removePlant(plant);
  }

  _updatePeas(dt) {
    for (let i = this.peas.length - 1; i >= 0; i--) {
      const pea = this.peas[i];
      pea.z -= pea.speed * dt;
      pea.mesh.position.z = pea.z;
      if (pea.mesh.userData.aura) {
        pea.mesh.userData.aura.rotation.x += dt * 5;
        pea.mesh.userData.aura.rotation.y += dt * 4;
      }
      pea.trailTimer -= dt;
      if (pea.trailTimer <= 0) {
        pea.trailTimer = pea.isIce ? 0.04 : 0.075;
        this.particles.spawnTrailDot(pea.mesh.position, pea.isIce);
      }

      // Check collision with closest zombie in the same lane
      let hitZombie = null;
      for (const z of this.zombies) {
        if (z.lane === pea.lane && Math.abs(z.z - pea.z) < 0.42) {
          hitZombie = z;
          break;
        }
      }

      if (hitZombie) {
        const armorBefore = hitZombie.armorHp > 0 ? hitZombie.armorType : null;
        soundFX.playHit(armorBefore, pea.isIce);
        this.particles.burst(
          new THREE.Vector3(pea.x, 0.62, pea.z),
          pea.isIce ? 0x7dd3fc : 0x4ade80,
          pea.isIce ? 7 : 5,
          2.2,
          6.5,
          0.8
        );
        this._damageZombie(hitZombie, pea.damage, pea.isIce, false);
        this.scene.remove(pea.mesh);
        this.peas.splice(i, 1);
        continue;
      }

      if (pea.z < SPAWN_Z - 1.2) {
        this.scene.remove(pea.mesh);
        this.peas.splice(i, 1);
      }
    }
  }

  _damageZombie(zombie, amount, isIce = false, fromExplosion = false) {
    let remaining = amount;

    if (zombie.armorHp > 0) {
      const absorbed = Math.min(zombie.armorHp, remaining);
      zombie.armorHp -= absorbed;
      remaining -= absorbed;
      if (zombie.armorHp <= 0 && zombie.mesh.userData.armorMesh) {
        const worldPos = new THREE.Vector3();
        zombie.mesh.userData.armorMesh.getWorldPosition(worldPos);
        this.particles.spawnFlyingDebris(zombie.mesh.userData.armorMesh, worldPos);
        zombie.mesh.userData.armorMesh = null;
      }
    }

    if (remaining > 0) {
      zombie.hp -= remaining;
    }

    if (isIce) {
      zombie.chillTimer = PLANT_TYPES.snowpea.chillDuration;
    }
    zombie.hitFlash = 0.12;

    if (zombie.hp <= 0) {
      this._killZombie(zombie, fromExplosion);
    }
  }

  _killZombie(zombie, fromExplosion = false) {
    const idx = this.zombies.indexOf(zombie);
    if (idx === -1) return;
    this.zombies.splice(idx, 1);
    this.zombiesDefeated += 1;

    if (fromExplosion) {
      this.particles.burst(new THREE.Vector3(zombie.x, 0.6, zombie.z), 0x334155, 10, 3.6, 8.0, 1.1);
      this.scene.remove(zombie.mesh);
    } else {
      this.particles.burst(new THREE.Vector3(zombie.x, 0.7, zombie.z), 0x84a955, 6, 2.2, 7.5, 0.85);
      this.dyingZombies.push({
        mesh: zombie.mesh,
        life: 0,
        maxLife: 0.48,
      });
    }
  }

  _updateZombies(dt) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      const isChilled = z.chillTimer > 0;
      if (isChilled) {
        z.chillTimer = Math.max(0, z.chillTimer - dt);
        if (Math.random() < dt * 4.5) {
          this.particles.spawnTrailDot(new THREE.Vector3(z.x, 0.72, z.z), true);
        }
      }
      const speedMult = isChilled ? PLANT_TYPES.snowpea.chillFactor : 1.0;

      // Hit flash & chill tinting
      if (z.hitFlash > 0) z.hitFlash = Math.max(0, z.hitFlash - dt);
      const mats = z.mesh.userData.tintableMats;
      const origs = z.mesh.userData.originalColors;
      for (let m = 0; m < mats.length; m++) {
        if (z.hitFlash > 0) {
          mats[m].emissive.setHex(0xffffff);
          mats[m].emissiveIntensity = 0.45;
        } else if (isChilled) {
          mats[m].emissive.setHex(0x38bdf8);
          mats[m].emissiveIntensity = 0.35;
        } else {
          mats[m].emissive.setHex(0x000000);
          mats[m].emissiveIntensity = 0;
        }
        mats[m].color.copy(origs[m]);
        if (isChilled) mats[m].color.lerp(new THREE.Color(0x7dd3fc), 0.42);
      }

      // Check for blocking plant in front of zombie
      let targetPlant = null;
      for (const p of this.plants) {
        if (p.lane === z.lane && p.type !== 'cherrybomb') {
          const dz = p.z - z.z;
          if (dz > -0.18 && dz < 0.56) {
            targetPlant = p;
            break;
          }
        }
      }

      const ud = z.mesh.userData;
      if (targetPlant) {
        z.isBiting = true;
        z.biteTimer -= dt * speedMult;
        // Lunging chew animation
        const chomp = Math.sin(this.elapsedTime * 12 * speedMult);
        ud.upperBody.rotation.x = 0.22 + Math.max(0, chomp) * 0.22;
        ud.leftArm.rotation.x = -0.25 - chomp * 0.25;
        ud.rightArm.rotation.x = -0.25 + chomp * 0.25;

        if (z.biteTimer <= 0) {
          z.biteTimer = z.def.biteInterval;
          targetPlant.hp -= z.def.biteDamage;
          targetPlant.hurtFlash = 0.16;
          soundFX.playBite();
          this.particles.burst(
            new THREE.Vector3(targetPlant.x, 0.45, targetPlant.z),
            targetPlant.type === 'wallnut' ? 0xc68642 : 0x4ade80,
            4,
            1.6,
            6.5,
            0.65
          );
          if (targetPlant.hp <= 0) {
            this._removePlant(targetPlant);
          }
        }
      } else {
        z.isBiting = false;
        z.z += z.def.speed * speedMult * dt;
        z.mesh.position.z = z.z;

        // Shambling walk animation
        z.walkPhase += dt * 6.2 * speedMult;
        const swing = Math.sin(z.walkPhase);
        ud.leftLeg.rotation.x = swing * 0.55;
        ud.rightLeg.rotation.x = -swing * 0.55;
        ud.upperBody.rotation.x = 0.08 + Math.abs(swing) * 0.06;
        ud.upperBody.rotation.z = swing * 0.08;
        ud.headGroup.rotation.z = -swing * 0.09;
        ud.leftArm.rotation.x = Math.sin(z.walkPhase * 0.8) * 0.12;
        ud.rightArm.rotation.x = -Math.sin(z.walkPhase * 0.8) * 0.12;
        z.mesh.position.y = 0.02 + Math.abs(swing) * 0.05;
      }

      // Check Lawnmower trigger!
      const mower = this.mowers[z.lane];
      if (mower && mower.state === 'ready' && z.z >= MOWER_Z - 0.5) {
        mower.state = 'active';
        soundFX.playMower();
        navigator.vibrate?.([25, 15, 35]);
        this._triggerShake(0.22, 0.25);
        this.callbacks.onBanner?.('Lawnmower စတင်လိုက်ပြီ!', '', 'info');
      }

      // Check House Breach (Game Over!)
      if (z.z >= HOUSE_BREACH_Z) {
        this.state = 'gameover';
        this.cancelSelection();
        soundFX.playGameOver();
        this.callbacks.onGameOver?.({
          time: this.elapsedTime,
          zombiesDefeated: this.zombiesDefeated,
          plantsPlaced: this.plantsPlaced,
        });
        this.callbacks.onStateChange?.('gameover');
        return;
      }
    }
  }

  _updateDyingZombies(dt) {
    for (let i = this.dyingZombies.length - 1; i >= 0; i--) {
      const dz = this.dyingZombies[i];
      dz.life += dt;
      const t = Math.min(1, dz.life / dz.maxLife);
      dz.mesh.rotation.x = -t * (Math.PI / 2);
      dz.mesh.position.y = Math.max(0.05, 0.02 - t * 0.1);
      if (t > 0.65) {
        const s = 1 - (t - 0.65) / 0.35;
        dz.mesh.scale.setScalar(Math.max(0.01, s));
      }
      if (dz.life >= dz.maxLife) {
        this.scene.remove(dz.mesh);
        this.dyingZombies.splice(i, 1);
      }
    }
  }

  _updateMowers(dt) {
    for (const m of this.mowers) {
      if (m.state !== 'active') continue;
      m.z -= 8.8 * dt;
      m.mesh.position.z = m.z;
      for (const w of m.mesh.userData.wheels) {
        w.rotation.x -= dt * 28;
      }
      m.particleTimer -= dt;
      if (m.particleTimer <= 0) {
        m.particleTimer = 0.045;
        this.particles.burst(
          new THREE.Vector3(m.mesh.position.x, 0.16, m.z + 0.35),
          0x4ade80,
          3,
          2.2,
          7.0,
          0.75
        );
        this.particles.burst(
          new THREE.Vector3(m.mesh.position.x + 0.22, 0.42, m.z),
          0xe2e8f0,
          1,
          1.2,
          1.5,
          0.95
        );
      }

      // Mow down any zombies in this lane!
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        if (z.lane === m.lane && Math.abs(z.z - m.z) < 0.72) {
          this._killZombie(z, false);
        }
      }

      if (m.z < SPAWN_Z - 2.2) {
        m.state = 'gone';
        this.scene.remove(m.mesh);
      }
    }
  }

  _updateSuns(dt) {
    // Target world point near upper-left HUD sun badge for collect fly-in animation
    const hudWorldTarget = new THREE.Vector3(-2.6, 5.4, -3.2);

    for (let i = this.suns.length - 1; i >= 0; i--) {
      const s = this.suns[i];
      s.mesh.userData.rays.rotation.z += dt * 1.8;

      if (s.collected) {
        s.collectProgress += dt * 2.8;
        const t = Math.min(1, s.collectProgress);
        const ease = 1 - Math.pow(1 - t, 3);
        s.mesh.position.lerpVectors(s.collectStart, hudWorldTarget, ease);
        s.mesh.scale.setScalar(Math.max(0.05, 1 - ease * 0.75));
        if (t >= 1) {
          this.scene.remove(s.mesh);
          this.suns.splice(i, 1);
        }
        continue;
      }

      if (!s.landed) {
        s.travelTime += dt;
        const t = Math.min(1, s.travelTime / s.travelDuration);
        if (s.isFromSky) {
          s.mesh.position.lerpVectors(s.startPos, s.targetPos, t);
          s.mesh.position.x = s.targetPos.x + Math.sin(t * Math.PI * 3) * 0.16;
        } else {
          // Cute arc hop from sunflower
          s.mesh.position.lerpVectors(s.startPos, s.targetPos, t);
          s.mesh.position.y += Math.sin(t * Math.PI) * 0.85;
        }
        if (t >= 1) {
          s.landed = true;
        }
      } else {
        s.age += dt;
        s.mesh.position.y = s.targetPos.y + Math.sin(s.age * 3.8) * 0.08;
        // Blink softly during last 2.2s before fading away
        if (s.age > ECONOMY.SUN_LIFETIME - 2.2) {
          const blink = Math.sin(s.age * 18) > 0 ? 1 : 0.45;
          s.mesh.scale.setScalar(blink);
        }
        if (s.age >= ECONOMY.SUN_LIFETIME) {
          this.scene.remove(s.mesh);
          this.suns.splice(i, 1);
        }
      }
    }
  }

  _emitHUD() {
    // Combine time progress + kill progress so the top bar feels accurate and reaches 100% smoothly
    const timeFrac = Math.min(1, this.elapsedTime / LEVEL_SPAWN_DURATION);
    const killFrac = TOTAL_ZOMBIES > 0 ? this.zombiesDefeated / TOTAL_ZOMBIES : 0;
    const progress = Math.min(1, timeFrac * 0.65 + killFrac * 0.35);

    this.callbacks.onHUDUpdate?.({
      sun: this.sun,
      selectedPlant: this.selectedPlant,
      shovelMode: this.shovelMode,
      cooldowns: { ...this.cooldowns },
      progress,
      zombiesDefeated: this.zombiesDefeated,
      totalZombies: TOTAL_ZOMBIES,
    });
  }
}
