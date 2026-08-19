import * as THREE from 'three';
import { CHUNK_HEIGHT, CHUNK_SIZE, isOpaque } from '../blocks/BlockTypes.js';
import { getFaceUV } from '../blocks/Textures.js';

const FACES = [
  { dir: [1, 0, 0], face: 'side' },
  { dir: [-1, 0, 0], face: 'side' },
  { dir: [0, 1, 0], face: 'top' },
  { dir: [0, -1, 0], face: 'bottom' },
  { dir: [0, 0, 1], face: 'side' },
  { dir: [0, 0, -1], face: 'side' },
];

// UV corners for a quad: BL, TL, TR, BR matching pushFace winding (0,1,2,0,2,3)
function faceUVs(uv) {
  return [
    [uv.u0, uv.v0], // 0 bottom-left
    [uv.u0, uv.v1], // 1 top-left
    [uv.u1, uv.v1], // 2 top-right
    [uv.u1, uv.v0], // 3 bottom-right
  ];
}

function pushFace(positions, normals, uvs, x, y, z, faceDir, blockId, face) {
  const [dx, dy, dz] = faceDir;
  const vertices = [];

  if (dx === 1) {
    vertices.push([x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]);
  } else if (dx === -1) {
    vertices.push([x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z], [x, y, z]);
  } else if (dy === 1) {
    vertices.push([x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]);
  } else if (dy === -1) {
    vertices.push([x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]);
  } else if (dz === 1) {
    vertices.push([x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1], [x, y, z + 1]);
  } else {
    vertices.push([x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z]);
  }

  const uvCorners = faceUVs(getFaceUV(blockId, face));
  const indices = [0, 1, 2, 0, 2, 3];
  for (const i of indices) {
    const [vx, vy, vz] = vertices[i];
    positions.push(vx, vy, vz);
    normals.push(dx, dy, dz);
    uvs.push(uvCorners[i][0], uvCorners[i][1]);
  }
}

export function buildChunkGeometry(chunk, world) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const { cx, cz } = chunk;

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const blockId = chunk.getBlock(x, y, z);
        if (blockId === 0) continue;

        const wx = cx * CHUNK_SIZE + x;
        const wy = y;
        const wz = cz * CHUNK_SIZE + z;

        for (const { dir, face } of FACES) {
          const nx = wx + dir[0];
          const ny = wy + dir[1];
          const nz = wz + dir[2];
          const neighbor = world.getBlock(nx, ny, nz);
          if (isOpaque(neighbor)) continue;
          if (blockId === neighbor) continue;
          if (!isOpaque(blockId) && neighbor !== 0) continue;
          pushFace(positions, normals, uvs, x, y, z, dir, blockId, face);
        }
      }
    }
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}
