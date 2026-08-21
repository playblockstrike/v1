import * as THREE from 'three';
import { Mode } from './Modes.js';

function makeBox(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  return mesh;
}

export class ViewModel {
  constructor(camera) {
    this.root = new THREE.Group();
    this.root.position.set(0.32, -0.28, -0.45);
    camera.add(this.root);

    this.pistol = this.buildPistol();
    this.ak = this.buildAk();
    this.sniper = this.buildSniper();
    this.constructorTool = this.buildConstructor();
    this.root.add(this.pistol, this.ak, this.sniper, this.constructorTool);

    this.pistolMuzzle = new THREE.Vector3(0, 0.04, -0.44);
    this.akMuzzle = new THREE.Vector3(0.01, 0.07, -0.8);
    this.sniperMuzzle = new THREE.Vector3(0.02, 0.05, -0.78);

    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 })
    );
    this.muzzleFlash.visible = false;
    this.muzzleFlash.frustumCulled = false;
    this.root.add(this.muzzleFlash);

    this.recoil = 0;
    this.swing = 0;
    this.bob = 0;
    this.setMode(Mode.CONSTRUCTOR);
  }

  buildPistol() {
    const group = new THREE.Group();

    const body = makeBox(0.08, 0.1, 0.35, 0x2a2a2a);
    body.position.set(0, 0.02, -0.05);
    group.add(body);

    const barrel = makeBox(0.04, 0.04, 0.28, 0x1a1a1a);
    barrel.position.set(0, 0.04, -0.28);
    group.add(barrel);

    const grip = makeBox(0.06, 0.14, 0.1, 0x3d2b1f);
    grip.position.set(0, -0.08, 0.05);
    grip.rotation.x = 0.25;
    group.add(grip);

    const sight = makeBox(0.02, 0.04, 0.02, 0x888888);
    sight.position.set(0, 0.09, -0.12);
    group.add(sight);

    return group;
  }

  buildAk() {
    const group = new THREE.Group();
    group.position.set(0.01, 0.03, 0.05);

    const receiver = makeBox(0.068, 0.078, 0.4, 0x3a3a3a);
    receiver.position.set(0, 0.02, -0.08);
    group.add(receiver);

    const cover = makeBox(0.056, 0.028, 0.3, 0x2c2c2c);
    cover.position.set(0, 0.072, -0.1);
    group.add(cover);

    const handguard = makeBox(0.072, 0.055, 0.2, 0x6b4423);
    handguard.position.set(0, 0.012, -0.34);
    group.add(handguard);

    const lowerGuard = makeBox(0.06, 0.028, 0.16, 0x5a3818);
    lowerGuard.position.set(0, -0.022, -0.32);
    group.add(lowerGuard);

    const gas = makeBox(0.024, 0.024, 0.22, 0x2a2a2a);
    gas.position.set(0, 0.072, -0.4);
    group.add(gas);

    const barrel = makeBox(0.022, 0.022, 0.38, 0x1a1a1a);
    barrel.position.set(0, 0.038, -0.6);
    group.add(barrel);

    const frontSight = makeBox(0.02, 0.055, 0.02, 0x222222);
    frontSight.position.set(0, 0.078, -0.76);
    group.add(frontSight);

    const brake = makeBox(0.034, 0.034, 0.06, 0x2c2c2c);
    brake.position.set(0, 0.038, -0.82);
    group.add(brake);

    const rearSight = makeBox(0.042, 0.032, 0.032, 0x333333);
    rearSight.position.set(0, 0.092, 0.04);
    group.add(rearSight);

    const magTop = makeBox(0.042, 0.11, 0.09, 0x2a2a2a);
    magTop.position.set(0, -0.06, -0.02);
    magTop.rotation.x = 0.18;
    group.add(magTop);

    const magBot = makeBox(0.04, 0.1, 0.085, 0x242424);
    magBot.position.set(0, -0.145, 0.018);
    magBot.rotation.x = 0.55;
    group.add(magBot);

    const grip = makeBox(0.05, 0.13, 0.068, 0x4a3218);
    grip.position.set(0, -0.072, 0.12);
    grip.rotation.x = 0.38;
    group.add(grip);

    const stock = makeBox(0.055, 0.07, 0.22, 0x6b4423);
    stock.position.set(0, 0.002, 0.26);
    group.add(stock);

    const stockEnd = makeBox(0.062, 0.1, 0.04, 0x5a3818);
    stockEnd.position.set(0, -0.012, 0.38);
    group.add(stockEnd);

    return group;
  }

  buildSniper() {
    const group = new THREE.Group();
    group.position.set(0.02, 0.04, 0.06);

    const body = makeBox(0.055, 0.065, 0.52, 0x1a1a1a);
    body.position.set(0, 0.02, -0.1);
    group.add(body);

    const barrel = makeBox(0.022, 0.022, 0.62, 0x111111);
    barrel.position.set(0, 0.035, -0.58);
    group.add(barrel);

    const brake = makeBox(0.03, 0.03, 0.08, 0x2a2a2a);
    brake.position.set(0, 0.035, -0.9);
    group.add(brake);

    const stock = makeBox(0.05, 0.08, 0.24, 0x3a2918);
    stock.position.set(0, -0.01, 0.24);
    group.add(stock);

    const mag = makeBox(0.035, 0.12, 0.07, 0x2c2c2c);
    mag.position.set(0, -0.07, 0.0);
    group.add(mag);

    const grip = makeBox(0.04, 0.12, 0.065, 0x242424);
    grip.position.set(0, -0.07, 0.1);
    grip.rotation.x = 0.32;
    group.add(grip);

    const scope = makeBox(0.042, 0.042, 0.26, 0x2b2b2b);
    scope.position.set(0, 0.095, -0.16);
    group.add(scope);

    const ringF = makeBox(0.05, 0.05, 0.03, 0x3a3a3a);
    ringF.position.set(0, 0.095, -0.3);
    group.add(ringF);

    const ringR = makeBox(0.05, 0.05, 0.03, 0x3a3a3a);
    ringR.position.set(0, 0.095, -0.02);
    group.add(ringR);

    const lens = makeBox(0.038, 0.038, 0.012, 0x1a4a22);
    lens.position.set(0, 0.095, -0.318);
    group.add(lens);

    return group;
  }

  buildConstructor() {
    const group = new THREE.Group();

    const handle = makeBox(0.04, 0.04, 0.4, 0x8b5a2b);
    handle.position.set(0, 0, -0.06);
    group.add(handle);

    const wrap = makeBox(0.046, 0.046, 0.1, 0x5a3818);
    wrap.position.set(0, 0, 0.08);
    group.add(wrap);

    const neck = makeBox(0.032, 0.032, 0.05, 0x4a4a4a);
    neck.position.set(0, 0.01, -0.28);
    group.add(neck);

    const head = makeBox(0.18, 0.07, 0.07, 0x8d8d8d);
    head.position.set(0, 0.02, -0.34);
    group.add(head);

    const face = makeBox(0.055, 0.085, 0.085, 0xa0a0a0);
    face.position.set(-0.08, 0.02, -0.34);
    group.add(face);

    const claw = makeBox(0.07, 0.03, 0.09, 0x6f6f6f);
    claw.position.set(0.09, 0.04, -0.34);
    claw.rotation.z = -0.2;
    group.add(claw);

    const clawGap = makeBox(0.04, 0.018, 0.05, 0x3a3a3a);
    clawGap.position.set(0.1, 0.04, -0.34);
    group.add(clawGap);

    return group;
  }

  setMode(mode) {
    this.mode = mode;
    this.pistol.visible = mode === Mode.PISTOL;
    this.ak.visible = mode === Mode.AK;
    this.sniper.visible = mode === Mode.SNIPER;
    this.constructorTool.visible = mode === Mode.CONSTRUCTOR;
    if (mode !== Mode.CONSTRUCTOR) {
      this.swing = 0;
      this.constructorTool.rotation.set(0, 0, 0);
    }
    this.attachFlash();
  }

  setScoped(scoped) {
    this.root.visible = !scoped;
  }

  attachFlash() {
    this.root.add(this.muzzleFlash);
    if (this.mode === Mode.AK) {
      this.muzzleFlash.position.copy(this.akMuzzle);
    } else if (this.mode === Mode.SNIPER) {
      this.muzzleFlash.position.copy(this.sniperMuzzle);
    } else {
      this.muzzleFlash.position.copy(this.pistolMuzzle);
    }
  }

  punch(amount = 1) {
    this.recoil = amount;
    if (this.mode === Mode.CONSTRUCTOR) this.swing = 1;
  }

  flash() {
    this.muzzleFlash.scale.setScalar(this.mode === Mode.AK ? 1.32 : this.mode === Mode.SNIPER ? 1.55 : 1.2);
    this.muzzleFlash.visible = true;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this.muzzleFlash.visible = false;
    }, 55);
  }

  update(dt, moving, reloading = false) {
    this.bob += dt * (moving ? 10 : 2);
    this.recoil = Math.max(0, this.recoil - dt * 8);
    this.swing = Math.max(0, this.swing - dt * 4.2);

    const bobY = Math.sin(this.bob) * (moving ? 0.012 : 0.004);
    const bobX = Math.cos(this.bob * 0.5) * (moving ? 0.008 : 0.002);

    if (this.mode === Mode.CONSTRUCTOR) {
      this.updateHammer(bobX, bobY);
      return;
    }

    const kick = this.recoil * 0.08;
    if (reloading) {
      this.root.position.set(0.26 + bobX, -0.46 + bobY, -0.36);
      this.root.rotation.set(0.72, -0.18, 0.32);
      return;
    }
    this.root.position.set(0.32 + bobX, -0.28 + bobY + kick * 0.3, -0.45 + kick);
    this.root.rotation.set(-kick * 0.4, 0, 0);
    this.constructorTool.rotation.set(0, 0, 0);
  }

  updateHammer(bobX, bobY) {
    const t = 1 - this.swing;
    let chop = 0;
    if (this.swing > 0) {
      if (t < 0.32) chop = (t / 0.32) * 1.25;
      else chop = 1.25 * (1 - (t - 0.32) / 0.68);
    }

    this.root.position.set(
      0.46 + bobX * 0.6,
      -0.42 + bobY * 0.6 + chop * 0.06,
      -0.52 + chop * 0.04
    );
    this.root.rotation.set(0.55 - chop * 0.85, 0.42, 0.28 + chop * 0.2);
    this.constructorTool.rotation.set(-chop * 0.35, chop * 0.15, 0);
  }
}
