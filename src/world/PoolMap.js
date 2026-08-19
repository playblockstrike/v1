import {
  BlockId,
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  FLOOR_Y,
  WORLD_SIZE,
} from '../blocks/BlockTypes.js';

const F = FLOOR_Y;
const CEIL = F + 7;
const POOL_BOTTOM = F - 2;

/**
 * Hand-built fy_pool_day layout in Minecraft-style tiles.
 * Coordinates: X west→east (red | white | blue), Z south→north.
 */
export class PoolMapGenerator {
  constructor() {
    /** @type {Array<{x:number,z:number}>} */
    this.spawns = [];
    this.ops = [];
    this.build();
  }

  fill(x0, x1, y0, y1, z0, z1, id) {
    this.ops.push({ x0, x1, y0, y1, z0, z1, id });
  }

  column(x, z, y0, y1, id) {
    this.fill(x, x, y0, y1, z, z, id);
  }

  teamWall(y, team) {
    const rel = y - F;
    if (rel <= 2) return team;
    if (rel === 3) return BlockId.TILE_WHITE;
    if (rel <= 5) return team;
    if (rel === 6) return BlockId.TILE_PINK;
    return team;
  }

  wallBand(x0, x1, z0, z1, team) {
    for (let y = F + 1; y < CEIL; y++) {
      this.fill(x0, x1, y, y, z0, z1, this.teamWall(y, team));
    }
  }

  build() {
    const W = BlockId.TILE_WHITE;
    const R = BlockId.TILE_RED;
    const B = BlockId.TILE_BLUE;
    const C = BlockId.CONCRETE;
    const Cyan = BlockId.TILE_CYAN;
    const Water = BlockId.WATER;
    const Locker = BlockId.LOCKER;
    const Glass = BlockId.GLASS;
    const Navy = BlockId.TILE_NAVY;

    // Foundation + default floor (white deck)
    this.fill(0, 63, 0, F - 1, 0, 63, BlockId.STONE);
    this.fill(1, 62, F, F, 1, 62, W);

    // Team floors
    this.fill(1, 20, F, F, 1, 62, R);
    this.fill(43, 62, F, F, 1, 62, B);

    // Outer perimeter
    this.wallBand(0, 0, 0, 63, C);
    this.wallBand(63, 63, 0, 63, C);
    this.wallBand(0, 63, 0, 0, C);
    this.wallBand(0, 63, 63, 63, C);
    this.fill(0, 63, F, F, 0, 0, C);
    this.fill(0, 63, F, F, 63, 63, C);
    this.fill(0, 0, F, F, 0, 63, C);
    this.fill(63, 63, F, F, 0, 63, C);

    // Lane separators (openings as doorways)
    this.wallBand(21, 21, 1, 62, W);
    this.wallBand(42, 42, 1, 62, W);
    // Doorways — punch air through separators
    this.fill(21, 21, F + 1, CEIL - 1, 12, 16, BlockId.AIR);
    this.fill(21, 21, F + 1, CEIL - 1, 40, 44, BlockId.AIR);
    this.fill(42, 42, F + 1, CEIL - 1, 12, 16, BlockId.AIR);
    this.fill(42, 42, F + 1, CEIL - 1, 40, 44, BlockId.AIR);

    // Colored walls just inside team sides of separators
    this.wallBand(20, 20, 1, 11, R);
    this.wallBand(20, 20, 17, 39, R);
    this.wallBand(20, 20, 45, 62, R);
    this.wallBand(43, 43, 1, 11, B);
    this.wallBand(43, 43, 17, 39, B);
    this.wallBand(43, 43, 45, 62, B);

    // Main pool (recessed)
    const px0 = 25;
    const px1 = 38;
    const pz0 = 20;
    const pz1 = 35;
    this.fill(px0, px1, POOL_BOTTOM, F, pz0, pz1, Cyan);
    this.fill(px0 + 1, px1 - 1, POOL_BOTTOM, POOL_BOTTOM, pz0 + 1, pz1 - 1, Cyan);
    this.fill(px0 + 1, px1 - 1, POOL_BOTTOM + 1, F, pz0 + 1, pz1 - 1, Water);

    // Diving board from south deck into the pool
    this.fill(30, 33, F, F, 36, 37, W);
    this.fill(30, 33, F, F, 34, 35, W);
    this.fill(30, 33, F, F + 1, 35, 35, W);

    // Small north pool
    this.fill(27, 36, POOL_BOTTOM, F, 48, 59, Cyan);
    this.fill(28, 35, POOL_BOTTOM + 1, F, 49, 58, Water);

    // Cover walls around main pool (waist / chest high)
    this.fill(23, 24, F + 1, F + 2, 18, 22, W);
    this.fill(39, 40, F + 1, F + 2, 18, 22, W);
    this.fill(23, 24, F + 1, F + 1, 36, 40, W);
    this.fill(39, 40, F + 1, F + 1, 36, 40, W);
    this.fill(31, 32, F + 1, F + 2, 17, 18, W);

    // Blue stairs on east of pool
    this.fill(39, 41, F + 1, F + 1, 24, 26, B);
    this.fill(40, 41, F + 2, F + 2, 24, 26, B);
    this.fill(41, 41, F + 3, F + 3, 24, 26, Navy);

    // Matching west stairs
    this.fill(22, 24, F + 1, F + 1, 24, 26, B);
    this.fill(22, 23, F + 2, F + 2, 24, 26, B);
    this.fill(22, 22, F + 3, F + 3, 24, 26, Navy);

    // E-shaped cover walls on team sides (dark concrete)
    this.fill(16, 19, F + 1, F + 4, 18, 19, C);
    this.fill(16, 19, F + 1, F + 4, 28, 29, C);
    this.fill(16, 19, F + 1, F + 4, 38, 39, C);
    this.fill(19, 19, F + 1, F + 4, 18, 39, C);

    this.fill(44, 47, F + 1, F + 4, 18, 19, C);
    this.fill(44, 47, F + 1, F + 4, 28, 29, C);
    this.fill(44, 47, F + 1, F + 4, 38, 39, C);
    this.fill(44, 44, F + 1, F + 4, 18, 39, C);

    // Grey barriers in team halls
    this.fill(8, 10, F + 1, F + 2, 22, 28, BlockId.COBBLE);
    this.fill(53, 55, F + 1, F + 2, 22, 28, BlockId.COBBLE);

    // Toilet stalls (north corners)
    this.buildStalls(2, 8, 50, 61, R);
    this.buildStalls(55, 61, 50, 61, B);

    // Lockers along outer walls
    for (let z = 10; z <= 32; z += 1) {
      this.fill(2, 2, F + 1, F + 2, z, z, Locker);
      this.fill(61, 61, F + 1, F + 2, z, z, Locker);
    }
    for (let z = 10; z <= 18; z += 1) {
      this.fill(18, 18, F + 1, F + 2, z, z, Locker);
      this.fill(45, 45, F + 1, F + 2, z, z, Locker);
    }

    // Lounge chairs (striped)
    this.buildChair(23, 17);
    this.buildChair(38, 17);

    // Center pillars
    this.wallBand(23, 24, 42, 43, W);
    this.wallBand(39, 40, 42, 43, W);

    // Ceiling: solid over team rooms, glass over deck, open over pools
    this.fill(1, 20, CEIL, CEIL, 1, 62, R);
    this.fill(43, 62, CEIL, CEIL, 1, 62, B);
    this.fill(21, 42, CEIL, CEIL, 1, 62, Glass);
    this.fill(px0, px1, CEIL, CEIL, pz0, pz1, BlockId.AIR);
    this.fill(27, 36, CEIL, CEIL, 48, 59, BlockId.AIR);
    // Glass frame around skylights
    this.fill(px0 - 1, px1 + 1, CEIL, CEIL, pz0 - 1, pz0 - 1, Glass);
    this.fill(px0 - 1, px1 + 1, CEIL, CEIL, pz1 + 1, pz1 + 1, Glass);
    this.fill(px0 - 1, px0 - 1, CEIL, CEIL, pz0, pz1, Glass);
    this.fill(px1 + 1, px1 + 1, CEIL, CEIL, pz0, pz1, Glass);

    // Spawn pads on team floors (south halls)
    for (const x of [4, 7, 10, 13]) {
      for (const z of [4, 7, 10]) {
        this.spawns.push({ x: x + 0.5, y: F + 1, z: z + 0.5 });
      }
    }
    for (const x of [50, 53, 56, 59]) {
      for (const z of [4, 7, 10]) {
        this.spawns.push({ x: x + 0.5, y: F + 1, z: z + 0.5 });
      }
    }
  }

  buildStalls(x0, x1, z0, z1, team) {
    this.wallBand(x0, x1, z0, z0, team);
    this.wallBand(x0, x1, z1, z1, team);
    this.wallBand(x0, x0, z0, z1, team);
    this.wallBand(x1, x1, z0, z1, team);
    const span = z1 - z0;
    const step = Math.floor(span / 3);
    for (let i = 1; i <= 2; i++) {
      const z = z0 + i * step;
      this.wallBand(x0, x1, z, z, team);
    }
  }

  buildChair(x, z) {
    this.fill(x, x + 1, F + 1, F + 1, z, z + 2, BlockId.TILE_WHITE);
    this.fill(x, x + 1, F + 1, F + 1, z + 1, z + 1, BlockId.TILE_BLUE);
    this.fill(x, x + 1, F + 1, F + 2, z + 2, z + 2, BlockId.TILE_NAVY);
  }

  generateChunk(chunk) {
    const { cx, cz } = chunk;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = ox + lx;
        const wz = oz + lz;
        if (wx < 0 || wz < 0 || wx >= WORLD_SIZE || wz >= WORLD_SIZE) continue;
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          chunk.setBlock(lx, y, lz, BlockId.AIR);
        }
      }
    }

    for (const op of this.ops) {
      const x0 = Math.max(op.x0, ox);
      const x1 = Math.min(op.x1, ox + CHUNK_SIZE - 1);
      const z0 = Math.max(op.z0, oz);
      const z1 = Math.min(op.z1, oz + CHUNK_SIZE - 1);
      if (x0 > x1 || z0 > z1) continue;
      const y0 = Math.max(0, op.y0);
      const y1 = Math.min(CHUNK_HEIGHT - 1, op.y1);
      if (y0 > y1) continue;
      for (let wx = x0; wx <= x1; wx++) {
        for (let wz = z0; wz <= z1; wz++) {
          const lx = wx - ox;
          const lz = wz - oz;
          for (let y = y0; y <= y1; y++) {
            chunk.setBlock(lx, y, lz, op.id);
          }
        }
      }
    }

    chunk.dirty = true;
  }
}
