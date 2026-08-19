import * as THREE from 'three';
import { BlockId } from './BlockTypes.js';

const TILE = 16;
const COLS = 8;
const ROWS = 4;

/** Atlas tile indices: [col, row] */
export const TILE_INDEX = {
  grass_top: [0, 0],
  grass_side: [1, 0],
  dirt: [2, 0],
  stone: [3, 0],
  wood_side: [0, 1],
  wood_top: [1, 1],
  leaves: [2, 1],
  sand: [3, 1],
  cobble: [0, 2],
  tile_white: [1, 2],
  tile_red: [2, 2],
  tile_blue: [3, 2],
  tile_pink: [4, 2],
  tile_cyan: [5, 2],
  water: [6, 2],
  locker: [7, 2],
  glass: [4, 0],
  tile_navy: [5, 0],
  concrete: [6, 0],
  asphalt: [7, 0],
  brick: [4, 1],
  metal: [5, 1],
  paint: [6, 1],
};

export const BLOCK_TILES = {
  [BlockId.GRASS]: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
  [BlockId.DIRT]: { top: 'dirt', side: 'dirt', bottom: 'dirt' },
  [BlockId.STONE]: { top: 'stone', side: 'stone', bottom: 'stone' },
  [BlockId.WOOD]: { top: 'wood_top', side: 'wood_side', bottom: 'wood_top' },
  [BlockId.LEAVES]: { top: 'leaves', side: 'leaves', bottom: 'leaves' },
  [BlockId.SAND]: { top: 'sand', side: 'sand', bottom: 'sand' },
  [BlockId.COBBLE]: { top: 'cobble', side: 'cobble', bottom: 'cobble' },
  [BlockId.TILE_WHITE]: { top: 'tile_white', side: 'tile_white', bottom: 'tile_white' },
  [BlockId.TILE_RED]: { top: 'tile_red', side: 'tile_red', bottom: 'tile_red' },
  [BlockId.TILE_BLUE]: { top: 'tile_blue', side: 'tile_blue', bottom: 'tile_blue' },
  [BlockId.TILE_PINK]: { top: 'tile_pink', side: 'tile_pink', bottom: 'tile_pink' },
  [BlockId.TILE_CYAN]: { top: 'tile_cyan', side: 'tile_cyan', bottom: 'tile_cyan' },
  [BlockId.WATER]: { top: 'water', side: 'water', bottom: 'water' },
  [BlockId.LOCKER]: { top: 'locker', side: 'locker', bottom: 'locker' },
  [BlockId.GLASS]: { top: 'glass', side: 'glass', bottom: 'glass' },
  [BlockId.TILE_NAVY]: { top: 'tile_navy', side: 'tile_navy', bottom: 'tile_navy' },
  [BlockId.CONCRETE]: { top: 'concrete', side: 'concrete', bottom: 'concrete' },
  [BlockId.ASPHALT]: { top: 'asphalt', side: 'asphalt', bottom: 'asphalt' },
  [BlockId.BRICK]: { top: 'brick', side: 'brick', bottom: 'brick' },
  [BlockId.METAL]: { top: 'metal', side: 'metal', bottom: 'metal' },
  [BlockId.PAINT]: { top: 'paint', side: 'paint', bottom: 'paint' },
};

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function setPixel(ctx, x, y, r, g, b, a = 255) {
  ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a / 255})`;
  ctx.fillRect(x, y, 1, 1);
}

function noiseColor(rng, base, variance) {
  return base.map((c) => Math.max(0, Math.min(255, c + (rng() - 0.5) * variance)));
}

function drawGrassTop(ctx, ox, oy) {
  const rng = rand(101);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [74, 140, 48], 36);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let i = 0; i < 28; i++) {
    const x = (rng() * TILE) | 0;
    const y = (rng() * TILE) | 0;
    setPixel(ctx, ox + x, oy + y, 48 + rng() * 30, 100 + rng() * 40, 30);
  }
}

function drawGrassSide(ctx, ox, oy) {
  const rng = rand(202);
  const grassH = 4;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (y < grassH) {
        const [r, g, b] = noiseColor(rng, [70, 130, 42], 28);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      } else {
        const [r, g, b] = noiseColor(rng, [110, 72, 38], 22);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      }
    }
  }
  for (let x = 0; x < TILE; x++) {
    const dip = (rng() * 2) | 0;
    for (let y = grassH; y < grassH + 1 + dip; y++) {
      setPixel(ctx, ox + x, oy + y, 65 + rng() * 20, 115 + rng() * 25, 35);
    }
  }
}

function drawDirt(ctx, ox, oy) {
  const rng = rand(303);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [110, 72, 38], 28);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let i = 0; i < 18; i++) {
    setPixel(
      ctx,
      ox + ((rng() * TILE) | 0),
      oy + ((rng() * TILE) | 0),
      70 + rng() * 20,
      48 + rng() * 15,
      25
    );
  }
}

function drawStone(ctx, ox, oy) {
  const rng = rand(404);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [120, 120, 120], 30);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let i = 0; i < 22; i++) {
    const dark = rng() > 0.5;
    setPixel(
      ctx,
      ox + ((rng() * TILE) | 0),
      oy + ((rng() * TILE) | 0),
      dark ? 70 : 160,
      dark ? 70 : 160,
      dark ? 70 : 160
    );
  }
}

function drawWoodSide(ctx, ox, oy) {
  const rng = rand(505);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const stripe = Math.sin(x * 1.2) * 12;
      const [r, g, b] = noiseColor(rng, [118 + stripe, 78 + stripe * 0.5, 38], 16);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let x = 2; x < TILE; x += 4) {
    for (let y = 0; y < TILE; y++) {
      if (rng() > 0.35) setPixel(ctx, ox + x, oy + y, 70, 45, 22);
    }
  }
}

function drawWoodTop(ctx, ox, oy) {
  const rng = rand(606);
  const cx = TILE / 2 - 0.5;
  const cy = TILE / 2 - 0.5;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const ring = Math.sin(d * 1.8) * 18;
      const [r, g, b] = noiseColor(rng, [150 + ring, 110 + ring * 0.6, 55], 12);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  setPixel(ctx, ox + 7, oy + 7, 90, 60, 30);
  setPixel(ctx, ox + 8, oy + 8, 90, 60, 30);
}

function drawLeaves(ctx, ox, oy) {
  const rng = rand(707);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (rng() < 0.12) {
        setPixel(ctx, ox + x, oy + y, 20, 50, 15);
      } else {
        const [r, g, b] = noiseColor(rng, [40, 110, 28], 40);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      }
    }
  }
}

function drawSand(ctx, ox, oy) {
  const rng = rand(808);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [220, 200, 130], 24);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let i = 0; i < 16; i++) {
    setPixel(
      ctx,
      ox + ((rng() * TILE) | 0),
      oy + ((rng() * TILE) | 0),
      190 + rng() * 20,
      170 + rng() * 20,
      100
    );
  }
}

function drawCobble(ctx, ox, oy) {
  const rng = rand(909);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [105, 105, 105], 26);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  const stones = [
    [1, 1, 6, 5],
    [8, 2, 6, 5],
    [2, 8, 5, 6],
    [9, 9, 5, 5],
    [5, 5, 4, 4],
  ];
  for (const [sx, sy, w, h] of stones) {
    const shade = 80 + rng() * 50;
    for (let y = sy; y < sy + h && y < TILE; y++) {
      for (let x = sx; x < sx + w && x < TILE; x++) {
        setPixel(ctx, ox + x, oy + y, shade, shade, shade + 5);
      }
    }
    for (let x = sx; x < sx + w && x < TILE; x++) {
      setPixel(ctx, ox + x, oy + sy, 55, 55, 55);
      if (sy + h - 1 < TILE) setPixel(ctx, ox + x, oy + sy + h - 1, 150, 150, 150);
    }
  }
}

function drawGroutTile(ctx, ox, oy, rgb, grout, cell, seed) {
  const rng = rand(seed);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const onGrout = x % cell === 0 || y % cell === 0;
      if (onGrout) {
        const [r, g, b] = noiseColor(rng, grout, 10);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      } else {
        const [r, g, b] = noiseColor(rng, rgb, 14);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      }
    }
  }
}

function drawTileWhite(ctx, ox, oy) {
  drawGroutTile(ctx, ox, oy, [232, 232, 228], [150, 150, 148], 4, 1001);
}

function drawTileRed(ctx, ox, oy) {
  drawGroutTile(ctx, ox, oy, [166, 94, 107], [236, 214, 216], 4, 1002);
}

function drawTileBlue(ctx, ox, oy) {
  drawGroutTile(ctx, ox, oy, [44, 74, 140], [170, 186, 214], 4, 1003);
}

function drawTilePink(ctx, ox, oy) {
  const rng = rand(1004);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [232, 197, 200], 12);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
}

function drawTileCyan(ctx, ox, oy) {
  drawGroutTile(ctx, ox, oy, [62, 200, 232], [180, 236, 248], 4, 1005);
}

function drawWater(ctx, ox, oy) {
  const rng = rand(1006);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const wave = Math.sin((x + y) * 0.7) * 12;
      const [r, g, b] = noiseColor(rng, [0, 200 + wave, 255], 18);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
}

function drawLocker(ctx, ox, oy) {
  const rng = rand(1007);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [160, 168, 176], 12);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  // door frame + vents
  for (let y = 0; y < TILE; y++) {
    setPixel(ctx, ox + 1, oy + y, 90, 96, 104);
    setPixel(ctx, ox + TILE - 2, oy + y, 90, 96, 104);
  }
  for (let x = 3; x < TILE - 3; x++) {
    setPixel(ctx, ox + x, oy + 2, 70, 76, 84);
    setPixel(ctx, ox + x, oy + 3, 70, 76, 84);
    setPixel(ctx, ox + x, oy + TILE - 4, 70, 76, 84);
    setPixel(ctx, ox + x, oy + TILE - 3, 70, 76, 84);
  }
  setPixel(ctx, ox + TILE - 4, oy + 8, 50, 54, 60);
}

function drawGlass(ctx, ox, oy) {
  const rng = rand(1008);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const frame = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1;
      if (frame) {
        setPixel(ctx, ox + x, oy + y, 55, 62, 70);
      } else {
        const [r, g, b] = noiseColor(rng, [196, 228, 244], 10);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      }
    }
  }
}

function drawTileNavy(ctx, ox, oy) {
  drawGroutTile(ctx, ox, oy, [26, 42, 88], [90, 110, 150], 4, 1009);
}

function drawConcrete(ctx, ox, oy) {
  const rng = rand(1010);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [52, 52, 56], 16);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
}

function drawAsphalt(ctx, ox, oy) {
  const rng = rand(1011);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [42, 42, 44], 14);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  for (let i = 0; i < 20; i++) {
    const bright = rng() > 0.55;
    setPixel(
      ctx,
      ox + ((rng() * TILE) | 0),
      oy + ((rng() * TILE) | 0),
      bright ? 70 : 28,
      bright ? 70 : 28,
      bright ? 72 : 30
    );
  }
}

function drawBrick(ctx, ox, oy) {
  const rng = rand(1012);
  const mortar = [90, 82, 74];
  const brickH = 4;
  for (let y = 0; y < TILE; y++) {
    const row = (y / brickH) | 0;
    const odd = row % 2 === 1;
    for (let x = 0; x < TILE; x++) {
      const onMortar = y % brickH === 0 || (x + (odd ? 4 : 0)) % 8 === 0;
      if (onMortar) {
        const [r, g, b] = noiseColor(rng, mortar, 8);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      } else {
        const [r, g, b] = noiseColor(rng, [148, 72, 54], 18);
        setPixel(ctx, ox + x, oy + y, r, g, b);
      }
    }
  }
}

function drawMetal(ctx, ox, oy) {
  const rng = rand(1013);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const panel = x < 2 || x > TILE - 3 || y < 2 || y > TILE - 3 ? 12 : 0;
      const [r, g, b] = noiseColor(rng, [130 + panel, 136 + panel, 144 + panel], 10);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
  const rivets = [
    [2, 2],
    [TILE - 3, 2],
    [2, TILE - 3],
    [TILE - 3, TILE - 3],
  ];
  for (const [x, y] of rivets) {
    setPixel(ctx, ox + x, oy + y, 70, 74, 80);
    setPixel(ctx, ox + x + 1, oy + y, 190, 196, 204);
  }
}

function drawPaint(ctx, ox, oy) {
  const rng = rand(1014);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const [r, g, b] = noiseColor(rng, [224, 192, 48], 16);
      setPixel(ctx, ox + x, oy + y, r, g, b);
    }
  }
}

const DRAWERS = {
  grass_top: drawGrassTop,
  grass_side: drawGrassSide,
  dirt: drawDirt,
  stone: drawStone,
  wood_side: drawWoodSide,
  wood_top: drawWoodTop,
  leaves: drawLeaves,
  sand: drawSand,
  cobble: drawCobble,
  tile_white: drawTileWhite,
  tile_red: drawTileRed,
  tile_blue: drawTileBlue,
  tile_pink: drawTilePink,
  tile_cyan: drawTileCyan,
  water: drawWater,
  locker: drawLocker,
  glass: drawGlass,
  tile_navy: drawTileNavy,
  concrete: drawConcrete,
  asphalt: drawAsphalt,
  brick: drawBrick,
  metal: drawMetal,
  paint: drawPaint,
};

let atlasTexture = null;
const uvCache = new Map();

function renderTile(name) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const draw = DRAWERS[name] || DRAWERS.stone;
  draw(ctx, 0, 0);
  return canvas;
}

export function getTextureAtlas() {
  if (atlasTexture) return atlasTexture;

  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [name, [col, row]] of Object.entries(TILE_INDEX)) {
    DRAWERS[name](ctx, col * TILE, row * TILE);
  }

  atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.needsUpdate = true;
  return atlasTexture;
}

/** Minecraft-style isometric block item for the hotbar. */
export function drawBlockIcon(dest, blockId, size) {
  const tiles = BLOCK_TILES[blockId] || {};
  const top = tilePixels(renderTile(tiles.top || tiles.side || 'stone'));
  const side = tilePixels(renderTile(tiles.side || tiles.top || 'stone'));

  dest.imageSmoothingEnabled = false;
  dest.clearRect(0, 0, size, size);

  const s = size / 36;
  const ox = size / 2;
  const oy = size * 0.7;

  const project = (x, y, z) => ({
    sx: ox + (x - z) * s,
    sy: oy + (x + z) * (s * 0.5) - y * s,
  });

  const quad = (p0, p1, p2, p3, color) => {
    dest.fillStyle = color;
    dest.beginPath();
    dest.moveTo(p0.sx, p0.sy);
    dest.lineTo(p1.sx, p1.sy);
    dest.lineTo(p2.sx, p2.sy);
    dest.lineTo(p3.sx, p3.sy);
    dest.closePath();
    dest.fill();
  };

  const rgba = (data, x, y, shade) => {
    const i = (y * TILE + x) * 4;
    const a = data[i + 3] / 255;
    if (a < 0.05) return null;
    const r = Math.round(data[i] * shade);
    const g = Math.round(data[i + 1] * shade);
    const b = Math.round(data[i + 2] * shade);
    return `rgba(${r},${g},${b},${a})`;
  };

  for (let z = 0; z < TILE; z++) {
    for (let x = 0; x < TILE; x++) {
      const color = rgba(top, x, z, 1);
      if (!color) continue;
      quad(
        project(x, TILE, z),
        project(x + 1, TILE, z),
        project(x + 1, TILE, z + 1),
        project(x, TILE, z + 1),
        color
      );
    }
  }

  for (let z = 0; z < TILE; z++) {
    for (let y = 0; y < TILE; y++) {
      const color = rgba(side, z, TILE - 1 - y, 0.82);
      if (!color) continue;
      quad(
        project(0, y, z),
        project(0, y, z + 1),
        project(0, y + 1, z + 1),
        project(0, y + 1, z),
        color
      );
    }
  }

  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const color = rgba(side, x, TILE - 1 - y, 0.62);
      if (!color) continue;
      quad(
        project(x, y, TILE),
        project(x + 1, y, TILE),
        project(x + 1, y + 1, TILE),
        project(x, y + 1, TILE),
        color
      );
    }
  }
}

function tilePixels(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, TILE, TILE).data;
}

export function getFaceUV(blockId, face) {
  const key = `${blockId}:${face}`;
  if (uvCache.has(key)) return uvCache.get(key);

  const tiles = BLOCK_TILES[blockId];
  const tileName = tiles?.[face] ?? tiles?.side ?? 'stone';
  const [col, row] = TILE_INDEX[tileName] || TILE_INDEX.stone;

  // Three.js UV: v=0 at bottom of texture
  const u0 = col / COLS;
  const u1 = (col + 1) / COLS;
  const v1 = 1 - row / ROWS;
  const v0 = 1 - (row + 1) / ROWS;

  // Inset slightly to avoid atlas bleeding
  const padU = 0.5 / (COLS * TILE);
  const padV = 0.5 / (ROWS * TILE);
  const uv = {
    u0: u0 + padU,
    u1: u1 - padU,
    v0: v0 + padV,
    v1: v1 - padV,
  };
  uvCache.set(key, uv);
  return uv;
}

export function createTerrainMaterial() {
  return new THREE.MeshLambertMaterial({
    map: getTextureAtlas(),
  });
}
