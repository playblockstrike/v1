import { TerrainGenerator } from './Terrain.js';
import { PoolMapGenerator } from './PoolMap.js';
import { UrbanMapGenerator } from './UrbanMap.js';

export const DEFAULT_MAP_ID = 'fy_pool_day';

export const MAPS = {
  fy_pool_day: {
    id: 'fy_pool_day',
    name: 'Pool',
    create: () => new PoolMapGenerator(),
  },
  streets: {
    id: 'streets',
    name: 'Streets',
    create: () => new UrbanMapGenerator(),
  },
  hills: {
    id: 'hills',
    name: 'Hills',
    create: (seed) => new TerrainGenerator(seed),
  },
};

export function getMapDef(mapId) {
  return MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
}

export function mapName(mapId) {
  return getMapDef(mapId).name;
}

export function mapList() {
  return Object.values(MAPS);
}
