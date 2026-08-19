import { Msg, TICK_MS, WORLD_SEED, MAX_NAME_LEN, MAX_PLAYERS } from './protocol.js';
import { inWorldBlock, worldCenter, FLOOR_Y } from '../blocks/BlockTypes.js';

function blockKey(x, y, z) {
  return `${x},${y},${z}`;
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    mode: p.mode,
    dead: !!p.dead,
  };
}

function spawnPose() {
  const { x, z } = worldCenter();
  return { x, y: FLOOR_Y + 2, z, yaw: 0, pitch: 0, mode: 'constructor' };
}

/**
 * In-browser authoritative match logic (formerly the Node WebSocket server).
 * The host tab owns world edits and relays state to clients over WebRTC.
 */
export class HostAuthority {
  constructor({ sendTo, broadcast, deliver, onPlayerCount, mapId }) {
    this.sendTo = sendTo;
    this.broadcast = broadcast;
    /** Deliver a message to the host's local Network handler (host is not a peer). */
    this.deliver = deliver || (() => {});
    this.onPlayerCount = onPlayerCount || (() => {});
    this.mapId = mapId || 'fy_pool_day';
    /** @type {Map<string, object>} */
    this.players = new Map();
    /** @type {Map<string, number>} */
    this.blocks = new Map();
    this.nextId = 1;
    this.localId = null;
  }

  get playerCount() {
    return this.players.size;
  }

  emitCount() {
    this.onPlayerCount(this.players.size);
  }

  createLocalHost(name = 'Host') {
    const id = String(this.nextId++);
    const pose = spawnPose();
    const player = {
      id,
      name: String(name).slice(0, MAX_NAME_LEN) || 'Host',
      peerId: null,
      ...pose,
      dead: false,
      lastState: 0,
    };
    this.players.set(id, player);
    this.localId = id;
    this.emitCount();
    return {
      type: Msg.WELCOME,
      id,
      name: player.name,
      seed: WORLD_SEED,
      mapId: this.mapId,
      players: [],
      blocks: [],
    };
  }

  handlePeerJoin(peerId) {
    if (this.players.size >= MAX_PLAYERS) {
      this.sendTo(peerId, { type: Msg.FULL, max: MAX_PLAYERS });
      return;
    }
    const id = String(this.nextId++);
    const name = `Player${id}`;
    const pose = spawnPose();
    const player = {
      id,
      name,
      peerId,
      ...pose,
      dead: false,
      lastState: 0,
    };
    this.players.set(id, player);

    const blockList = [];
    for (const [key, blockId] of this.blocks) {
      const [x, y, z] = key.split(',').map(Number);
      blockList.push({ x, y, z, id: blockId });
    }

    this.sendTo(peerId, {
      type: Msg.WELCOME,
      id,
      name,
      seed: WORLD_SEED,
      mapId: this.mapId,
      players: [...this.players.values()]
        .filter((p) => p.id !== id)
        .map(publicPlayer),
      blocks: blockList,
    });

    const joinMsg = { type: Msg.JOIN, player: publicPlayer(player) };
    this.deliver(joinMsg);
    this.broadcast(joinMsg, peerId);
    this.emitCount();
  }

  handlePeerLeave(peerId) {
    for (const [id, p] of this.players) {
      if (p.peerId !== peerId) continue;
      this.players.delete(id);
      const leaveMsg = { type: Msg.LEAVE, id };
      this.deliver(leaveMsg);
      this.broadcast(leaveMsg);
      this.emitCount();
      return;
    }
  }

  playerForPeer(peerId) {
    for (const p of this.players.values()) {
      if (p.peerId === peerId) return p;
    }
    return null;
  }

  handleMessage(peerId, msg) {
    const player = this.playerForPeer(peerId);
    if (!player || !msg?.type) return;

    switch (msg.type) {
      case Msg.STATE:
        this.applyState(player, msg);
        break;
      case Msg.BLOCK:
        this.applyBlock(msg, player.id);
        break;
      case Msg.SHOT: {
        const shotMsg = {
          type: Msg.SHOT,
          id: player.id,
          ox: msg.ox,
          oy: msg.oy,
          oz: msg.oz,
          dx: msg.dx,
          dy: msg.dy,
          dz: msg.dz,
        };
        this.deliver(shotMsg);
        this.broadcast(shotMsg, peerId);
        break;
      }
      case Msg.HIT:
        this.applyHit(player, msg);
        break;
      case Msg.KILL:
        this.applyKill(player, msg);
        break;
      default:
        break;
    }
  }

  /** Host-local player actions (no peerId). */
  handleLocal(msg) {
    const player = this.players.get(this.localId);
    if (!player || !msg?.type) return;

    switch (msg.type) {
      case Msg.STATE:
        this.applyState(player, msg);
        break;
      case Msg.BLOCK:
        this.applyBlock(msg, player.id);
        break;
      case Msg.SHOT:
        this.broadcast({
          type: Msg.SHOT,
          id: player.id,
          ox: msg.ox,
          oy: msg.oy,
          oz: msg.oz,
          dx: msg.dx,
          dy: msg.dy,
          dz: msg.dz,
        });
        break;
      case Msg.HIT:
        this.applyHit(player, msg);
        break;
      case Msg.KILL:
        this.applyKill(player, msg);
        break;
      default:
        break;
    }
  }

  applyHit(attacker, msg) {
    const targetId = msg.targetId != null ? String(msg.targetId) : '';
    if (!targetId || !this.players.has(targetId)) return;
    if (targetId === attacker.id) return;
    const hitMsg = {
      type: Msg.HIT,
      targetId,
      by: attacker.id,
      damage: typeof msg.damage === 'number' ? msg.damage : undefined,
      part: typeof msg.part === 'string' ? msg.part : undefined,
    };
    this.deliver(hitMsg);
    this.broadcast(hitMsg);
  }

  applyKill(reporter, msg) {
    const victimId = String(msg.victimId || reporter.id);
    if (victimId !== reporter.id) return;
    if (!this.players.has(victimId)) return;
    const killerId =
      msg.killerId != null && String(msg.killerId) !== victimId
        ? String(msg.killerId)
        : '';
    const killMsg = {
      type: Msg.KILL,
      killerId: killerId || null,
      victimId,
    };
    this.deliver(killMsg);
    this.broadcast(killMsg);
  }

  applyState(player, msg) {
    const now = Date.now();
    if (now - player.lastState < TICK_MS * 0.5) return;
    player.lastState = now;
    if (typeof msg.x === 'number') player.x = msg.x;
    if (typeof msg.y === 'number') player.y = msg.y;
    if (typeof msg.z === 'number') player.z = msg.z;
    if (typeof msg.yaw === 'number') player.yaw = msg.yaw;
    if (typeof msg.pitch === 'number') player.pitch = msg.pitch;
    if (typeof msg.mode === 'string') player.mode = msg.mode;
    if (typeof msg.name === 'string') {
      player.name = msg.name.slice(0, MAX_NAME_LEN) || player.name;
    }
    if (typeof msg.dead === 'boolean') player.dead = msg.dead;
    const stateMsg = {
      type: Msg.STATE,
      id: player.id,
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
      mode: player.mode,
      name: player.name,
      dead: !!player.dead,
    };
    // Host is not a WebRTC peer — apply remote player motion locally.
    if (player.id !== this.localId) this.deliver(stateMsg);
    this.broadcast(stateMsg, player.peerId || undefined);
  }

  applyBlock(msg, byId) {
    const { x, y, z, id: blockId } = msg;
    if (![x, y, z, blockId].every((v) => Number.isFinite(v))) return;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const bid = blockId | 0;
    if (!inWorldBlock(ix, iy, iz)) return;
    const key = blockKey(ix, iy, iz);
    if (bid === 0) this.blocks.delete(key);
    else this.blocks.set(key, bid);
    const blockMsg = { type: Msg.BLOCK, x: ix, y: iy, z: iz, id: bid, by: byId };
    // Client already applied locally; host must apply guests' edits.
    if (byId !== this.localId) this.deliver(blockMsg);
    this.broadcast(blockMsg);
  }
}
