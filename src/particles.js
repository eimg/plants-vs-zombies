import * as THREE from 'three';
import { getTextures } from './textures.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];
    this.debris = [];
    this.flashes = [];

    this._boxGeo = new THREE.BoxGeometry(0.105, 0.105, 0.105);
    this._sphereGeo = new THREE.SphereGeometry(0.08, 8, 6);

    // Subtle sunlit floating pollen motes across the backyard
    this._initAmbientMotes();
  }

  _initAmbientMotes() {
    const count = 48;
    const positions = new Float32Array(count * 3);
    this._moteSeeds = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10.5;
      positions[i * 3 + 1] = 0.4 + Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 13.8;
      this._moteSeeds.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.45,
        driftX: (Math.random() - 0.5) * 0.25,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: getTextures().sunGlow,
      color: 0xfef9c3,
      size: 0.24,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._motes = new THREE.Points(geo, mat);
    this._moteTime = 0;
    this.scene.add(this._motes);
  }

  burst(pos, color, count = 8, speed = 2.6, gravity = 7.5, scale = 1.0, emissive = 0x000000) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: emissive ? 0.5 : 0,
        roughness: 0.55,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(i % 2 === 0 ? this._boxGeo : this._sphereGeo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(scale * (0.65 + Math.random() * 0.7));
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.35 + Math.random() * 0.85) * speed;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * horiz,
        vy: (0.65 + Math.random() * 0.9) * speed,
        vz: Math.sin(angle) * horiz,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.35,
      });
    }
  }

  spawnTrailDot(pos, isIce = false) {
    const mat = new THREE.MeshBasicMaterial({
      color: isIce ? 0xbae6fd : 0x86efac,
      transparent: true,
      opacity: 0.75,
    });
    const mesh = new THREE.Mesh(this._sphereGeo, mat);
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.1,
      pos.y + (Math.random() - 0.5) * 0.08,
      pos.z + 0.12
    );
    mesh.scale.setScalar(isIce ? 0.65 : 0.45);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.35,
      vy: isIce ? 0.25 : 0.1,
      vz: 0.35,
      rotSpeed: 4,
      gravity: isIce ? 0.6 : 1.4,
      life: 0,
      maxLife: 0.24,
    });
  }

  spawnSunPulse(pos) {
    const ringGeo = new THREE.RingGeometry(0.18, 0.34, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, Math.max(0.14, pos.y), pos.z);
    this.scene.add(ring);
    this.rings.push({
      mesh: ring,
      life: 0,
      maxLife: 0.34,
      targetScale: 2.2,
    });
  }

  spawnExplosion(pos) {
    this.burst(pos, 0xef4444, 20, 5.2, 6.8, 1.55, 0xdc2626);
    this.burst(pos, 0xfacc15, 16, 4.2, 5.2, 1.35, 0xf59e0b);
    this.burst(pos, 0x1e293b, 12, 3.0, 2.4, 1.7);

    // Dynamic warm explosion flash light!
    const flash = new THREE.PointLight(0xff7a1a, 14, 10, 1.6);
    flash.position.set(pos.x, pos.y + 0.7, pos.z);
    this.scene.add(flash);
    this.flashes.push({ light: flash, life: 0, maxLife: 0.36, peak: 14 });

    // Dual expanding shockwave rings
    [
      { color: 0xf97316, maxLife: 0.48, targetScale: 4.8 },
      { color: 0xfef08a, maxLife: 0.34, targetScale: 3.4 },
    ].forEach((cfg, idx) => {
      const ringGeo = new THREE.RingGeometry(0.2, 0.56, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.14 + idx * 0.04, pos.z);
      this.scene.add(ring);

      this.rings.push({
        mesh: ring,
        life: 0,
        maxLife: cfg.maxLife,
        targetScale: cfg.targetScale,
      });
    });
  }

  spawnFlyingDebris(mesh, worldPos) {
    this.scene.attach(mesh);
    mesh.position.copy(worldPos);
    this.debris.push({
      mesh,
      vx: (Math.random() - 0.5) * 3.0,
      vy: 3.5 + Math.random() * 1.2,
      vz: -1.4 - Math.random() * 1.4,
      rx: (Math.random() - 0.5) * 11,
      ry: (Math.random() - 0.5) * 11,
      rz: (Math.random() - 0.5) * 11,
      life: 0,
      maxLife: 0.95,
    });
  }

  update(dt) {
    // Animate gentle ambient backyard pollen motes
    if (this._motes) {
      this._moteTime += dt;
      const arr = this._motes.geometry.attributes.position.array;
      for (let i = 0; i < this._moteSeeds.length; i++) {
        const s = this._moteSeeds[i];
        arr[i * 3] += Math.sin(this._moteTime * s.speed + s.phase) * 0.004 + s.driftX * dt;
        arr[i * 3 + 1] += Math.cos(this._moteTime * s.speed * 0.8 + s.phase) * 0.003;
        if (arr[i * 3] > 5.5) arr[i * 3] = -5.5;
        if (arr[i * 3] < -5.5) arr[i * 3] = 5.5;
      }
      this._motes.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.scene.remove(f.light);
        this.flashes.splice(i, 1);
        continue;
      }
      const t = f.life / f.maxLife;
      f.light.intensity = f.peak * Math.pow(1 - t, 2);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rotSpeed * dt;
      p.mesh.rotation.y += p.rotSpeed * dt;
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = 1 - t * t;
      p.mesh.scale.multiplyScalar(1 - dt * 0.7);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const t = r.life / r.maxLife;
      const ease = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(1 + ease * r.targetScale);
      r.mesh.material.opacity = (1 - t) * 0.9;
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.scene.remove(d.mesh);
        this.debris.splice(i, 1);
        continue;
      }
      d.vy -= 9.5 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y = Math.max(0.08, d.mesh.position.y + d.vy * dt);
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.rx * dt;
      d.mesh.rotation.y += d.ry * dt;
      d.mesh.rotation.z += d.rz * dt;
      if (d.life > d.maxLife * 0.65) {
        const shrink = 1 - (d.life - d.maxLife * 0.65) / (d.maxLife * 0.35);
        d.mesh.scale.setScalar(Math.max(0.01, shrink));
      }
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    this.particles = [];
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
    this.rings = [];
    for (const d of this.debris) {
      this.scene.remove(d.mesh);
    }
    this.debris = [];
    for (const f of this.flashes) {
      this.scene.remove(f.light);
    }
    this.flashes = [];
  }
}
