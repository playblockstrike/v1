export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
/** Fixed map size in chunks along X and Z (finite world). */
export const WORLD_SIZE_CHUNKS = 4;
/** Total horizontal size in blocks. */
export const WORLD_SIZE = WORLD_SIZE_CHUNKS * CHUNK_SIZE;
export const RENDER_DISTANCE = 5;
export const SEA_LEVEL = 8;
export const FLOOR_Y = 8;

export const BlockId = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  COBBLE: 7,
  TILE_WHITE: 8,
  TILE_RED: 9,
  TILE_BLUE: 10,
  TILE_PINK: 11,
  TILE_CYAN: 12,
  WATER: 13,
  LOCKER: 14,
  GLASS: 15,
  TILE_NAVY: 16,
  CONCRETE: 17,
  ASPHALT: 18,
  BRICK: 19,
  METAL: 20,
  PAINT: 21,
};

export const BLOCKS = [
  { id: BlockId.AIR, name: 'Air', solid: false, opaque: false, colors: null },
  {
    id: BlockId.GRASS,
    name: 'Grass',
    solid: true,
    opaque: true,
    colors: { top: 0x5a8c35, side: 0x6b4423, bottom: 0x6b4423 },
  },
  {
    id: BlockId.DIRT,
    name: 'Dirt',
    solid: true,
    opaque: true,
    colors: { top: 0x6b4423, side: 0x6b4423, bottom: 0x6b4423 },
  },
  {
    id: BlockId.STONE,
    name: 'Stone',
    solid: true,
    opaque: true,
    colors: { top: 0x7a7a7a, side: 0x7a7a7a, bottom: 0x7a7a7a },
  },
  {
    id: BlockId.WOOD,
    name: 'Wood',
    solid: true,
    opaque: true,
    colors: { top: 0x9a6b3a, side: 0x8b5a2b, bottom: 0x9a6b3a },
  },
  {
    id: BlockId.LEAVES,
    name: 'Leaves',
    solid: true,
    opaque: true,
    colors: { top: 0x2d6b1f, side: 0x2d6b1f, bottom: 0x2d6b1f },
  },
  {
    id: BlockId.SAND,
    name: 'Sand',
    solid: true,
    opaque: true,
    colors: { top: 0xd9c27a, side: 0xd9c27a, bottom: 0xd9c27a },
  },
  {
    id: BlockId.COBBLE,
    name: 'Cobble',
    solid: true,
    opaque: true,
    colors: { top: 0x6e6e6e, side: 0x6e6e6e, bottom: 0x6e6e6e },
  },
  {
    id: BlockId.TILE_WHITE,
    name: 'White tile',
    solid: true,
    opaque: true,
    colors: { top: 0xe8e8e4, side: 0xe0e0dc, bottom: 0xd0d0cc },
  },
  {
    id: BlockId.TILE_RED,
    name: 'Red tile',
    solid: true,
    opaque: true,
    colors: { top: 0xa65e6b, side: 0x9a5560, bottom: 0x8a4a54 },
  },
  {
    id: BlockId.TILE_BLUE,
    name: 'Blue tile',
    solid: true,
    opaque: true,
    colors: { top: 0x2c4a8c, side: 0x243e78, bottom: 0x1c3264 },
  },
  {
    id: BlockId.TILE_PINK,
    name: 'Pink plaster',
    solid: true,
    opaque: true,
    colors: { top: 0xe8c5c8, side: 0xe0b8bc, bottom: 0xd4a8ac },
  },
  {
    id: BlockId.TILE_CYAN,
    name: 'Pool tile',
    solid: true,
    opaque: true,
    colors: { top: 0x3ec8e8, side: 0x2ab8dc, bottom: 0x1aa0c4 },
  },
  {
    id: BlockId.WATER,
    name: 'Water',
    solid: false,
    opaque: false,
    colors: { top: 0x00ccff, side: 0x00b8ee, bottom: 0x0099cc },
  },
  {
    id: BlockId.LOCKER,
    name: 'Locker',
    solid: true,
    opaque: true,
    colors: { top: 0x8a929a, side: 0xa0a8b0, bottom: 0x6e767e },
  },
  {
    id: BlockId.GLASS,
    name: 'Glass',
    solid: true,
    opaque: true,
    colors: { top: 0xc8e4f4, side: 0xb4d8ee, bottom: 0xa0cce4 },
  },
  {
    id: BlockId.TILE_NAVY,
    name: 'Navy tile',
    solid: true,
    opaque: true,
    colors: { top: 0x1a2a58, side: 0x16244c, bottom: 0x121e40 },
  },
  {
    id: BlockId.CONCRETE,
    name: 'Concrete',
    solid: true,
    opaque: true,
    colors: { top: 0x3a3a3e, side: 0x323236, bottom: 0x2a2a2e },
  },
  {
    id: BlockId.ASPHALT,
    name: 'Asphalt',
    solid: true,
    opaque: true,
    colors: { top: 0x2a2a2c, side: 0x242426, bottom: 0x1e1e20 },
  },
  {
    id: BlockId.BRICK,
    name: 'Brick',
    solid: true,
    opaque: true,
    colors: { top: 0x8a4a3a, side: 0x7a4034, bottom: 0x6a382c },
  },
  {
    id: BlockId.METAL,
    name: 'Metal',
    solid: true,
    opaque: true,
    colors: { top: 0x8a9098, side: 0x7a8088, bottom: 0x6a7078 },
  },
  {
    id: BlockId.PAINT,
    name: 'Paint',
    solid: true,
    opaque: true,
    colors: { top: 0xe0c040, side: 0xd0b030, bottom: 0xc0a028 },
  },
];

export const HOTBAR_BLOCKS = [
  BlockId.TILE_WHITE,
  BlockId.TILE_RED,
  BlockId.TILE_BLUE,
  BlockId.TILE_CYAN,
  BlockId.LOCKER,
  BlockId.STONE,
  BlockId.WOOD,
  BlockId.BRICK,
  BlockId.GLASS,
];

export function isSolid(blockId) {
  return BLOCKS[blockId]?.solid ?? false;
}

export function isOpaque(blockId) {
  return BLOCKS[blockId]?.opaque ?? false;
}

export function isWater(blockId) {
  return blockId === BlockId.WATER;
}

export function getBlockColor(blockId, face) {
  const block = BLOCKS[blockId];
  if (!block?.colors) return 0xffffff;
  return block.colors[face] ?? block.colors.side;
}

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

export function inWorldChunk(cx, cz) {
  return cx >= 0 && cz >= 0 && cx < WORLD_SIZE_CHUNKS && cz < WORLD_SIZE_CHUNKS;
}

export function inWorldBlock(x, y, z) {
  return (
    x >= 0 &&
    z >= 0 &&
    x < WORLD_SIZE &&
    z < WORLD_SIZE &&
    y >= 0 &&
    y < CHUNK_HEIGHT
  );
}

export function worldCenter() {
  const mid = WORLD_SIZE * 0.5;
  return { x: mid, z: mid };
}
