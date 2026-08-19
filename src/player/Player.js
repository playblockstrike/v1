import { isSolid } from '../blocks/BlockTypes.js';
import {
  EYE_HEIGHT,
  MAX_HEALTH,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  RESPAWN_DELAY_SEC,
  SHOT_DAMAGE,
  damageForPart,
  playerAabb,
} from './PlayerDims.js';

const GRAVITY = 28;
const JUMP_VELOCITY = 9.5;
const WALK_SPEED = 5.5;
const SPRINT_SPEED = 9;

export {
  EYE_HEIGHT,
  MAX_HEALTH,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  RESPAWN_DELAY_SEC,
  SHOT_DAMAGE,
  damageForPart,
  playerAabb,
};

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = { x: 0, y: 20, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.onHealthChange = null;
    this.onDeath = null;
    this.onRespawn = null;
  }

  get eyePosition() {
    return {
      x: this.position.x,
      y: this.position.y + EYE_HEIGHT,
      z: this.position.z,
    };
  }

  get aabb() {
    return playerAabb(this.position.x, this.position.y, this.position.z);
  }

  get direction() {
    const cos = Math.cos(this.pitch);
    return {
      x: -Math.sin(this.yaw) * cos,
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * cos,
    };
  }

  get forward() {
    return {
      x: -Math.sin(this.yaw),
      z: -Math.cos(this.yaw),
    };
  }

  get right() {
    return {
      x: Math.cos(this.yaw),
      z: -Math.sin(this.yaw),
    };
  }

  rotate(dx, dy, scale = 1) {
    const sensitivity = 0.002 * scale;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  updateMovement(controls, dt) {
    if (this.dead) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.velocity.y -= GRAVITY * dt;
      return;
    }

    const sprint = controls.isDown('ShiftLeft') || controls.isDown('ShiftRight');
    const speed = sprint ? SPRINT_SPEED : WALK_SPEED;

    let moveX = 0;
    let moveZ = 0;
    if (controls.isDown('KeyW')) moveZ += 1;
    if (controls.isDown('KeyS')) moveZ -= 1;
    if (controls.isDown('KeyA')) moveX -= 1;
    if (controls.isDown('KeyD')) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    const forward = this.forward;
    const right = this.right;

    this.velocity.x = (forward.x * moveZ + right.x * moveX) * speed;
    this.velocity.z = (forward.z * moveZ + right.z * moveX) * speed;

    if (this.onGround && controls.isDown('Space')) {
      this.velocity.y = JUMP_VELOCITY;
      this.onGround = false;
    }

    this.velocity.y -= GRAVITY * dt;
  }

  applyPhysics(world, dt) {
    this.position.x += this.velocity.x * dt;
    this.resolveCollision(world, 'x');

    this.position.y += this.velocity.y * dt;
    this.onGround = false;
    this.resolveCollision(world, 'y');

    this.position.z += this.velocity.z * dt;
    this.resolveCollision(world, 'z');

    world.clampPosition?.(this.position, PLAYER_HALF_WIDTH);

    if (this.onGround) {
      this.velocity.y = Math.min(this.velocity.y, 0);
    }
  }

  resolveCollision(world, axis) {
    const hw = PLAYER_HALF_WIDTH;
    const minX = Math.floor(this.position.x - hw);
    const maxX = Math.floor(this.position.x + hw - 0.001);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + PLAYER_HEIGHT - 0.001);
    const minZ = Math.floor(this.position.z - hw);
    const maxZ = Math.floor(this.position.z + hw - 0.001);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (!isSolid(world.getBlock(x, y, z))) continue;

          if (axis === 'x') {
            if (this.velocity.x > 0) this.position.x = x - hw;
            else if (this.velocity.x < 0) this.position.x = x + 1 + hw;
            else {
              // Resolve static overlap (e.g. after spawn / shove).
              const cx = this.position.x;
              this.position.x = cx < x + 0.5 ? x - hw : x + 1 + hw;
            }
            this.velocity.x = 0;
          } else if (axis === 'y') {
            if (this.velocity.y > 0) {
              this.position.y = y - PLAYER_HEIGHT;
            } else if (this.velocity.y < 0) {
              this.position.y = y + 1;
              this.onGround = true;
            } else {
              const cy = this.position.y + PLAYER_HEIGHT * 0.5;
              if (cy < y + 0.5) {
                this.position.y = y - PLAYER_HEIGHT;
              } else {
                this.position.y = y + 1;
                this.onGround = true;
              }
            }
            this.velocity.y = 0;
          } else if (axis === 'z') {
            if (this.velocity.z > 0) this.position.z = z - hw;
            else if (this.velocity.z < 0) this.position.z = z + 1 + hw;
            else {
              const cz = this.position.z;
              this.position.z = cz < z + 0.5 ? z - hw : z + 1 + hw;
            }
            this.velocity.z = 0;
          }
        }
      }
    }
  }

  takeDamage(amount = SHOT_DAMAGE) {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    this.onHealthChange?.(this.health, MAX_HEALTH);
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.respawnAt = performance.now() + RESPAWN_DELAY_SEC * 1000;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.onHealthChange?.(0, MAX_HEALTH);
    this.onDeath?.();
  }

  /** @returns {number} seconds remaining, or 0 if alive / just respawned */
  updateRespawn(world) {
    if (!this.dead) return 0;
    const left = (this.respawnAt - performance.now()) / 1000;
    if (left > 0) return left;
    this.respawn(world);
    return 0;
  }

  respawn(world) {
    const spawn = world.getRandomSpawnPosition?.() ?? world.getSpawnPosition();
    this.position.x = spawn.x;
    this.position.y = spawn.y;
    this.position.z = spawn.z;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.onHealthChange?.(this.health, MAX_HEALTH);
    this.onRespawn?.(spawn);
  }

  resetCombat() {
    this.health = MAX_HEALTH;
    this.dead = false;
    this.respawnAt = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.onHealthChange?.(this.health, MAX_HEALTH);
  }

  syncCamera() {
    const eye = this.eyePosition;
    this.camera.position.set(eye.x, eye.y, eye.z);
    const dir = this.direction;
    this.camera.lookAt(eye.x + dir.x, eye.y + dir.y, eye.z + dir.z);
  }
}
