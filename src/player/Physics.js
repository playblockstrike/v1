import { isSolid } from '../blocks/BlockTypes.js';
import { PLAYER_HALF_WIDTH, PLAYER_HEIGHT } from './PlayerDims.js';

/**
 * AABB collision against the voxel world. Entity must have
 * `{ position, velocity, onGround }`.
 */
export function resolveCollision(entity, world, axis) {
  const hw = PLAYER_HALF_WIDTH;
  const { position: p, velocity: v } = entity;
  const minX = Math.floor(p.x - hw);
  const maxX = Math.floor(p.x + hw - 0.001);
  const minY = Math.floor(p.y);
  const maxY = Math.floor(p.y + PLAYER_HEIGHT - 0.001);
  const minZ = Math.floor(p.z - hw);
  const maxZ = Math.floor(p.z + hw - 0.001);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (!isSolid(world.getBlock(x, y, z))) continue;

        if (axis === 'x') {
          if (v.x > 0) p.x = x - hw;
          else if (v.x < 0) p.x = x + 1 + hw;
          else {
            const cx = p.x;
            p.x = cx < x + 0.5 ? x - hw : x + 1 + hw;
          }
          v.x = 0;
        } else if (axis === 'y') {
          if (v.y > 0) {
            p.y = y - PLAYER_HEIGHT;
          } else if (v.y < 0) {
            p.y = y + 1;
            entity.onGround = true;
          } else {
            const cy = p.y + PLAYER_HEIGHT * 0.5;
            if (cy < y + 0.5) {
              p.y = y - PLAYER_HEIGHT;
            } else {
              p.y = y + 1;
              entity.onGround = true;
            }
          }
          v.y = 0;
        } else if (axis === 'z') {
          if (v.z > 0) p.z = z - hw;
          else if (v.z < 0) p.z = z + 1 + hw;
          else {
            const cz = p.z;
            p.z = cz < z + 0.5 ? z - hw : z + 1 + hw;
          }
          v.z = 0;
        }
      }
    }
  }
}

export function applyPhysics(entity, world, dt) {
  const { position: p, velocity: v } = entity;
  p.x += v.x * dt;
  resolveCollision(entity, world, 'x');

  p.y += v.y * dt;
  entity.onGround = false;
  resolveCollision(entity, world, 'y');

  p.z += v.z * dt;
  resolveCollision(entity, world, 'z');

  if (entity.onGround) {
    v.y = Math.min(v.y, 0);
  }
}
