import { isSolid } from '../blocks/BlockTypes.js';

const DEFAULT_MAX_DISTANCE = 6;

export function castRay(world, origin, direction, maxDistance = DEFAULT_MAX_DISTANCE) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = direction.x > 0 ? 1 : -1;
  const stepY = direction.y > 0 ? 1 : -1;
  const stepZ = direction.z > 0 ? 1 : -1;

  const tDeltaX = direction.x === 0 ? Infinity : Math.abs(1 / direction.x);
  const tDeltaY = direction.y === 0 ? Infinity : Math.abs(1 / direction.y);
  const tDeltaZ = direction.z === 0 ? Infinity : Math.abs(1 / direction.z);

  let tMaxX =
    direction.x > 0
      ? (Math.floor(origin.x) + 1 - origin.x) * tDeltaX
      : (origin.x - Math.floor(origin.x)) * tDeltaX;
  let tMaxY =
    direction.y > 0
      ? (Math.floor(origin.y) + 1 - origin.y) * tDeltaY
      : (origin.y - Math.floor(origin.y)) * tDeltaY;
  let tMaxZ =
    direction.z > 0
      ? (Math.floor(origin.z) + 1 - origin.z) * tDeltaZ
      : (origin.z - Math.floor(origin.z)) * tDeltaZ;

  let prevX = x;
  let prevY = y;
  let prevZ = z;
  let face = null;
  let distance = 0;

  for (let i = 0; i < 64; i++) {
    if (isSolid(world.getBlock(x, y, z))) {
      return {
        hit: true,
        block: { x, y, z },
        place: { x: prevX, y: prevY, z: prevZ },
        face,
        distance,
      };
    }

    prevX = x;
    prevY = y;
    prevZ = z;

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      distance = tMaxX;
      tMaxX += tDeltaX;
      face = stepX > 0 ? 'west' : 'east';
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      distance = tMaxY;
      tMaxY += tDeltaY;
      face = stepY > 0 ? 'bottom' : 'top';
    } else {
      z += stepZ;
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      face = stepZ > 0 ? 'north' : 'south';
    }

    if (distance > maxDistance) break;
  }

  return { hit: false };
}
