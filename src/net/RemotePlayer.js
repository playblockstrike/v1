import * as THREE from 'three';
import {
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  playerAabb,
} from '../player/PlayerDims.js';

const COLORS = [
  0xc53030, 0x2b6cb0, 0x2f855a, 0xb7791f, 0x6b46c1, 0xdd6b20,
  0x319795, 0xd53f8c, 0x718096, 0x38a169, 0x3182ce, 0xc05621,
  0x805ad5, 0xe53e3e, 0x2c7a7b, 0xd69e2e,
];

function makeMat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

/** Visual body sized to match PLAYER_WIDTH × PLAYER_HEIGHT hitbox. */
export function createRemoteMesh(color) {
  const group = new THREE.Group();
  const primary = makeMat(color);
  const skin = makeMat(0xe2c4a0);
  const dark = makeMat(0x2d3748);

  const bodyW = PLAYER_WIDTH * 0.85;
  const legH = PLAYER_HEIGHT * 0.4;
  const torsoH = PLAYER_HEIGHT * 0.35;
  const headS = PLAYER_WIDTH * 0.7;

  const legY = legH * 0.5;
  const torsoY = legH + torsoH * 0.5;
  const headY = legH + torsoH + headS * 0.5;

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, torsoH, PLAYER_WIDTH * 0.45),
    primary
  );
  torso.position.y = torsoY;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(headS, headS, headS), skin);
  head.position.y = headY;
  group.add(head);

  const armW = PLAYER_WIDTH * 0.28;
  const armH = torsoH * 0.95;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, armW), primary);
  armL.position.set(-(bodyW * 0.5 + armW * 0.5), torsoY, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = bodyW * 0.5 + armW * 0.5;
  group.add(armR);

  const legW = PLAYER_WIDTH * 0.32;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(legW, legH, legW), dark);
  legL.position.set(-legW * 0.55, legY, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = legW * 0.55;
  group.add(legR);

  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.legL = legL;
  group.userData.legR = legR;
  return group;
}

function createPistolMesh() {
  const group = new THREE.Group();
  const metal = makeMat(0x2a2a2a);
  const dark = makeMat(0x1a1a1a);
  const wood = makeMat(0x3d2b1f);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.22), metal);
  body.position.set(0, 0.02, -0.04);
  group.add(body);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.18), dark);
  barrel.position.set(0, 0.03, -0.2);
  group.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.08), wood);
  grip.position.set(0, -0.07, 0.04);
  grip.rotation.x = 0.28;
  group.add(grip);

  return group;
}

export class RemotePlayer {
  constructor(scene, data, colorIndex = 0, { weapon = null } = {}) {
    this.id = data.id;
    this.name = data.name || `Player${data.id}`;
    this.x = data.x ?? 0;
    this.y = data.y ?? 40;
    this.z = data.z ?? 0;
    this.yaw = data.yaw ?? 0;
    this.pitch = data.pitch ?? 0;
    this.tx = this.x;
    this.ty = this.y;
    this.tz = this.z;
    this.tyaw = this.yaw;
    this.anim = Math.random() * 10;
    this.dead = !!data.dead;
    this.weapon = weapon;

    this.mesh = createRemoteMesh(COLORS[colorIndex % COLORS.length]);
    if (weapon === 'pistol') {
      const pistol = createPistolMesh();
      pistol.position.set(0.02, -0.18, -0.16);
      pistol.rotation.set(-0.35, 0, 0);
      this.mesh.userData.armR.add(pistol);
      this.mesh.userData.pistol = pistol;
    }
    scene.add(this.mesh);

    this.label = document.createElement('div');
    this.label.className = 'player-label';
    this.label.textContent = this.name;
    document.body.appendChild(this.label);

    this.setDead(this.dead);
  }

  get aabb() {
    return playerAabb(this.x, this.y, this.z);
  }

  applyState(msg) {
    if (typeof msg.x === 'number') this.tx = msg.x;
    if (typeof msg.y === 'number') this.ty = msg.y;
    if (typeof msg.z === 'number') this.tz = msg.z;
    if (typeof msg.yaw === 'number') this.tyaw = msg.yaw;
    if (typeof msg.pitch === 'number') this.pitch = msg.pitch;
    if (typeof msg.name === 'string') {
      this.name = msg.name;
      this.label.textContent = this.name;
    }
    if (typeof msg.dead === 'boolean') this.setDead(msg.dead);
  }

  setDead(dead) {
    this.dead = dead;
    this.mesh.visible = !dead;
    this.label.style.opacity = dead ? '0.35' : '1';
    if (dead) this.label.textContent = `${this.name} (dead)`;
    else this.label.textContent = this.name;
  }

  update(dt, camera, renderer) {
    if (this.dead) {
      this.label.style.display = 'none';
      return;
    }

    const lerp = 1 - Math.pow(0.001, dt);
    const prevX = this.x;
    const prevZ = this.z;
    this.x += (this.tx - this.x) * lerp;
    this.y += (this.ty - this.y) * lerp;
    this.z += (this.tz - this.z) * lerp;

    let dyaw = this.tyaw - this.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.yaw += dyaw * lerp;

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw;

    const moving = Math.hypot(this.x - prevX, this.z - prevZ) > 0.002;
    const pistol = this.weapon === 'pistol';
    if (moving) {
      this.anim += dt * 10;
      const swing = Math.sin(this.anim) * 0.5;
      this.mesh.userData.legL.rotation.x = swing;
      this.mesh.userData.legR.rotation.x = -swing;
      this.mesh.userData.armL.rotation.x = -swing * 0.5;
      if (!pistol) this.mesh.userData.armR.rotation.x = swing * 0.5;
    } else {
      this.mesh.userData.legL.rotation.x *= 0.8;
      this.mesh.userData.legR.rotation.x *= 0.8;
      this.mesh.userData.armL.rotation.x *= 0.8;
    }
    if (pistol) {
      this.mesh.userData.armR.rotation.x = -this.pitch * 0.9 - 0.35;
    }

    this.updateLabel(camera, renderer);
  }

  updateLabel(camera, renderer) {
    const pos = new THREE.Vector3(this.x, this.y + PLAYER_HEIGHT + 0.25, this.z);
    pos.project(camera);
    const visible = pos.z < 1;
    this.label.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    this.label.style.left = `${(pos.x * 0.5 + 0.5) * w}px`;
    this.label.style.top = `${(-pos.y * 0.5 + 0.5) * h}px`;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    this.label.remove();
  }
}
