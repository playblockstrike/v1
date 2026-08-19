import * as THREE from 'three';

const LIGHT_DIR = new THREE.Vector3(0.45, 0.85, 0.25).normalize();

const HULL_COLORS = [0x4a5568, 0x2d3748, 0x718096, 0x1a365d, 0x553c9a, 0x234e52];
const ACCENT_COLORS = [0x63b3ed, 0x68d391, 0xf6ad55, 0xfc8181, 0xb794f4, 0x4fd1c5];

function createSpaceship(rng) {
  const group = new THREE.Group();
  const scale = 0.8 + rng() * 1.8;
  const hullColor = HULL_COLORS[(rng() * HULL_COLORS.length) | 0];
  const accent = ACCENT_COLORS[(rng() * ACCENT_COLORS.length) | 0];

  const hullMat = new THREE.MeshLambertMaterial({ color: hullColor });
  const accentMat = new THREE.MeshLambertMaterial({ color: accent });
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0xa0e9ff,
    transparent: true,
    opacity: 0.75,
  });
  const engineMat = new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.9,
    fog: false,
  });

  const style = (rng() * 3) | 0;

  if (style === 0) {
    // Fighter: pointed nose + wings
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.1), hullMat);
    group.add(body);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.55), hullMat);
    nose.position.set(2.0, 0.05, 0);
    group.add(nose);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.7), glassMat);
    cockpit.position.set(0.6, 0.45, 0);
    group.add(cockpit);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 2.4), accentMat);
    wingL.position.set(-0.2, -0.05, 1.4);
    group.add(wingL);
    const wingR = wingL.clone();
    wingR.position.z = -1.4;
    group.add(wingR);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.12), accentMat);
    fin.position.set(-1.0, 0.5, 0);
    group.add(fin);
  } else if (style === 1) {
    // Freighter: chunky hull + side pods
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 1.6), hullMat);
    group.add(body);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), glassMat);
    bridge.position.set(1.8, 0.7, 0);
    group.add(bridge);

    const podL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.7), accentMat);
    podL.position.set(-0.4, -0.2, 1.3);
    group.add(podL);
    const podR = podL.clone();
    podR.position.z = -1.3;
    group.add(podR);

    const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), hullMat);
    antenna.position.set(-1.5, 1.2, 0);
    group.add(antenna);
  } else {
    // Scout: slim body + twin engines
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.7), hullMat);
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.6), glassMat);
    cabin.position.set(0.7, 0.35, 0);
    group.add(cabin);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 2.8), accentMat);
    wing.position.set(-0.3, 0, 0);
    group.add(wing);

    const engL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.35), hullMat);
    engL.position.set(-1.5, -0.1, 0.55);
    group.add(engL);
    const engR = engL.clone();
    engR.position.z = -0.55;
    group.add(engR);
  }

  // Engine glow at the rear (-X, since ships fly toward +X)
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), engineMat);
  glow.position.set(style === 1 ? -2.4 : -1.8, 0, 0);
  group.add(glow);

  const glow2 = glow.clone();
  glow2.position.z = 0.35;
  group.add(glow2);
  const glow3 = glow.clone();
  glow3.position.z = -0.35;
  group.add(glow3);

  group.scale.setScalar(scale);
  // Face flight direction (+X)
  group.rotation.y = 0;

  return group;
}

export class Spaceships {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Keep scene lighting (no visible sun)
    this.sunLight = new THREE.DirectionalLight(0xfff2d0, 0.95);
    this.sunLight.position.copy(LIGHT_DIR).multiplyScalar(80);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambient = new THREE.HemisphereLight(0xbfd4ff, 0x3d4f2f, 0.55);
    this.scene.add(this.ambient);

    this.ships = [];
    this.spawnFleet();
  }

  spawnFleet() {
    let seed = 7771;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const count = 16;
    for (let i = 0; i < count; i++) {
      const mesh = createSpaceship(rng);
      mesh.position.set(
        (rng() - 0.5) * 240,
        70 + rng() * 28,
        (rng() - 0.5) * 240
      );
      // Slight bank / pitch variety
      mesh.rotation.z = (rng() - 0.5) * 0.15;
      mesh.rotation.x = (rng() - 0.5) * 0.08;

      this.root.add(mesh);
      this.ships.push({
        mesh,
        speed: 1.5 + rng() * 2.5,
        baseY: mesh.position.y,
        bob: rng() * Math.PI * 2,
      });
    }
  }

  update(dt, playerPos) {
    // Same as former clouds: stay centered on player, drift +X, bob, wrap
    this.root.position.x = playerPos.x;
    this.root.position.z = playerPos.z;

    for (const ship of this.ships) {
      ship.mesh.position.x += ship.speed * dt;
      ship.bob += dt * 0.3;
      ship.mesh.position.y = ship.baseY + Math.sin(ship.bob) * 0.6;

      if (ship.mesh.position.x > 130) ship.mesh.position.x -= 260;
      if (ship.mesh.position.x < -130) ship.mesh.position.x += 260;
    }
  }
}
