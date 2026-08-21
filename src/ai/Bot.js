import { isSolid } from '../blocks/BlockTypes.js';
import { RemotePlayer } from '../net/RemotePlayer.js';
import { applyPhysics } from '../player/Physics.js';
import {
  EYE_HEIGHT,
  MAX_HEALTH,
  PLAYER_HEIGHT,
  RESPAWN_DELAY_SEC,
  VOID_KILL_Y,
} from '../player/PlayerDims.js';
import { castRay } from '../player/Raycast.js';
import { Mode, WEAPON_STATS } from '../weapons/Modes.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 9.5;
const CHASE_SPEED = 6.5;
const CLOSE_SPEED = 3.4;
const FOLLOW_DISTANCE = 2.3;
const SHOT_RANGE = 26;
const PISTOL_COOLDOWN = WEAPON_STATS[Mode.PISTOL]?.cooldown ?? 0.22;

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
    this.shotCooldown = 0.35 + Math.random() * 0.4;
    this.stuckT = 0;
    this.side = Math.random() < 0.5 ? -1 : 1;
    this.lastX = spawn.x;
    this.lastZ = spawn.z;
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
    this.remote.setHeld(Mode.PISTOL);
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

  respawn(enemies = []) {
    const spawn = this.world.getFarthestSpawnPosition(enemies);
    this.position.x = spawn.x;
    this.position.y = spawn.y;
    this.position.z = spawn.z;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.shotCooldown = 0.3 + Math.random() * 0.4;
    this.stuckT = 0;
    this.remote.setDead(false);
    this.syncRemote(true);
  }

  update(dt, player, weapons, audio, avoid = []) {
    if (this.dead) {
      if (performance.now() >= this.respawnAt) this.respawn(avoid);
      return;
    }

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    if (player) this.follow(dt, player, weapons, audio);
    else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    this.velocity.y -= GRAVITY * dt;
    applyPhysics(this, this.world, dt);

    const moved = Math.hypot(this.position.x - this.lastX, this.position.z - this.lastZ);
    this.lastX = this.position.x;
    this.lastZ = this.position.z;
    const wantMove = Math.hypot(this.velocity.x, this.velocity.z) > 1;
    if (wantMove && moved < 0.04) this.stuckT += dt;
    else this.stuckT = 0;
    if (this.stuckT > 0.28) {
      this.side *= -1;
      this.stuckT = 0;
      if (this.onGround) this.velocity.y = JUMP_VELOCITY;
    }

    if (this.position.y < VOID_KILL_Y) {
      this.die();
      return 'void';
    }

    this.syncRemote();
    return null;
  }

  follow(dt, player, weapons, audio) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    const lookYaw = Math.atan2(-dx, -dz);
    this.yaw = lerpAngle(this.yaw, lookYaw, 1 - Math.exp(-dt * 10));

    const eye = this.eyePosition;
    const chest = {
      x: player.position.x,
      y: player.position.y + PLAYER_HEIGHT * 0.55,
      z: player.position.z,
    };
    const dy = chest.y - eye.y;
    const aimDist = Math.hypot(dx, dy, dz) || 1;
    this.pitch = Math.asin(Math.max(-0.9, Math.min(0.9, dy / aimDist)));

    const steer = pickChaseSteer(this.world, this.position, player.position, this.side);
    const close = dist <= FOLLOW_DISTANCE;
    const speed = close ? CLOSE_SPEED : CHASE_SPEED;
    if (close && dist < 1.35) {
      this.velocity.x = -steer.fx * speed * 0.35;
      this.velocity.z = -steer.fz * speed * 0.35;
    } else {
      this.velocity.x = steer.fx * speed;
      this.velocity.z = steer.fz * speed;
    }

    if (this.onGround && shouldJump(this.world, this.position, steer.fx, steer.fz, player.position)) {
      this.velocity.y = JUMP_VELOCITY;
    }

    if (player.dead) return;
    const canSee = dist < SHOT_RANGE && hasLineOfSight(this.world, eye, chest);
    if (canSee && this.shotCooldown <= 0) {
      this.remote.x = this.position.x;
      this.remote.y = this.position.y;
      this.remote.z = this.position.z;
      this.remote.yaw = this.yaw;
      this.remote.pitch = this.pitch;
      const muzzle = this.remote.getMuzzlePosition();
      const aim = pickShotTarget(this.world, muzzle, player);
      const tx = aim.x - muzzle.x;
      const ty = aim.y - muzzle.y;
      const tz = aim.z - muzzle.z;
      const len = Math.hypot(tx, ty, tz) || 1;
      weapons.spawnBotBullet(muzzle, { x: tx / len, y: ty / len, z: tz / len }, this.id, Mode.PISTOL);
      this.remote.flashMuzzle();
      audio?.playSpatialShot(player.position, muzzle, WEAPON_STATS[Mode.PISTOL]?.pitch ?? 1);
      this.shotCooldown = PISTOL_COOLDOWN + Math.random() * 0.06;
    }
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

function pickChaseSteer(world, pos, target, side) {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const baseYaw = Math.atan2(-dx, -dz);
  const offsets = [0, 0.5 * side, -0.5 * side, 1.05 * side, -1.05 * side, 1.65 * side, -1.65 * side];
  let best = null;
  for (const off of offsets) {
    const yaw = baseYaw + off;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const nx = pos.x + fx * 1.15;
    const nz = pos.z + fz * 1.15;
    if (!hasSupport(world, nx, pos.y, nz)) continue;
    if (bodyBlocked(world, nx, pos.y, nz) && bodyBlocked(world, pos.x + fx * 0.7, pos.y, pos.z + fz * 0.7)) {
      continue;
    }
    const remain = Math.hypot(target.x - nx, target.z - nz);
    const turnPenalty = Math.abs(off) * 0.55;
    const score = remain + turnPenalty;
    if (!best || score < best.score) best = { fx, fz, score };
  }
  if (best) return best;
  return { fx: -Math.sin(baseYaw), fz: -Math.cos(baseYaw), score: Math.hypot(dx, dz) };
}

function shouldJump(world, pos, fx, fz, target) {
  const aheadX = pos.x + fx * 0.8;
  const aheadZ = pos.z + fz * 0.8;
  const foot = isSolid(world.getBlock(Math.floor(aheadX), Math.floor(pos.y), Math.floor(aheadZ)));
  const body = isSolid(world.getBlock(Math.floor(aheadX), Math.floor(pos.y) + 1, Math.floor(aheadZ)));
  const head = isSolid(world.getBlock(Math.floor(aheadX), Math.floor(pos.y) + 2, Math.floor(aheadZ)));
  if ((foot || body) && !head) return true;
  if (target.y - pos.y > 0.9 && Math.hypot(target.x - pos.x, target.z - pos.z) < 10) return true;
  return false;
}

function bodyBlocked(world, x, y, z) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);
  return isSolid(world.getBlock(bx, by + 1, bz));
}

function hasSupport(world, x, y, z) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let dy = 0; dy <= 5; dy++) {
    if (isSolid(world.getBlock(bx, Math.floor(y) - dy, bz))) return true;
  }
  return false;
}

function pickShotTarget(world, from, player) {
  for (let i = 0; i < 8; i++) {
    const aim = randomBodyAim(player);
    if (hasLineOfSight(world, from, aim)) return aim;
  }
  return {
    x: player.position.x,
    y: player.position.y + PLAYER_HEIGHT * 0.55,
    z: player.position.z,
  };
}

function randomBodyAim(player) {
  const roll = Math.random();
  let yOff;
  let xOff = (Math.random() - 0.5) * 0.22;
  let zOff = (Math.random() - 0.5) * 0.12;
  if (roll < 0.1) {
    yOff = PLAYER_HEIGHT * 0.88;
    xOff *= 0.5;
    zOff *= 0.5;
  } else if (roll < 0.55) {
    yOff = PLAYER_HEIGHT * (0.42 + Math.random() * 0.28);
  } else if (roll < 0.78) {
    yOff = PLAYER_HEIGHT * 0.58;
    xOff = (Math.random() < 0.5 ? -1 : 1) * 0.36;
  } else {
    yOff = PLAYER_HEIGHT * (0.1 + Math.random() * 0.28);
    xOff = (Math.random() < 0.5 ? -0.14 : 0.14);
  }

  const yaw = player.yaw || 0;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: player.position.x + xOff * cos - zOff * sin,
    y: player.position.y + yOff,
    z: player.position.z + xOff * sin + zOff * cos,
  };
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
