import * as THREE from 'three';
import {
  EYE_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  playerAabb,
} from '../player/PlayerDims.js';
import { Mode, isGunMode } from '../weapons/Modes.js';

const COLORS = [
  0xc53030, 0x2b6cb0, 0x2f855a, 0xb7791f, 0x6b46c1, 0xdd6b20,
  0x319795, 0xd53f8c, 0x718096, 0x38a169, 0x3182ce, 0xc05621,
  0x805ad5, 0xe53e3e, 0x2c7a7b, 0xd69e2e,
];

const _muzzleWorld = new THREE.Vector3();

function makeMat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function muzzleMarker(x, y, z) {
  const mark = new THREE.Object3D();
  mark.position.set(x, y, z);
  return mark;
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
  group.add(box(0.08, 0.1, 0.24, 0x2a2a2a, 0, 0.02, -0.04));
  group.add(box(0.04, 0.04, 0.2, 0x1a1a1a, 0, 0.035, -0.22));
  const grip = box(0.06, 0.13, 0.09, 0x3d2b1f, 0, -0.07, 0.05);
  grip.rotation.x = 0.28;
  group.add(grip);
  group.add(box(0.02, 0.04, 0.02, 0x888888, 0, 0.09, -0.1));
  group.userData.muzzle = muzzleMarker(0, 0.035, -0.34);
  group.add(group.userData.muzzle);
  return group;
}

function createAkMesh() {
  const group = new THREE.Group();
  group.add(box(0.075, 0.085, 0.34, 0x3a3a3a, 0, 0.02, -0.06));
  group.add(box(0.078, 0.055, 0.2, 0x6b4423, 0, 0.012, -0.28));
  group.add(box(0.026, 0.026, 0.42, 0x1a1a1a, 0, 0.04, -0.5));
  group.add(box(0.038, 0.038, 0.06, 0x2c2c2c, 0, 0.04, -0.72));
  group.add(box(0.024, 0.05, 0.02, 0x222222, 0, 0.08, -0.66));
  const mag = box(0.045, 0.18, 0.09, 0x242424, 0, -0.1, 0.0);
  mag.rotation.x = 0.28;
  group.add(mag);
  const grip = box(0.05, 0.13, 0.07, 0x4a3218, 0, -0.07, 0.12);
  grip.rotation.x = 0.38;
  group.add(grip);
  group.add(box(0.06, 0.075, 0.2, 0x6b4423, 0, 0.0, 0.26));
  group.userData.muzzle = muzzleMarker(0, 0.04, -0.76);
  group.add(group.userData.muzzle);
  return group;
}

function createSniperMesh() {
  const group = new THREE.Group();
  group.add(box(0.06, 0.07, 0.42, 0x1a1a1a, 0, 0.02, -0.08));
  group.add(box(0.024, 0.024, 0.55, 0x111111, 0, 0.035, -0.5));
  group.add(box(0.034, 0.034, 0.08, 0x2a2a2a, 0, 0.035, -0.8));
  group.add(box(0.055, 0.085, 0.22, 0x3a2918, 0, -0.01, 0.22));
  group.add(box(0.04, 0.12, 0.07, 0x2c2c2c, 0, -0.07, 0.02));
  const grip = box(0.045, 0.12, 0.065, 0x242424, 0, -0.07, 0.1);
  grip.rotation.x = 0.32;
  group.add(grip);
  group.add(box(0.048, 0.048, 0.24, 0x2b2b2b, 0, 0.1, -0.14));
  group.add(box(0.056, 0.056, 0.03, 0x3a3a3a, 0, 0.1, -0.28));
  group.add(box(0.04, 0.04, 0.014, 0x1a4a22, 0, 0.1, -0.3));
  group.userData.muzzle = muzzleMarker(0, 0.035, -0.86);
  group.add(group.userData.muzzle);
  return group;
}

function createHammerMesh() {
  const group = new THREE.Group();
  group.add(box(0.045, 0.045, 0.38, 0x8b5a2b, 0, 0, -0.04));
  group.add(box(0.05, 0.05, 0.1, 0x5a3818, 0, 0, 0.12));
  group.add(box(0.2, 0.08, 0.08, 0x8d8d8d, 0, 0.02, -0.28));
  group.add(box(0.06, 0.1, 0.1, 0xa0a0a0, -0.09, 0.02, -0.28));
  group.add(box(0.08, 0.035, 0.1, 0x6f6f6f, 0.1, 0.04, -0.28));
  group.userData.muzzle = muzzleMarker(0, 0.02, -0.34);
  group.add(group.userData.muzzle);
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
    this.weapon = null;
    this.activeMuzzle = null;

    this.mesh = createRemoteMesh(COLORS[colorIndex % COLORS.length]);
    this.attachHeldItems();
    this.setHeld(weapon || data.mode || Mode.CONSTRUCTOR);
    scene.add(this.mesh);

    this.label = document.createElement('div');
    this.label.className = 'player-label';
    this.label.textContent = this.name;
    document.body.appendChild(this.label);

    this.setDead(this.dead);
  }

  attachHeldItems() {
    const armR = this.mesh.userData.armR;
    const root = new THREE.Group();
    root.position.set(0.05, -0.22, -0.1);
    root.rotation.set(-0.2, 0, 0.08);
    armR.add(root);

    this.pistol = createPistolMesh();
    this.ak = createAkMesh();
    this.sniper = createSniperMesh();
    this.hammer = createHammerMesh();
    root.add(this.pistol, this.ak, this.sniper, this.hammer);

    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 })
    );
    this.muzzleFlash.visible = false;
    this.muzzleFlash.frustumCulled = false;
    root.add(this.muzzleFlash);

    this.mesh.userData.heldRoot = root;
  }

  setHeld(mode) {
    const next = mode || Mode.CONSTRUCTOR;
    this.weapon = next;
    this.pistol.visible = next === Mode.PISTOL;
    this.ak.visible = next === Mode.AK;
    this.sniper.visible = next === Mode.SNIPER;
    this.hammer.visible = next === Mode.CONSTRUCTOR;
    this.activeMuzzle =
      next === Mode.AK
        ? this.ak.userData.muzzle
        : next === Mode.SNIPER
          ? this.sniper.userData.muzzle
          : next === Mode.PISTOL
            ? this.pistol.userData.muzzle
            : this.hammer.userData.muzzle;
    if (this.activeMuzzle) this.activeMuzzle.add(this.muzzleFlash);
    this.aimRightArm();
  }

  aimRightArm() {
    const armR = this.mesh.userData.armR;
    if (isGunMode(this.weapon)) {
      armR.rotation.x = -this.pitch * 0.9 - 0.42;
    } else {
      armR.rotation.x = -0.55 - this.pitch * 0.25;
    }
  }

  applyPoseToMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw;
    this.aimRightArm();
    this.mesh.updateMatrixWorld(true);
  }

  getMuzzlePosition() {
    this.applyPoseToMesh();
    if (!this.activeMuzzle) {
      return {
        x: this.x,
        y: this.y + EYE_HEIGHT * 0.7,
        z: this.z,
      };
    }
    this.activeMuzzle.getWorldPosition(_muzzleWorld);
    return { x: _muzzleWorld.x, y: _muzzleWorld.y, z: _muzzleWorld.z };
  }

  flashMuzzle() {
    if (!this.muzzleFlash) return;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.scale.setScalar(this.weapon === Mode.SNIPER ? 1.6 : this.weapon === Mode.AK ? 1.35 : 1.15);
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this.muzzleFlash.visible = false;
    }, 55);
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
    if (typeof msg.mode === 'string') this.setHeld(msg.mode);
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

    const moving = Math.hypot(this.x - prevX, this.z - prevZ) > 0.002;
    if (moving) {
      this.anim += dt * 10;
      const swing = Math.sin(this.anim) * 0.5;
      this.mesh.userData.legL.rotation.x = swing;
      this.mesh.userData.legR.rotation.x = -swing;
      this.mesh.userData.armL.rotation.x = -swing * 0.5;
    } else {
      this.mesh.userData.legL.rotation.x *= 0.8;
      this.mesh.userData.legR.rotation.x *= 0.8;
      this.mesh.userData.armL.rotation.x *= 0.8;
    }

    this.applyPoseToMesh();
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
    clearTimeout(this._flashTimer);
    scene.remove(this.mesh);
    this.mesh.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    this.label.remove();
  }
}
