import * as THREE from 'three';
import { BlockId } from '../blocks/BlockTypes.js';
import { castRay } from '../player/Raycast.js';
import { tracePlayerParts } from '../player/PlayerDims.js';
import { Mode, MODE_ORDER, WEAPON_STATS, isGunMode, weaponDamage } from './Modes.js';
import { ViewModel } from './ViewModel.js';

const BULLET_SPEED = 80;
const BULLET_LIFETIME = 1.2;

export class WeaponSystem {
  constructor(scene, camera, world, audio = null) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.audio = audio;
    this.modeIndex = 0;
    this.cooldown = 0;
    this.bullets = [];
    this.bloom = 0;
    this.ammo = {};
    this.reloadT = 0;
    this.reloadDuration = 0;
    this.reloadMode = null;
    this.triggerHeld = false;
    this.wantScoped = false;
    this.baseFov = camera.fov;
    this.blockDamage = new Map();
    this.viewModel = new ViewModel(camera);
    this.viewModel.setMode(this.mode);
    this.onShoot = null;
    this.onBlockChange = null;
    /** @type {null | (() => Array<{id:string,x:number,y:number,z:number,yaw?:number,dead?:boolean}>)} */
    this.getTargets = null;
    /** @type {null | (() => {x:number,y:number,z:number,yaw?:number,dead?:boolean}|null)} */
    this.getLocalTarget = null;
    /** @type {null | ((targetId: string, damage: number, part: string) => void)} */
    this.onHitPlayer = null;
    /** @type {null | ((damage: number, part: string, ownerId: string) => void)} */
    this.onHitLocal = null;
  }

  get mode() {
    return MODE_ORDER[this.modeIndex];
  }

  get isAutomatic() {
    return !!WEAPON_STATS[this.mode]?.automatic;
  }

  /** True while the sniper optic is actually up (ADS intent, not reloading). */
  get isScoped() {
    return this.mode === Mode.SNIPER && this.wantScoped && !this.isReloading;
  }

  get lookScale() {
    if (!this.isScoped) return 1;
    return WEAPON_STATS[Mode.SNIPER]?.lookScale ?? 0.28;
  }

  toggleScope() {
    if (this.mode !== Mode.SNIPER) return false;
    this.wantScoped = !this.wantScoped;
    return this.wantScoped;
  }

  closeScope() {
    this.wantScoped = false;
  }

  ammoFor(mode = this.mode) {
    const size = WEAPON_STATS[mode]?.magSize;
    if (!size) return null;
    if (this.ammo[mode] == null) this.ammo[mode] = size;
    return this.ammo[mode];
  }

  get isReloading() {
    return this.reloadT > 0;
  }

  get magazineState() {
    const stats = WEAPON_STATS[this.mode];
    const magSize = stats?.magSize;
    if (!magSize) {
      return { visible: false, ammo: 0, magSize: 0, reloading: false, progress: 0 };
    }
    const reloading = this.isReloading && this.reloadMode === this.mode;
    return {
      visible: magSize > 1,
      ammo: this.ammoFor(this.mode),
      magSize,
      reloading,
      progress: reloading ? 1 - this.reloadT / this.reloadDuration : 0,
    };
  }

  startReload(mode = this.mode) {
    const stats = WEAPON_STATS[mode];
    if (!stats?.magSize || !stats.reloadTime) return false;
    if (this.isReloading) return false;
    if (this.ammoFor(mode) >= stats.magSize) return false;
    this.reloadMode = mode;
    this.reloadDuration = stats.reloadTime;
    this.reloadT = stats.reloadTime;
    this.audio?.playReload?.();
    return true;
  }

  refillMags() {
    this.reloadT = 0;
    this.reloadDuration = 0;
    this.reloadMode = null;
    for (const mode of Object.keys(WEAPON_STATS)) {
      const size = WEAPON_STATS[mode]?.magSize;
      if (size) this.ammo[mode] = size;
    }
  }

  finishReload() {
    const mode = this.reloadMode;
    const size = WEAPON_STATS[mode]?.magSize;
    if (mode && size) this.ammo[mode] = size;
    this.reloadT = 0;
    this.reloadDuration = 0;
    this.reloadMode = null;
  }

  setModeIndex(index) {
    const count = MODE_ORDER.length;
    if (index < 0 || index >= count) return this.mode;
    this.modeIndex = index;
    if (this.mode !== Mode.SNIPER) this.closeScope();
    this.viewModel.setMode(this.mode);
    this.viewModel.setScoped(this.isScoped);
    if (!WEAPON_STATS[this.mode]?.spread) this.bloom = 0;
    return this.mode;
  }

  cycleMode(delta) {
    const count = MODE_ORDER.length;
    return this.setModeIndex((this.modeIndex + delta + count) % count);
  }

  setTrigger(held) {
    this.triggerHeld = held;
  }

  shouldAutoShoot() {
    return this.isAutomatic && this.triggerHeld && !this.isReloading;
  }

  update(dt, playerMoving, player = null) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const spraying = this.isAutomatic && this.triggerHeld && !this.isReloading;
    if (!spraying) {
      const recover = WEAPON_STATS[this.mode]?.bloomRecover ?? 2.4;
      this.bloom = Math.max(0, this.bloom - dt * recover);
    }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (!player || player.dead) this.closeScope();
    if (player && !player.dead && this.shouldAutoShoot()) {
      this.tryShoot(player);
    }
    this.syncAim(dt);
    this.viewModel.update(dt, playerMoving, this.isReloading && this.mode === Mode.AK);
    this.updateBullets(dt);
  }

  tryShoot(player) {
    if (!isGunMode(this.mode)) return false;
    if (this.cooldown > 0) return false;
    if (player.dead) return false;

    const stats = WEAPON_STATS[this.mode];
    if (stats.requiresScope && !this.isScoped) return false;
    if (stats.magSize) {
      if (this.isReloading) return false;
      if (this.ammoFor() <= 0) {
        this.startReload();
        return false;
      }
    }

    this.cooldown = stats.cooldown;
    this.viewModel.punch(stats.recoil);
    this.viewModel.flash();
    this.audio?.playShot(1, stats.pitch);

    if (stats.magSize) {
      this.ammo[this.mode] = this.ammoFor() - 1;
      if (this.ammo[this.mode] <= 0) this.startReload();
    }

    const origin = player.eyePosition;
    const aim = player.direction;
    const bloomMax = stats.bloomMax ?? 1;
    const bloom = Math.min(bloomMax, this.bloom);
    const spread = (stats.spread || 0) + (stats.spreadBloom || 0) * bloom;
    const direction = spreadDirection(aim, spread);
    this.bloom = Math.min(bloomMax, this.bloom + (stats.bloomPerShot ?? 0.2));
    this.spawnBullet(origin, direction, true, this.mode);
    this.onShoot?.(origin, direction);
    return true;
  }

  syncAim(dt) {
    const stats = WEAPON_STATS[this.mode];
    const targetFov = this.isScoped ? (stats?.scopeFov ?? this.baseFov) : this.baseFov;
    const t = 1 - Math.exp(-dt * 14);
    this.camera.fov += (targetFov - this.camera.fov) * t;
    this.camera.updateProjectionMatrix();
    this.viewModel.setScoped(this.isScoped);
  }

  spawnBullet(origin, direction, local = true, mode = null, extra = {}) {
    const speed = WEAPON_STATS[mode]?.bulletSpeed || BULLET_SPEED;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: local ? 0xffdd55 : 0xff8866 })
    );
    mesh.position.set(origin.x, origin.y, origin.z);
    this.scene.add(mesh);

    this.bullets.push({
      mesh,
      position: { ...origin },
      velocity: {
        x: direction.x * speed,
        y: direction.y * speed,
        z: direction.z * speed,
      },
      age: 0,
      local,
      mode,
      ownerId: extra.ownerId || null,
    });
  }

  spawnBotBullet(origin, direction, ownerId, mode = Mode.PISTOL) {
    const stats = WEAPON_STATS[mode] || {};
    const spread = stats.spread ?? 0.02;
    const dir = spreadDirection(direction, spread);
    this.spawnBullet(origin, dir, false, mode, { ownerId });
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.age += dt;

      const next = {
        x: bullet.position.x + bullet.velocity.x * dt,
        y: bullet.position.y + bullet.velocity.y * dt,
        z: bullet.position.z + bullet.velocity.z * dt,
      };

      const blockHit = this.traceBullet(bullet.position, next);
      const remoteHit = bullet.local ? this.tracePlayers(bullet.position, next) : null;
      const selfHit = !bullet.local ? this.traceLocal(bullet.position, next) : null;
      const playerHit = remoteHit || selfHit;

      let hitPlayerFirst = false;
      if (playerHit && blockHit) {
        const bx = blockHit.x + 0.5 - bullet.position.x;
        const by = blockHit.y + 0.5 - bullet.position.y;
        const bz = blockHit.z + 0.5 - bullet.position.z;
        const blockDist = Math.hypot(bx, by, bz);
        const segLen = Math.hypot(
          next.x - bullet.position.x,
          next.y - bullet.position.y,
          next.z - bullet.position.z
        );
        hitPlayerFirst = playerHit.t * segLen <= blockDist;
      } else if (playerHit) {
        hitPlayerFirst = true;
      }

      if (hitPlayerFirst) {
        if (bullet.local && playerHit.id) {
          const damage = weaponDamage(bullet.mode, playerHit.part, playerHit.damage);
          this.onHitPlayer?.(playerHit.id, damage, playerHit.part);
        } else if (!bullet.local && bullet.ownerId) {
          const damage = weaponDamage(bullet.mode, playerHit.part, playerHit.damage);
          this.onHitLocal?.(damage, playerHit.part, bullet.ownerId);
        }
        this.spawnImpact(playerHit.x, playerHit.y, playerHit.z, playerHit.part);
        if (bullet.local) this.audio?.playHit?.(playerHit.part === 'head' ? 0.55 : 0.35);
        this.removeBullet(i);
        continue;
      }

      if (blockHit || bullet.age > BULLET_LIFETIME) {
        if (blockHit) {
          if (bullet.local) {
            this.hitBlock(blockHit.x, blockHit.y, blockHit.z, bullet.mode);
          }
          this.spawnImpact(blockHit.x + 0.5, blockHit.y + 0.5, blockHit.z + 0.5);
        }
        this.removeBullet(i);
        continue;
      }

      bullet.position = next;
      bullet.mesh.position.set(next.x, next.y, next.z);
    }
  }

  removeBullet(index) {
    const bullet = this.bullets[index];
    this.scene.remove(bullet.mesh);
    bullet.mesh.geometry.dispose();
    bullet.mesh.material.dispose();
    this.bullets.splice(index, 1);
  }

  traceLocal(from, to) {
    const target = this.getLocalTarget?.();
    if (!target || target.dead) return null;
    return tracePlayerParts(from, to, target);
  }

  tracePlayers(from, to) {
    const targets = this.getTargets?.() || [];
    let best = null;
    for (const target of targets) {
      const hit = tracePlayerParts(from, to, target);
      if (!hit) continue;
      if (!best || hit.t < best.t) best = hit;
    }
    return best;
  }

  traceBullet(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.001) return null;

    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const result = castRay(this.world, from, dir, dist + 0.05);
    return result.hit ? result.block : null;
  }

  hitBlock(x, y, z, mode) {
    const needed = WEAPON_STATS[mode]?.blockHits ?? 1;
    const id = this.world.getBlock(x, y, z);
    if (!id) return;
    const key = `${x},${y},${z}`;
    if (needed <= 1) {
      this.blockDamage.delete(key);
      this.destroyBlock(x, y, z);
      return;
    }
    let entry = this.blockDamage.get(key);
    if (!entry || entry.id !== id) entry = { hits: 0, id };
    entry.hits += 1;
    if (entry.hits >= needed) {
      this.blockDamage.delete(key);
      this.destroyBlock(x, y, z);
      return;
    }
    this.blockDamage.set(key, entry);
    this.audio?.playImpact();
  }

  destroyBlock(x, y, z) {
    this.blockDamage.delete(`${x},${y},${z}`);
    const previous = this.world.getBlock(x, y, z);
    this.world.setBlock(x, y, z, BlockId.AIR);
    if (previous) {
      this.audio?.playImpact();
      this.audio?.playBreak(previous);
      this.onBlockChange?.(x, y, z, BlockId.AIR);
    }
  }

  spawnImpact(x, y, z, part = null) {
    const color = part === 'head' ? 0xff2222 : 0xffaa33;
    const size = part === 'head' ? 0.35 : 0.25;
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    );
    flash.position.set(x, y, z);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }, 80);
  }
}

function spreadDirection(dir, radians) {
  if (!radians) return { x: dir.x, y: dir.y, z: dir.z };
  const theta = Math.random() * Math.PI * 2;
  const r = Math.tan(radians) * Math.sqrt(Math.random());
  const ref =
    Math.abs(dir.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  let rx = dir.y * ref.z - dir.z * ref.y;
  let ry = dir.z * ref.x - dir.x * ref.z;
  let rz = dir.x * ref.y - dir.y * ref.x;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const vx = dir.y * rz - dir.z * ry;
  const vy = dir.z * rx - dir.x * rz;
  const vz = dir.x * ry - dir.y * rx;
  const ox = Math.cos(theta) * r;
  const oy = Math.sin(theta) * r;
  const x = dir.x + rx * ox + vx * oy;
  const y = dir.y + ry * ox + vy * oy;
  const z = dir.z + rz * ox + vz * oy;
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
