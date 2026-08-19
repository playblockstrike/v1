import * as THREE from 'three';
import { BlockId, isSolid } from './blocks/BlockTypes.js';
import { Player, PLAYER_HALF_WIDTH, PLAYER_HEIGHT, MAX_HEALTH, SHOT_DAMAGE, damageForPart } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { castRay } from './player/Raycast.js';
import { World } from './world/World.js';
import { HUD } from './ui/HUD.js';
import { Hotbar } from './ui/Hotbar.js';
import { Mode, isGunMode } from './weapons/Modes.js';
import { WeaponSystem } from './weapons/WeaponSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { gameConfig } from './config/GameConfig.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { Spaceships } from './world/Spaceships.js';
import { Network } from './net/Network.js';
import { Lobby } from './net/Lobby.js';
import { WORLD_SEED } from './net/protocol.js';
import { DEFAULT_MAP_ID, mapName } from './world/maps.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec8e8);
scene.fog = new THREE.Fog(0x9ec8e8, 70, 180);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
scene.add(camera);

const skyTraffic = new Spaceships(scene);

const audio = new AudioSystem();
audio.setMusicVolume(gameConfig.songVolume);
gameConfig.onChange((values) => {
  audio.setMusicVolume(values.songVolume);
});

const world = new World(scene, WORLD_SEED);
const player = new Player(camera);
const controls = new Controls(renderer.domElement);
const weapons = new WeaponSystem(scene, camera, world, audio);

const hotbar = new Hotbar();
const settings = new SettingsPanel();
settings.setVisible(true);

/** @type {import('./ui/HUD.js').HUD} */
let hud;
/** @type {import('./net/Network.js').Network} */
let net;
/** @type {import('./net/Lobby.js').Lobby} */
let lobby;

async function requestPlay() {
  if (!net?.connected) return;
  if (player.dead) return;
  if (controls.locked) return;
  await audio.ensureStarted();
  audio.setMusicVolume(gameConfig.songVolume);
  controls.requestLock();
}

function resetLocalWorld(mapId = world.mapId || DEFAULT_MAP_ID) {
  world.setMap(mapId, WORLD_SEED);
  player.resetCombat();
  const spawn = world.getRandomSpawnPosition();
  player.position.x = spawn.x;
  player.position.y = spawn.y;
  player.position.z = spawn.z;
  world.updateAround(player.position.x, player.position.z);
  hud?.setHealth(player.health, MAX_HEALTH);
  hud?.setDeathBanner(0);
}

function returnToLobby() {
  lobby.stopHosting();
  net.leaveMatch();
  resetLocalWorld();
  hud.setInSession(false);
  hud.setScoreboardVisible(false);
  hud.setScoreboard([]);
  hud.setNetStatus('Ready — host or join a match');
}

net = new Network({
  scene,
  world,
  audio,
  onStatus: (text) => hud.setNetStatus(text),
  onPlayerCount: (n) => {
    lobby.updateHosting({ players: n });
  },
  onHostLeft: () => {
    returnToLobby();
  },
  onJoinFailed: (reason) => {
    returnToLobby();
    hud.setNetStatus(reason || 'Could not join match');
  },
  onHit: (msg) => {
    if (player.dead) return;
    const amount =
      typeof msg.damage === 'number'
        ? msg.damage
        : damageForPart(msg.part) || SHOT_DAMAGE;
    const killed = player.takeDamage(amount);
    audio.playHit(msg.part === 'head' ? 0.6 : 0.5);
    if (killed) {
      net.sendKill(msg.by);
    }
  },
  onKill: (info) => {
    if (info.isLocalKill) {
      hud.showHitMarker({ kill: true });
    }
  },
  onScoreboard: (entries) => {
    hud.setScoreboard(entries, net.id);
  },
});

lobby = new Lobby({
  onSessions: (sessions) => hud.setSessions(sessions),
  onStatus: (text) => {
    if (!net.connected) hud.setNetStatus(text);
  },
});

hud = new HUD({
  onPlay: requestPlay,
  onHost: async (playerName, mapId) => {
    try {
      const selectedMap = mapId || DEFAULT_MAP_ID;
      resetLocalWorld(selectedMap);
      const session = await net.host(playerName, selectedMap);
      lobby.startHosting({
        sessionId: session.sessionId,
        players: 1,
        mapId: selectedMap,
        mapName: mapName(selectedMap),
      });
      hud.setInSession(true, {
        role: 'host',
        sessionId: session.sessionId,
        mapId: selectedMap,
      });
    } catch (err) {
      console.error(err);
      hud.setNetStatus('Failed to host match');
    }
  },
  onJoin: async (session, playerName) => {
    try {
      resetLocalWorld(session.mapId || DEFAULT_MAP_ID);
      await net.join(session, playerName);
      hud.setInSession(true, {
        role: 'client',
        sessionId: session.sessionId,
        mapId: session.mapId,
      });
    } catch (err) {
      console.error(err);
      hud.setNetStatus('Failed to join match');
      hud.setInSession(false);
    }
  },
  onLeave: () => {
    if (controls.locked) document.exitPointerLock?.();
    returnToLobby();
  },
});

lobby.connect();

player.onHealthChange = (hp, max) => hud.setHealth(hp, max);
player.onDeath = () => {
  hud.setDeathBanner(3);
};

player.onRespawn = () => {
  hud.setDeathBanner(0);
  hud.setHealth(player.health, MAX_HEALTH);
  // Resume play immediately — no second "Click to play"
  if (!controls.locked && net.connected) {
    requestPlay();
  }
};

hud.setHealth(player.health, MAX_HEALTH);

net.onRemoteShot = (msg) => {
  const origin = { x: msg.ox, y: msg.oy, z: msg.oz };
  const direction = { x: msg.dx, y: msg.dy, z: msg.dz };
  weapons.spawnBullet(origin, direction, false);
  audio.playSpatialShot(player.position, origin);
};

weapons.onShoot = (origin, direction) => {
  net.sendShot(origin, direction);
};

weapons.onBlockChange = (x, y, z, id) => {
  net.sendBlock(x, y, z, id);
};

weapons.getTargets = () =>
  [...net.remotes.values()].map((r) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    z: r.z,
    yaw: r.yaw,
    dead: r.dead,
  }));

weapons.getLocalTarget = () => ({
  x: player.position.x,
  y: player.position.y,
  z: player.position.z,
  yaw: player.yaw,
  dead: player.dead,
});

weapons.onHitPlayer = (targetId, damage, part) => {
  net.sendHit(targetId, damage ?? damageForPart(part), part);
  hud.showHitMarker({ headshot: part === 'head' });
};

function applyModeUI() {
  const mode = weapons.mode;
  hud.setMode(mode);
  hotbar.setVisible(mode === Mode.CONSTRUCTOR);
}

applyModeUI();

const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 })
);
highlight.visible = false;
scene.add(highlight);

let lastTime = performance.now();
let mouseDown = { left: false, right: false };

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

renderer.domElement.addEventListener('click', () => {
  if (net.connected) requestPlay();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault();
    if (net.connected) hud.setScoreboardVisible(true);
    return;
  }
  if (!controls.locked) return;
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') {
    weapons.setModeIndex(Number(e.code.slice(-1)) - 1);
    audio.playModeSwitch();
    applyModeUI();
    highlight.visible = false;
    return;
  }
  if (weapons.mode === Mode.CONSTRUCTOR) {
    hotbar.handleKey(e.code);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault();
    hud.setScoreboardVisible(false);
  }
});

document.addEventListener('wheel', (e) => {
  if (!controls.locked) return;
  e.preventDefault();
  if (weapons.mode !== Mode.CONSTRUCTOR) return;
  const delta = e.deltaY > 0 ? 1 : -1;
  hotbar.cycle(delta);
}, { passive: false });

document.addEventListener('mousedown', (e) => {
  if (!controls.locked) return;
  if (e.button === 0) {
    mouseDown.left = true;
    weapons.setTrigger(true);
  }
  if (e.button === 2) {
    mouseDown.right = true;
    if (weapons.mode === Mode.SNIPER && !player.dead) {
      weapons.toggleScope();
    }
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    mouseDown.left = false;
    weapons.setTrigger(false);
  }
  if (e.button === 2) mouseDown.right = false;
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('mousemove', (e) => {
  if (!controls.locked) return;
  player.rotate(e.movementX, e.movementY, weapons.lookScale);
});

document.addEventListener('pointerlockchange', () => {
  if (controls.locked) {
    hud.hideOverlay();
    settings.setVisible(false);
    audio.ensureStarted();
  } else if (player.dead) {
    // Keep match UI during death countdown; respawn re-locks automatically
    hud.hideOverlay();
    settings.setVisible(false);
  } else {
    weapons.closeScope();
    hud.showOverlay();
    settings.setVisible(true);
  }
});

document.addEventListener('pointerlockerror', () => {
  hud.showOverlay();
  settings.setVisible(true);
});

const spawn = world.getRandomSpawnPosition();
player.position.x = spawn.x;
player.position.y = spawn.y;
player.position.z = spawn.z;
world.updateAround(player.position.x, player.position.z);

function groundBlockId() {
  const x = Math.floor(player.position.x);
  const z = Math.floor(player.position.z);
  const y = Math.floor(player.position.y - 0.05);
  const block = world.getBlock(x, y, z);
  if (isSolid(block)) return block;
  return world.getBlock(x, y - 1, z);
}

function interactConstructor() {
  const eye = player.eyePosition;
  const dir = player.direction;
  const result = castRay(world, eye, dir);

  if (!result.hit) {
    highlight.visible = false;
    return;
  }

  highlight.visible = true;
  highlight.position.set(result.block.x + 0.5, result.block.y + 0.5, result.block.z + 0.5);

  if (mouseDown.left) {
    const broken = world.getBlock(result.block.x, result.block.y, result.block.z);
    world.setBlock(result.block.x, result.block.y, result.block.z, BlockId.AIR);
    audio.playBreak(broken);
    weapons.viewModel.punch(1.8);
    net.sendBlock(result.block.x, result.block.y, result.block.z, BlockId.AIR);
    mouseDown.left = false;
  }

  if (mouseDown.right) {
    const { x, y, z } = result.place;
    const hw = PLAYER_HALF_WIDTH;
    const px = player.position;
    const overlapsPlayer =
      x >= Math.floor(px.x - hw) &&
      x <= Math.floor(px.x + hw) &&
      z >= Math.floor(px.z - hw) &&
      z <= Math.floor(px.z + hw) &&
      y >= Math.floor(px.y) &&
      y <= Math.floor(px.y + PLAYER_HEIGHT - 0.001);

    if (!overlapsPlayer) {
      const placed = hotbar.selectedBlock;
      world.setBlock(x, y, z, placed);
      audio.playPlace(placed);
      weapons.viewModel.punch(1.8);
      net.sendBlock(x, y, z, placed);
    }
    mouseDown.right = false;
  }
}

function interactShot() {
  highlight.visible = false;
  if (player.dead) return;
  if (weapons.isAutomatic) return;
  if (mouseDown.left) {
    weapons.tryShoot(player);
    mouseDown.left = false;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const moving =
    !player.dead &&
    (controls.isDown('KeyW') ||
      controls.isDown('KeyA') ||
      controls.isDown('KeyS') ||
      controls.isDown('KeyD'));
  const sprint = controls.isDown('ShiftLeft') || controls.isDown('ShiftRight');

  if (player.dead) {
    const left = player.updateRespawn(world);
    hud.setDeathBanner(left > 0 ? left : 0);
    if (player.dead) {
      player.updateMovement(controls, dt);
      player.applyPhysics(world, dt);
    }
  } else if (controls.locked) {
    player.updateMovement(controls, dt);
    player.applyPhysics(world, dt);

    if (isGunMode(weapons.mode)) {
      interactShot();
    } else {
      interactConstructor();
    }

    audio.updateFootsteps(dt, {
      moving,
      onGround: player.onGround,
      sprint,
      blockId: groundBlockId(),
    });
  }

  net.sendState(player, weapons.mode);
  net.update(dt, camera, renderer);
  weapons.update(dt, controls.locked && moving, controls.locked ? player : null);
  hud.setMagazine(weapons.magazineState);
  hud.setScoped(weapons.isScoped);
  hud.updateHitMarker(dt);
  player.syncCamera();
  skyTraffic.update(dt, player.position);
  world.updateAround(player.position.x, player.position.z);
  renderer.render(scene, camera);
}

animate(lastTime);
