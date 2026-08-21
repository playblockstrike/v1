import { isSolid } from '../blocks/BlockTypes.js';
import { RemotePlayer } from '../net/RemotePlayer.js';
import { applyPhysics } from '../player/Physics.js';
import {
  EYE_HEIGHT,
  MAX_HEALTH,
  RESPAWN_DELAY_SEC,
  VOID_KILL_Y,
} from '../player/PlayerDims.js';
import { castRay } from '../player/Raycast.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 9.5;
const WALK_SPEED = 4.6;
const STRAFE_SPEED = 2.4;
const ENGAGE_RANGE = 38;
const SHOT_RANGE = 32;

export const BOT_COUNT = 1;
export const BOT_NAMES = ['Rook', 'Viper', 'Ghost', 'Hawk'];

export class Bot {
  constructor({ scene, world, id, name, colorIndex, spawn }) {
    this.world = world;
    this.id = id;
    this.name = name;
    this.position = { x: spawn.x, y: spawn.y, z: spawn.z };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.yaw = Math.random() * Math.PI * 2;
    this.pitch = 0;
    this.onGround = false;
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.shotCooldown = 0.4 + Math.random() * 0.8;
    this.thinkT = 0;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.wanderYaw = this.yaw;
    this.remote = new RemotePlayer(
      scene,
      {
        id,
        name,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        yaw: this.yaw,
      },
      colorIndex
    );
  }

  get x() {
    return this.position.x;
  }

  get y() {
    return this.position.y;
  }

  get z() {
    return this.position.z;
  }

  get eyePosition() {
    return {
      x: this.position.x,
      y: this.position.y + EYE_HEIGHT,
      z: this.position.z,
    };
  }

  get direction() {
    const cos = Math.cos(this.pitch);
    return {
      x: -Math.sin(this.yaw) * cos,
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * cos,
    };
  }

  target() {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      yaw: this.yaw,
      dead: this.dead,
    };
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health > 0) return false;
    this.die();
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.respawnAt = performance.now() + RESPAWN_DELAY_SEC * 1000;
    this.remote.setDead(true);
  }

  respawn() {
    const spawn = this.world.getRandomSpawnPosition();
    this.position.x = spawn.x;
    this.position.y = spawn.y;
    this.position.z = spawn.z;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.shotCooldown = 0.4 + Math.random() * 0.6;
    this.remote.setDead(false);
    this.syncRemote(true);
  }

  update(dt, player, weapons, audio) {
    if (this.dead) {
      if (performance.now() >= this.respawnAt) this.respawn();
      return;
    }

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.35 + Math.random() * 0.7;
      this.strafe = Math.random() < 0.22 ? 0 : Math.random() < 0.5 ? -1 : 1;
      this.wanderYaw += (Math.random() - 0.5) * 1.6;
    }

    const hunting = player && !player.dead;
    if (hunting) this.hunt(dt, player, weapons, audio);
    else this.wander(dt);

    this.velocity.y -= GRAVITY * dt;
    applyPhysics(this, this.world, dt);

    if (this.position.y < VOID_KILL_Y) {
      this.die();
      return 'void';
    }

    this.tryJump();
    this.syncRemote();
    return null;
  }

  hunt(dt, player, weapons, audio) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    const desiredYaw = Math.atan2(-dx, -dz);
    this.yaw = lerpAngle(this.yaw, desiredYaw, 1 - Math.exp(-dt * 8));

    const eye = this.eyePosition;
    const targetEye = {
      x: player.position.x,
      y: player.position.y + EYE_HEIGHT,
      z: player.position.z,
    };
    const dy = targetEye.y - eye.y;
    const aimDist = Math.hypot(dx, dy, dz) || 1;
    this.pitch = Math.asin(Math.max(-0.9, Math.min(0.9, dy / aimDist)));

    const canSee = dist < ENGAGE_RANGE && hasLineOfSight(this.world, eye, targetEye);
    let moveYaw = this.yaw;
    if (dist < 5.5) moveYaw = this.yaw + Math.PI;
    else if (!canSee) moveYaw = this.wanderYaw;

    const speed = dist > 14 ? WALK_SPEED + 1.6 : WALK_SPEED;
    const fwdX = -Math.sin(moveYaw);
    const fwdZ = -Math.cos(moveYaw);
    const rightX = Math.cos(moveYaw);
    const rightZ = -Math.sin(moveYaw);
    let mx = fwdX;
    let mz = fwdZ;
    if (canSee && dist < SHOT_RANGE) {
      mx += rightX * this.strafe * 0.7;
      mz += rightZ * this.strafe * 0.7;
    }
    const len = Math.hypot(mx, mz) || 1;
    this.velocity.x = (mx / len) * speed;
    this.velocity.z = (mz / len) * speed;

    if (this.avoidLedge(fwdX, fwdZ)) {
      this.velocity.x = rightX * this.strafe * STRAFE_SPEED;
      this.velocity.z = rightZ * this.strafe * STRAFE_SPEED;
    }

    if (canSee && dist < SHOT_RANGE && this.shotCooldown <= 0) {
      const dir = {
        x: (targetEye.x - eye.x) / aimDist,
        y: (targetEye.y - eye.y) / aimDist,
        z: (targetEye.z - eye.z) / aimDist,
      };
      weapons.spawnBotBullet(eye, dir, this.id);
      audio?.playSpatialShot(player.position, eye);
      this.shotCooldown = 0.11 + Math.random() * 0.08;
    }
  }

  wander() {
    this.yaw = lerpAngle(this.yaw, this.wanderYaw, 0.08);
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    if (this.avoidLedge(fwdX, fwdZ)) {
      this.wanderYaw += Math.PI * 0.5;
      this.velocity.x = 0;
      this.velocity.z = 0;
      return;
    }
    this.velocity.x = fwdX * (WALK_SPEED * 0.7);
    this.velocity.z = fwdZ * (WALK_SPEED * 0.7);
    this.pitch *= 0.9;
  }

  avoidLedge(fwdX, fwdZ) {
    const ax = this.position.x + fwdX * 1.15;
    const az = this.position.z + fwdZ * 1.15;
    return !hasSupport(this.world, ax, this.position.y, az);
  }

  tryJump() {
    if (!this.onGround) return;
    const fx = this.position.x - Math.sin(this.yaw) * 0.75;
    const fz = this.position.z - Math.cos(this.yaw) * 0.75;
    const blocked = isSolid(
      this.world.getBlock(Math.floor(fx), Math.floor(this.position.y) + 1, Math.floor(fz))
    );
    if (blocked) this.velocity.y = JUMP_VELOCITY;
  }

  syncRemote(snap = false) {
    const r = this.remote;
    if (snap) {
      r.x = r.tx = this.position.x;
      r.y = r.ty = this.position.y;
      r.z = r.tz = this.position.z;
      r.yaw = r.tyaw = this.yaw;
    } else {
      r.tx = this.position.x;
      r.ty = this.position.y;
      r.tz = this.position.z;
      r.tyaw = this.yaw;
    }
    r.pitch = this.pitch;
  }

  dispose(scene) {
    this.remote.dispose(scene);
  }
}

function hasSupport(world, x, y, z) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let dy = 0; dy <= 5; dy++) {
    if (isSolid(world.getBlock(bx, Math.floor(y) - dy, bz))) return true;
  }
  return false;
}

function hasLineOfSight(world, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.5) return true;
  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
  const hit = castRay(world, from, dir, Math.max(0.4, dist - 0.4));
  return !hit.hit;
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
