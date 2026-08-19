import * as THREE from 'three';
import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  WORLD_SIZE,
  WORLD_SIZE_CHUNKS,
  chunkKey,
  inWorldBlock,
  inWorldChunk,
  isSolid,
  worldCenter,
} from '../blocks/BlockTypes.js';
import { Chunk } from './Chunk.js';
import { buildChunkGeometry } from './Mesher.js';
import { createTerrainMaterial } from '../blocks/Textures.js';
import { DEFAULT_MAP_ID, getMapDef } from './maps.js';

export class World {
  constructor(scene, seed = 1337, mapId = DEFAULT_MAP_ID) {
    this.scene = scene;
    this.seed = seed;
    this.chunks = new Map();
    this.material = createTerrainMaterial();
    this.loaded = false;
    this.mapId = DEFAULT_MAP_ID;
    this.terrain = null;
    this.setMap(mapId, seed, { rebuild: false });
  }

  setMap(mapId, seed = this.seed, { rebuild = true } = {}) {
    const def = getMapDef(mapId);
    this.mapId = def.id;
    this.seed = seed;
    if (rebuild) this.clear();
    this.terrain = def.create(seed);
    if (rebuild) this.loadAll();
  }

  getBlock(wx, wy, wz) {
    if (!inWorldBlock(wx, wy, wz)) return 0;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return 0;

    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx, wy, wz, id) {
    if (!inWorldBlock(wx, wy, wz)) return false;

    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cz);
    if (!chunk) return false;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    if (!chunk.setBlock(lx, wy, lz, id)) return false;

    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);

    return true;
  }

  markDirty(cx, cz) {
    if (!inWorldChunk(cx, cz)) return;
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  getOrCreateChunk(cx, cz) {
    if (!inWorldChunk(cx, cz)) return null;

    const key = chunkKey(cx, cz);
    if (this.chunks.has(key)) return this.chunks.get(key);

    const chunk = new Chunk(cx, cz);
    this.terrain.generateChunk(chunk);
    this.chunks.set(key, chunk);

    this.markDirty(cx - 1, cz);
    this.markDirty(cx + 1, cz);
    this.markDirty(cx, cz - 1);
    this.markDirty(cx, cz + 1);

    return chunk;
  }

  /** Generate the full finite map once. */
  loadAll() {
    for (let cx = 0; cx < WORLD_SIZE_CHUNKS; cx++) {
      for (let cz = 0; cz < WORLD_SIZE_CHUNKS; cz++) {
        this.getOrCreateChunk(cx, cz);
      }
    }
    this.loaded = true;
    this.rebuildDirty();
  }

  updateAround(_px, _pz) {
    if (!this.loaded) this.loadAll();
    this.rebuildDirty();
  }

  rebuildDirty() {
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) this.rebuildChunkMesh(chunk);
    }
  }

  rebuildChunkMesh(chunk) {
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }

    const geometry = buildChunkGeometry(chunk, this);
    if (!geometry) {
      chunk.dirty = false;
      return;
    }

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    this.scene.add(mesh);
    chunk.mesh = mesh;
    chunk.dirty = false;
  }

  /**
   * Standable Y: solid block with headroom.
   * Prefers an indoor floor (solid ceiling not far above) so pool-map
   * spawns land on the deck instead of the roof.
   */
  getSurfaceY(wx, wz) {
    const x = Math.floor(wx);
    const z = Math.floor(wz);
    if (!inWorldBlock(x, 0, z)) return 0;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    this.getOrCreateChunk(cx, cz);

    const candidates = [];
    for (let y = 1; y < CHUNK_HEIGHT - 2; y++) {
      if (!isSolid(this.getBlock(x, y, z))) continue;
      if (isSolid(this.getBlock(x, y + 1, z))) continue;
      if (isSolid(this.getBlock(x, y + 2, z))) continue;
      candidates.push(y);
    }
    if (!candidates.length) return 0;

    const indoor = candidates.filter((y) => {
      for (let h = y + 3; h <= y + 12 && h < CHUNK_HEIGHT; h++) {
        if (isSolid(this.getBlock(x, h, z))) return true;
      }
      return false;
    });
    return indoor.length ? indoor[0] : candidates[candidates.length - 1];
  }

  standPosition(x, z) {
    const y = this.getSurfaceY(x, z);
    return { x, y: y + 1, z };
  }

  getSpawnPosition() {
    if (!this.loaded) this.loadAll();
    const pads = this.terrain.spawns;
    if (pads?.length) {
      const pad = pads[0];
      if (typeof pad.y === 'number') {
        return { x: pad.x, y: pad.y, z: pad.z };
      }
      return this.standPosition(pad.x, pad.z);
    }
    const { x, z } = worldCenter();
    return this.standPosition(x, z);
  }

  /** Pick a random safe surface spot — prefers team spawn pads. */
  getRandomSpawnPosition(attempts = 32) {
    if (!this.loaded) this.loadAll();
    const pads = this.terrain.spawns;
    if (pads?.length) {
      const pad = pads[(Math.random() * pads.length) | 0];
      if (typeof pad.y === 'number') {
        return { x: pad.x, y: pad.y, z: pad.z };
      }
      return this.standPosition(pad.x, pad.z);
    }
    const margin = 3;
    for (let i = 0; i < attempts; i++) {
      const x = margin + Math.random() * (WORLD_SIZE - margin * 2);
      const z = margin + Math.random() * (WORLD_SIZE - margin * 2);
      const pos = this.standPosition(x, z);
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);
      if (isSolid(this.getBlock(bx, by, bz))) continue;
      if (isSolid(this.getBlock(bx, by + 1, bz))) continue;
      return { x: bx + 0.5, y: pos.y, z: bz + 0.5 };
    }
    return this.getSpawnPosition();
  }

  /** Keep the player inside the finite map. */
  clampPosition(position, halfWidth = 0.3) {
    const min = halfWidth;
    const max = WORLD_SIZE - halfWidth;
    position.x = Math.min(max, Math.max(min, position.x));
    position.z = Math.min(max, Math.max(min, position.z));
  }

  /** Drop loaded chunks so the next session starts from fresh terrain. */
  clear() {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        chunk.mesh = null;
      }
    }
    this.chunks.clear();
    this.loaded = false;
  }
}
