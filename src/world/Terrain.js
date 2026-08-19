import { createNoise2D } from 'simplex-noise';
import { BlockId, CHUNK_HEIGHT, CHUNK_SIZE, SEA_LEVEL } from '../blocks/BlockTypes.js';

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TerrainGenerator {
  constructor(seed = 1337) {
    this.noise2D = createNoise2D(() => seed);
    this.random = mulberry32(seed);
    this.spawns = [];
  }

  getHeight(wx, wz) {
    const scale = 0.02;
    const n1 = this.noise2D(wx * scale, wz * scale);
    const n2 = this.noise2D(wx * scale * 2.5, wz * scale * 2.5) * 0.35;
    const n3 = this.noise2D(wx * scale * 0.5, wz * scale * 0.5) * 0.5;
    const height = Math.floor(SEA_LEVEL + 8 + (n1 + n2 + n3) * 12);
    return Math.max(4, Math.min(CHUNK_HEIGHT - 4, height));
  }

  generateChunk(chunk) {
    const { cx, cz } = chunk;
    const treeCandidates = [];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        const surface = this.getHeight(wx, wz);

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let block = BlockId.AIR;

          if (y === 0) {
            block = BlockId.STONE;
          } else if (y < surface - 4) {
            block = BlockId.STONE;
          } else if (y < surface) {
            block = BlockId.DIRT;
          } else if (y === surface) {
            if (surface <= SEA_LEVEL + 1) {
              block = BlockId.SAND;
            } else {
              block = BlockId.GRASS;
              if (this.random() < 0.02) {
                treeCandidates.push({ x, y: y + 1, z });
              }
            }
          }

          chunk.setBlock(x, y, z, block);
        }
      }
    }

    for (const tree of treeCandidates) {
      this.placeTree(chunk, tree.x, tree.y, tree.z);
    }

    chunk.dirty = true;
  }

  placeTree(chunk, x, baseY, z) {
    const trunkHeight = 4 + Math.floor(this.random() * 2);

    for (let y = 0; y < trunkHeight; y++) {
      if (baseY + y < CHUNK_HEIGHT) {
        chunk.setBlock(x, baseY + y, z, BlockId.WOOD);
      }
    }

    const leafY = baseY + trunkHeight - 2;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 2; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy < 2) continue;
          const lx = x + dx;
          const ly = leafY + dy;
          const lz = z + dz;
          if (chunk.getBlock(lx, ly, lz) === BlockId.AIR) {
            chunk.setBlock(lx, ly, lz, BlockId.LEAVES);
          }
        }
      }
    }
  }
}
