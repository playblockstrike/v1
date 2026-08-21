/** Shared player dimensions — collision, mesh, and shot hit tests all use these. */
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;
export const PLAYER_HALF_WIDTH = PLAYER_WIDTH / 2;

export const MAX_HEALTH = 100;
/** Fallback if a hit arrives without a part. */
export const SHOT_DAMAGE = 40;
export const RESPAWN_DELAY_SEC = 3;
/** Die and respawn after falling this far below the world. */
export const VOID_KILL_Y = -6;

export const HitPart = {
  HEAD: 'head',
  BODY: 'body',
  ARM: 'arm',
  LEG: 'leg',
};

export const HIT_DAMAGE = {
  [HitPart.HEAD]: 100,
  [HitPart.BODY]: 40,
  [HitPart.ARM]: 20,
  [HitPart.LEG]: 20,
};

const LEG_H = PLAYER_HEIGHT * 0.4;
const TORSO_H = PLAYER_HEIGHT * 0.35;
const HEAD_S = PLAYER_WIDTH * 0.7;
const BODY_W = PLAYER_WIDTH * 0.85;
const BODY_D = PLAYER_WIDTH * 0.45;
const ARM_W = PLAYER_WIDTH * 0.28;
const ARM_H = TORSO_H * 0.95;
const LEG_W = PLAYER_WIDTH * 0.32;

/** Local-space hit zones (feet at origin, +Y up). Match remote mesh proportions. */
export const PLAYER_HIT_ZONES = [
  {
    part: HitPart.HEAD,
    damage: HIT_DAMAGE[HitPart.HEAD],
    priority: 3,
    box: {
      minX: -HEAD_S * 0.5,
      maxX: HEAD_S * 0.5,
      minY: LEG_H + TORSO_H,
      maxY: LEG_H + TORSO_H + HEAD_S,
      minZ: -HEAD_S * 0.5,
      maxZ: HEAD_S * 0.5,
    },
  },
  {
    part: HitPart.BODY,
    damage: HIT_DAMAGE[HitPart.BODY],
    priority: 2,
    box: {
      minX: -BODY_W * 0.5,
      maxX: BODY_W * 0.5,
      minY: LEG_H,
      maxY: LEG_H + TORSO_H,
      minZ: -BODY_D * 0.5,
      maxZ: BODY_D * 0.5,
    },
  },
  {
    part: HitPart.ARM,
    damage: HIT_DAMAGE[HitPart.ARM],
    priority: 1,
    box: {
      minX: -(BODY_W * 0.5 + ARM_W),
      maxX: -BODY_W * 0.5,
      minY: LEG_H + (TORSO_H - ARM_H) * 0.5,
      maxY: LEG_H + (TORSO_H - ARM_H) * 0.5 + ARM_H,
      minZ: -ARM_W * 0.5,
      maxZ: ARM_W * 0.5,
    },
  },
  {
    part: HitPart.ARM,
    damage: HIT_DAMAGE[HitPart.ARM],
    priority: 1,
    box: {
      minX: BODY_W * 0.5,
      maxX: BODY_W * 0.5 + ARM_W,
      minY: LEG_H + (TORSO_H - ARM_H) * 0.5,
      maxY: LEG_H + (TORSO_H - ARM_H) * 0.5 + ARM_H,
      minZ: -ARM_W * 0.5,
      maxZ: ARM_W * 0.5,
    },
  },
  {
    part: HitPart.LEG,
    damage: HIT_DAMAGE[HitPart.LEG],
    priority: 1,
    box: {
      minX: -LEG_W * 1.1,
      maxX: -LEG_W * 0.05,
      minY: 0,
      maxY: LEG_H,
      minZ: -LEG_W * 0.5,
      maxZ: LEG_W * 0.5,
    },
  },
  {
    part: HitPart.LEG,
    damage: HIT_DAMAGE[HitPart.LEG],
    priority: 1,
    box: {
      minX: LEG_W * 0.05,
      maxX: LEG_W * 1.1,
      minY: 0,
      maxY: LEG_H,
      minZ: -LEG_W * 0.5,
      maxZ: LEG_W * 0.5,
    },
  },
];

export function playerAabb(x, y, z) {
  const hw = PLAYER_HALF_WIDTH;
  return {
    minX: x - hw,
    maxX: x + hw,
    minY: y,
    maxY: y + PLAYER_HEIGHT,
    minZ: z - hw,
    maxZ: z + hw,
  };
}

function toPlayerLocal(point, origin, yaw) {
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  return {
    x: dx * cos - dz * sin,
    y: point.y - origin.y,
    z: dx * sin + dz * cos,
  };
}

/**
 * Ray-test a player’s body parts in local space.
 * @returns {{ id, t, part, damage, x, y, z } | null}
 */
export function tracePlayerParts(from, to, target) {
  if (!target || target.dead) return null;
  const origin = { x: target.x, y: target.y, z: target.z };
  const yaw = target.yaw || 0;
  const localFrom = toPlayerLocal(from, origin, yaw);
  const localTo = toPlayerLocal(to, origin, yaw);

  let best = null;
  for (const zone of PLAYER_HIT_ZONES) {
    const t = segmentHitsAabb(localFrom, localTo, zone.box);
    if (t == null) continue;
    const better =
      !best ||
      t < best.t - 1e-6 ||
      (Math.abs(t - best.t) <= 1e-6 && zone.priority > best.priority);
    if (!better) continue;
    best = {
      t,
      part: zone.part,
      damage: zone.damage,
      priority: zone.priority,
    };
  }

  if (!best) return null;
  return {
    id: target.id ?? null,
    t: best.t,
    part: best.part,
    damage: best.damage,
    x: from.x + (to.x - from.x) * best.t,
    y: from.y + (to.y - from.y) * best.t,
    z: from.z + (to.z - from.z) * best.t,
  };
}

export function damageForPart(part) {
  return HIT_DAMAGE[part] ?? SHOT_DAMAGE;
}

/** True if segment from→to intersects the AABB (inclusive). */
export function segmentHitsAabb(from, to, box) {
  let t0 = 0;
  let t1 = 1;

  const clip = (start, end, min, max) => {
    const d = end - start;
    if (Math.abs(d) < 1e-8) {
      return start >= min && start <= max;
    }
    const inv = 1 / d;
    let tNear = (min - start) * inv;
    let tFar = (max - start) * inv;
    if (tNear > tFar) {
      const tmp = tNear;
      tNear = tFar;
      tFar = tmp;
    }
    if (tNear > t0) t0 = tNear;
    if (tFar < t1) t1 = tFar;
    return t0 <= t1;
  };

  if (!clip(from.x, to.x, box.minX, box.maxX)) return null;
  if (!clip(from.y, to.y, box.minY, box.maxY)) return null;
  if (!clip(from.z, to.z, box.minZ, box.maxZ)) return null;
  if (t0 < 0 || t0 > 1) return null;
  return t0;
}
