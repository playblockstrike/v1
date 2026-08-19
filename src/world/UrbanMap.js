import {
  BlockId,
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  FLOOR_Y,
  WORLD_SIZE,
} from '../blocks/BlockTypes.js';

const F = FLOOR_Y;
const MAX = WORLD_SIZE - 1;

/**
 * Streets — compact urban FFA map (64×64).
 *
 * 180° rotational symmetry around mid so both spawn plazas have the same
 * routes. Three lanes: west alley (CQC), mid crossroads (rifle), east copy
 * of the alley. Diagonal shops own the roofs; flats own 2F window peeks.
 *
 *   z
 *   63  N plaza (spawn)
 *       flats          | NS road |          shop
 *       ---------------+  mid    +---------------
 *          EW road     | fountain|     EW road
 *       ---------------+         +---------------
 *       shop           | NS road |          flats
 *    0  S plaza (spawn)
 *       0                                         63 x
 */
export class UrbanMapGenerator {
  constructor() {
    /** @type {Array<{x:number,y:number,z:number}>} */
    this.spawns = [];
    this.ops = [];
    this.build();
  }

  fill(x0, x1, y0, y1, z0, z1, id) {
    this.ops.push({ x0, x1, y0, y1, z0, z1, id });
  }

  /** Place a box and its 180° copy around the map center. */
  fillRot(x0, x1, y0, y1, z0, z1, id) {
    this.fill(x0, x1, y0, y1, z0, z1, id);
    this.fill(MAX - x1, MAX - x0, y0, y1, MAX - z1, MAX - z0, id);
  }

  column(x, z, y0, y1, id) {
    this.fill(x, x, y0, y1, z, z, id);
  }

  build() {
    const A = BlockId.AIR;
    const Grass = BlockId.GRASS;
    const Dirt = BlockId.DIRT;
    const Stone = BlockId.STONE;
    const Wood = BlockId.WOOD;
    const Leaves = BlockId.LEAVES;
    const Cobble = BlockId.COBBLE;
    const White = BlockId.TILE_WHITE;
    const Navy = BlockId.TILE_NAVY;
    const Concrete = BlockId.CONCRETE;
    const Asphalt = BlockId.ASPHALT;
    const Brick = BlockId.BRICK;
    const Metal = BlockId.METAL;
    const Paint = BlockId.PAINT;
    const Locker = BlockId.LOCKER;
    const Cyan = BlockId.TILE_CYAN;

    // Foundation
    this.fill(0, MAX, 0, F - 2, 0, MAX, Stone);
    this.fill(0, MAX, F - 1, F - 1, 0, MAX, Dirt);
    this.fill(1, MAX - 1, F, F, 1, MAX - 1, Grass);

    // Crossroads
    this.fill(28, 35, F, F, 1, MAX - 1, Asphalt);
    this.fill(1, MAX - 1, F, F, 28, 35, Asphalt);

    // Sidewalks between buildings and curb
    this.fillRot(26, 27, F, F, 9, 25, Concrete);
    this.fillRot(9, 25, F, F, 26, 27, Concrete);
    this.fillRot(26, 27, F, F, 38, 54, Concrete);
    this.fillRot(38, 54, F, F, 26, 27, Concrete);
    this.fillRot(26, 37, F, F, 26, 27, Concrete);
    this.fillRot(26, 27, F, F, 26, 37, Concrete);

    // Lane paint (dashed) — skip the fountain block
    for (let z = 2; z <= 24; z += 4) {
      this.fillRot(31, 32, F, F, z, z + 1, Paint);
    }
    for (let x = 2; x <= 24; x += 4) {
      this.fillRot(x, x + 1, F, F, 31, 32, Paint);
    }

    // Crosswalks at the intersection
    this.fillRot(28, 35, F, F, 26, 27, White);
    this.fillRot(26, 27, F, F, 28, 35, White);

    this.buildPerimeter(Brick, Navy, Concrete);
    this.buildSpawnCover(Concrete);
    this.buildShop(Brick, Concrete, Wood, Locker, Metal, A);
    this.buildFlats(White, Brick, Wood, Cobble, A);
    this.buildFountain(Cyan, Cobble, Stone);
    this.buildAlleyCover(Brick, Metal, Wood);
    this.buildCars();
    this.buildTrees(Wood, Leaves);
    this.buildSpawns();
  }

  buildPerimeter(brick, navy, concrete) {
    // Surrounding city facades — 2-story fake buildings on the world edge
    this.fillRot(0, 0, F, F + 10, 0, MAX, brick);
    this.fillRot(0, MAX, F, F + 10, 0, 0, brick);
    this.fillRot(0, 0, F, F, 0, MAX, concrete);
    this.fillRot(0, MAX, F, F, 0, 0, concrete);

    for (let z = 4; z <= 28; z += 7) {
      this.fillRot(0, 0, F + 2, F + 3, z, z + 2, navy);
      this.fillRot(0, 0, F + 7, F + 8, z, z + 2, navy);
    }
    for (let x = 4; x <= 28; x += 7) {
      this.fillRot(x, x + 2, F + 2, F + 3, 0, 0, navy);
      this.fillRot(x, x + 2, F + 7, F + 8, 0, 0, navy);
    }
  }

  /** 2-high walls between plaza and mid, with three exits (alley / street / alley). */
  buildSpawnCover(concrete) {
    this.fillRot(1, 10, F + 1, F + 2, 8, 8, concrete);
    this.fillRot(19, 27, F + 1, F + 2, 8, 8, concrete);
    this.fillRot(36, 44, F + 1, F + 2, 8, 8, concrete);
    this.fillRot(53, 62, F + 1, F + 2, 8, 8, concrete);
    this.fillRot(11, 12, F + 1, F + 1, 8, 8, BlockId.WOOD);
    this.fillRot(51, 52, F + 1, F + 1, 8, 8, BlockId.WOOD);
  }

  /**
   * 1-story shop with garage bay facing mid and stairs to a roof.
   * SW footprint (9–25, 9–25) copies to NE.
   */
  buildShop(brick, concrete, wood, locker, metal, air) {
    const x0 = 9;
    const x1 = 25;
    const z0 = 9;
    const z1 = 25;

    this.fillRot(x0, x1, F, F, z0, z1, BlockId.COBBLE);
    this.fillRot(x0, x1, F + 1, F + 5, z0, z0, brick);
    this.fillRot(x0, x1, F + 1, F + 5, z1, z1, brick);
    this.fillRot(x0, x0, F + 1, F + 5, z0, z1, brick);
    this.fillRot(x1, x1, F + 1, F + 5, z0, z1, brick);
    this.fillRot(x0, x1, F + 5, F + 5, z0, z1, concrete);

    // 1-high parapet — crouch cover, no headglitch
    this.fillRot(x0, x1, F + 6, F + 6, z0, z0, concrete);
    this.fillRot(x0, x1, F + 6, F + 6, z1, z1, concrete);
    this.fillRot(x0, x0, F + 6, F + 6, z0, z1, concrete);
    this.fillRot(x1, x1, F + 6, F + 6, z0, z1, concrete);

    // Garage bay toward mid (4-wide choke, not a highway)
    this.fillRot(15, 18, F + 1, F + 4, z1, z1, air);
    // Spawn-side door
    this.fillRot(16, 17, F + 1, F + 3, z0, z0, air);
    // Alley door
    this.fillRot(x0, x0, F + 1, F + 3, 16, 17, air);
    // Street door
    this.fillRot(x1, x1, F + 1, F + 3, 16, 17, air);
    // Side windows (peek, not headglitch — sill at F+2)
    this.fillRot(x1, x1, F + 2, F + 3, 11, 12, air);
    this.fillRot(x1, x1, F + 2, F + 3, 21, 22, air);

    // Stairs to roof in the SW corner, landing toward mid
    this.fillRot(10, 11, F + 1, F + 1, 11, 11, wood);
    this.fillRot(10, 11, F + 2, F + 2, 12, 12, wood);
    this.fillRot(10, 11, F + 3, F + 3, 13, 13, wood);
    this.fillRot(10, 11, F + 4, F + 4, 14, 14, wood);
    this.fillRot(10, 11, F + 5, F + 5, 15, 16, wood);
    this.fillRot(10, 11, F + 5, F + 5, 11, 14, air);

    // Interior cover
    this.fillRot(17, 17, F + 1, F + 4, 17, 17, brick);
    this.fillRot(10, 10, F + 1, F + 2, 19, 23, locker);
    this.fillRot(21, 23, F + 1, F + 2, 11, 12, wood);
    this.fillRot(22, 23, F + 1, F + 1, 13, 14, metal);
  }

  /**
   * 2-story flats: CQC 1F with crates, window peeks on 2F toward mid.
   * NW footprint (9–25, 38–54) copies to SE.
   */
  buildFlats(white, brick, wood, cobble, air) {
    const x0 = 9;
    const x1 = 25;
    const z0 = 38;
    const z1 = 54;

    this.fillRot(x0, x1, F, F, z0, z1, cobble);
    this.fillRot(x0, x1, F + 1, F + 10, z0, z0, brick);
    this.fillRot(x0, x1, F + 1, F + 10, z1, z1, brick);
    this.fillRot(x0, x0, F + 1, F + 10, z0, z1, brick);
    this.fillRot(x1, x1, F + 1, F + 10, z0, z1, brick);
    this.fillRot(x0 + 1, x1 - 1, F + 5, F + 5, z0 + 1, z1 - 1, wood);
    this.fillRot(x0, x1, F + 10, F + 10, z0, z1, white);

    // 1F / 2F doors
    this.fillRot(16, 17, F + 1, F + 3, z0, z0, air); // mid
    this.fillRot(16, 17, F + 1, F + 3, z1, z1, air); // plaza
    this.fillRot(x0, x0, F + 1, F + 3, 44, 45, air); // alley
    this.fillRot(x1, x1, F + 1, F + 3, 44, 45, air); // street

    // 1F windows toward mid / street
    this.fillRot(12, 13, F + 2, F + 3, z0, z0, air);
    this.fillRot(20, 21, F + 2, F + 3, z0, z0, air);
    this.fillRot(x1, x1, F + 2, F + 3, 40, 41, air);
    // 2F windows (same sightlines, higher)
    this.fillRot(12, 13, F + 7, F + 8, z0, z0, air);
    this.fillRot(20, 21, F + 7, F + 8, z0, z0, air);
    this.fillRot(x1, x1, F + 7, F + 8, 40, 41, air);
    this.fillRot(16, 17, F + 7, F + 8, z1, z1, air);

    // Stairs to 2F
    this.fillRot(10, 11, F + 1, F + 1, 40, 40, wood);
    this.fillRot(10, 11, F + 2, F + 2, 41, 41, wood);
    this.fillRot(10, 11, F + 3, F + 3, 42, 42, wood);
    this.fillRot(10, 11, F + 4, F + 4, 43, 43, wood);
    this.fillRot(10, 11, F + 5, F + 5, 44, 45, wood);
    this.fillRot(10, 11, F + 5, F + 5, 40, 43, air);

    // 1F partition + crates
    this.fillRot(17, 17, F + 1, F + 4, 40, 43, brick);
    this.fillRot(17, 17, F + 1, F + 4, 47, 51, brick);
    this.fillRot(20, 22, F + 1, F + 2, 48, 49, wood);
    this.fillRot(11, 12, F + 1, F + 1, 50, 52, wood);

    // 2F partition
    this.fillRot(17, 17, F + 6, F + 9, 40, 43, brick);
    this.fillRot(17, 17, F + 6, F + 9, 47, 51, brick);
  }

  buildFountain(cyan, cobble, stone) {
    this.fill(30, 33, F, F, 30, 33, cyan);
    this.fill(30, 33, F + 1, F + 1, 30, 30, cobble);
    this.fill(30, 33, F + 1, F + 1, 33, 33, cobble);
    this.fill(30, 30, F + 1, F + 1, 31, 32, cobble);
    this.fill(33, 33, F + 1, F + 1, 31, 32, cobble);
    this.fill(31, 32, F + 1, F + 3, 31, 32, stone);
  }

  /** Staggered dumpsters and jogs so the alleys are not a long peek. */
  buildAlleyCover(brick, metal, wood) {
    this.fillRot(6, 8, F + 1, F + 2, 14, 15, metal);
    this.fillRot(2, 4, F + 1, F + 2, 22, 23, metal);
    this.fillRot(5, 6, F + 1, F + 2, 20, 20, brick);
    this.fillRot(3, 5, F + 1, F + 1, 40, 41, wood);
    this.fillRot(6, 7, F + 1, F + 2, 48, 50, metal);
    this.fillRot(7, 8, F + 1, F + 2, 18, 19, brick);
    // Sidewalk crates — extra mid-lane cover
    this.fillRot(26, 27, F + 1, F + 2, 20, 21, wood);
    this.fillRot(20, 21, F + 1, F + 2, 26, 27, wood);
  }

  buildCars() {
    // NS street, south — west then east curb
    this.carZ(28, 12, BlockId.TILE_RED);
    this.carZ(34, 18, BlockId.TILE_BLUE);
    // EW street, west — south then north curb
    this.carX(12, 28, BlockId.TILE_WHITE);
    this.carX(18, 34, BlockId.TILE_NAVY);
    // Shop interior bay
    this.carZ(16, 12, BlockId.TILE_PINK);
  }

  carZ(x, z, body) {
    const glass = BlockId.GLASS;
    const wheel = BlockId.CONCRETE;
    this.fillRot(x, x + 1, F + 1, F + 1, z, z + 4, body);
    this.fillRot(x, x + 1, F + 2, F + 2, z + 1, z + 3, body);
    this.fillRot(x, x + 1, F + 2, F + 2, z + 1, z + 1, glass);
    this.fillRot(x, x + 1, F + 2, F + 2, z + 3, z + 3, glass);
    this.fillRot(x, x, F + 1, F + 1, z, z, wheel);
    this.fillRot(x + 1, x + 1, F + 1, F + 1, z, z, wheel);
    this.fillRot(x, x, F + 1, F + 1, z + 4, z + 4, wheel);
    this.fillRot(x + 1, x + 1, F + 1, F + 1, z + 4, z + 4, wheel);
  }

  carX(x, z, body) {
    const glass = BlockId.GLASS;
    const wheel = BlockId.CONCRETE;
    this.fillRot(x, x + 4, F + 1, F + 1, z, z + 1, body);
    this.fillRot(x + 1, x + 3, F + 2, F + 2, z, z + 1, body);
    this.fillRot(x + 1, x + 1, F + 2, F + 2, z, z + 1, glass);
    this.fillRot(x + 3, x + 3, F + 2, F + 2, z, z + 1, glass);
    this.fillRot(x, x, F + 1, F + 1, z, z, wheel);
    this.fillRot(x, x, F + 1, F + 1, z + 1, z + 1, wheel);
    this.fillRot(x + 4, x + 4, F + 1, F + 1, z, z, wheel);
    this.fillRot(x + 4, x + 4, F + 1, F + 1, z + 1, z + 1, wheel);
  }

  /** Walk-under canopies so foliage breaks sky angles without eating lanes. */
  tree(x, z, wood, leaves) {
    this.fillRot(x, x, F + 1, F + 5, z, z, wood);
    this.fillRot(x - 1, x + 1, F + 5, F + 6, z - 1, z + 1, leaves);
    this.fillRot(x, x, F + 7, F + 7, z, z, leaves);
    this.fillRot(x, x, F + 5, F + 5, z, z, wood);
  }

  buildTrees(wood, leaves) {
    // South-west plaza (rotates to north-east)
    this.tree(5, 4, wood, leaves);
    this.tree(15, 3, wood, leaves);
    this.tree(22, 4, wood, leaves);
    // South-east plaza (rotates to north-west)
    this.tree(43, 4, wood, leaves);
    this.tree(48, 3, wood, leaves);
    this.tree(58, 4, wood, leaves);
    // Alleys
    this.tree(4, 12, wood, leaves);
    this.tree(4, 48, wood, leaves);
    // Sidewalks (off building walls)
    this.tree(27, 13, wood, leaves);
    this.tree(13, 27, wood, leaves);
    // Intersection corners
    this.tree(27, 27, wood, leaves);
    this.tree(27, 36, wood, leaves);
  }

  buildSpawns() {
    for (const x of [4, 8, 12, 18, 22]) {
      for (const z of [3, 6]) {
        this.spawns.push({ x: x + 0.5, y: F + 1, z: z + 0.5 });
        this.spawns.push({ x: MAX - x + 0.5, y: F + 1, z: MAX - z + 0.5 });
      }
    }
    for (const x of [41, 45, 51, 55, 59]) {
      for (const z of [3, 6]) {
        this.spawns.push({ x: x + 0.5, y: F + 1, z: z + 0.5 });
        this.spawns.push({ x: MAX - x + 0.5, y: F + 1, z: MAX - z + 0.5 });
      }
    }
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
