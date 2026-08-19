import { selfId, joinRoom } from 'trystero';
import { Msg, TICK_MS, MAX_NAME_LEN, MAX_PLAYERS } from './protocol.js';
import { RemotePlayer } from './RemotePlayer.js';
import { HostAuthority } from './HostAuthority.js';
import { Scoreboard } from './Scoreboard.js';
import { TRYSTERO_CONFIG, gameRoomId, randomSessionId, shortSessionId } from './config.js';

const PING_INTERVAL_MS = 2000;

export class Network {
  constructor({
    scene,
    world,
    audio,
    onStatus,
    onPlayerCount,
    onHostLeft,
    onJoinFailed,
    onHit,
    onKill,
    onScoreboard,
  }) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.onStatus = onStatus || (() => {});
    this.onPlayerCount = onPlayerCount || (() => {});
    this.onHostLeft = onHostLeft || (() => {});
    this.onJoinFailed = onJoinFailed || this.onHostLeft;
    this.onHit = onHit || (() => {});
    this.onKill = onKill || (() => {});
    this.scoreboard = new Scoreboard();
    this.scoreboard.onChange = (list) => (onScoreboard || (() => {}))(list);
    this.id = null;
    this.seed = null;
    this.remotes = new Map();
    this.connected = false;
    this.isHost = false;
    this.sessionId = null;
    this.hostPeerId = null;
    this.room = null;
    this.msg = null;
    this.authority = null;
    this.lastSend = 0;
    this.colorIndex = 0;
    this.onRemoteShot = null;
    this.localName = '';
    this.pendingName = '';
    this.mapId = null;
    /** @type {number|null} */
    this.pingMs = null;
    this.pingTimer = null;
    this.pinging = false;
  }

  async host(playerName = 'Host', mapId = 'fy_pool_day') {
    this.teardownRoom();
    this.scoreboard.reset();
    this.isHost = true;
    this.sessionId = randomSessionId();
    this.hostPeerId = selfId;
    this.mapId = mapId || 'fy_pool_day';
    this.pendingName = String(playerName).slice(0, MAX_NAME_LEN) || 'Host';
    this.onStatus('Starting match…');

    this.room = joinRoom(TRYSTERO_CONFIG, gameRoomId(this.sessionId));
    this.msg = this.room.makeAction('msg');

    this.authority = new HostAuthority({
      sendTo: (peerId, data) => this.msg.send(data, { target: peerId }),
      broadcast: (data, exceptPeerId) => {
        const peers = Object.keys(this.room.getPeers());
        for (const peerId of peers) {
          if (peerId === exceptPeerId) continue;
          this.msg.send(data, { target: peerId });
        }
      },
      deliver: (data) => this.handle(data),
      onPlayerCount: (n) => {
        this.onPlayerCount(n);
        this.refreshStatus();
      },
      mapId: this.mapId,
    });

    this.msg.onMessage = (data, { peerId }) => {
      this.authority.handleMessage(peerId, data);
    };

    this.room.onPeerJoin = (peerId) => {
      this.authority.handlePeerJoin(peerId);
      this.measurePing();
    };

    this.room.onPeerLeave = (peerId) => {
      this.authority.handlePeerLeave(peerId);
      if (!Object.keys(this.room.getPeers()).length) {
        this.pingMs = null;
        this.refreshStatus();
      } else {
        this.measurePing();
      }
    };

    const welcome = this.authority.createLocalHost(this.pendingName);
    this.handle(welcome);
    this.connected = true;
    this.startPingLoop();
    this.refreshStatus();
    return {
      sessionId: this.sessionId,
      hostId: selfId,
      mapId: this.mapId,
    };
  }

  async join(session, playerName = 'Player') {
    this.teardownRoom();
    this.scoreboard.reset();
    this.isHost = false;
    this.sessionId = session.sessionId;
    this.hostPeerId = session.hostId;
    this.mapId = session.mapId || 'fy_pool_day';
    this.pendingName = String(playerName).slice(0, MAX_NAME_LEN) || 'Player';
    this.onStatus(`Joining ${shortSessionId(this.sessionId)}…`);

    this.room = joinRoom(TRYSTERO_CONFIG, gameRoomId(this.sessionId));
    this.msg = this.room.makeAction('msg');

    this.msg.onMessage = (data, { peerId }) => {
      if (peerId !== this.hostPeerId) return;
      this.handle(data);
    };

    this.room.onPeerLeave = (peerId) => {
      if (peerId !== this.hostPeerId) return;
      this.onStatus('Host left the match');
      this.connected = false;
      this.clearRemotes();
      this.teardownRoom();
      this.onHostLeft();
    };

    this.room.onPeerJoin = (peerId) => {
      if (peerId === this.hostPeerId) {
        this.onStatus('Connected — waiting for welcome…');
      }
    };
  }

  handle(msg) {
    switch (msg.type) {
      case Msg.FULL:
        this.connected = false;
        this.clearRemotes();
        this.teardownRoom();
        this.onJoinFailed(`Match is full (${msg.max || MAX_PLAYERS} players)`);
        break;
      case Msg.WELCOME:
        this.id = msg.id;
        this.seed = msg.seed;
        if (msg.mapId) this.mapId = msg.mapId;
        this.localName = this.pendingName || msg.name || '';
        this.connected = true;
        this.scoreboard.ensure(this.id, this.localName);
        for (const p of msg.players || []) this.addRemote(p);
        for (const b of msg.blocks || []) {
          this.world.setBlock(b.x, b.y, b.z, b.id);
        }
        this.onPlayerCount(this.remotes.size + 1);
        this.startPingLoop();
        this.refreshStatus();
        this.measurePing();
        break;
      case Msg.JOIN:
        this.addRemote(msg.player);
        break;
      case Msg.LEAVE:
        this.removeRemote(msg.id);
        break;
      case Msg.STATE: {
        const remote = this.remotes.get(msg.id);
        if (remote) {
          remote.applyState(msg);
          if (typeof msg.name === 'string') {
            this.scoreboard.setName(msg.id, msg.name);
          }
        }
        break;
      }
      case Msg.BLOCK:
        if (msg.by === this.id) break;
        this.world.setBlock(msg.x, msg.y, msg.z, msg.id);
        break;
      case Msg.SHOT:
        if (msg.id === this.id) break;
        this.onRemoteShot?.(msg);
        break;
      case Msg.HIT:
        if (String(msg.targetId) === String(this.id)) {
          this.onHit(msg);
        }
        break;
      case Msg.KILL: {
        const killerId = msg.killerId != null ? String(msg.killerId) : '';
        const victimId = msg.victimId != null ? String(msg.victimId) : '';
        this.scoreboard.addKill(killerId, victimId);
        this.onKill?.({
          killerId,
          victimId,
          isLocalKill: killerId === String(this.id),
          isLocalDeath: victimId === String(this.id),
        });
        break;
      }
      default:
        break;
    }
  }

  statusBase() {
    const n = this.remotes.size + (this.id ? 1 : 0);
    if (this.isHost) {
      return `Hosting · ${n}/${MAX_PLAYERS} player${n === 1 ? '' : 's'}`;
    }
    if (this.localName) {
      return n > 1
        ? `Online · ${n}/${MAX_PLAYERS} players · ${this.localName}`
        : `Joined · ${this.localName}`;
    }
    return `Online · ${n}/${MAX_PLAYERS} players`;
  }

  refreshStatus() {
    if (!this.connected) return;
    const peers = this.room ? Object.keys(this.room.getPeers()) : [];
    if (!peers.length) {
      this.onStatus(this.statusBase());
      return;
    }
    const ping =
      this.pingMs == null ? '…' : `${Math.round(this.pingMs)} ms`;
    this.onStatus(`${this.statusBase()} · ping ${ping}`);
  }

  startPingLoop() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.measurePing(), PING_INTERVAL_MS);
  }

  stopPingLoop() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
    this.pinging = false;
    this.pingMs = null;
  }

  async measurePing() {
    if (!this.connected || !this.room || this.pinging) return;

    const peers = this.isHost
      ? Object.keys(this.room.getPeers())
      : this.hostPeerId && this.room.getPeers()[this.hostPeerId]
        ? [this.hostPeerId]
        : [];

    if (!peers.length) {
      this.pingMs = null;
      this.refreshStatus();
      return;
    }

    this.pinging = true;
    try {
      const samples = await Promise.all(
        peers.map((peerId) =>
          this.room.ping(peerId).catch(() => null)
        )
      );
      const valid = samples.filter((ms) => typeof ms === 'number' && Number.isFinite(ms));
      if (valid.length) {
        this.pingMs = valid.reduce((a, b) => a + b, 0) / valid.length;
      }
      this.refreshStatus();
    } finally {
      this.pinging = false;
    }
  }

  addRemote(data) {
    if (!data?.id || data.id === this.id || this.remotes.has(data.id)) return;
    const remote = new RemotePlayer(this.scene, data, this.colorIndex++);
    this.remotes.set(data.id, remote);
    this.scoreboard.ensure(data.id, data.name);
    this.onPlayerCount(this.remotes.size + 1);
    this.refreshStatus();
  }

  removeRemote(id) {
    const remote = this.remotes.get(id);
    if (!remote) return;
    remote.dispose(this.scene);
    this.remotes.delete(id);
    this.scoreboard.remove(id);
    this.onPlayerCount(this.remotes.size + (this.id ? 1 : 0));
    this.refreshStatus();
  }

  clearRemotes() {
    for (const remote of this.remotes.values()) {
      remote.dispose(this.scene);
    }
    this.remotes.clear();
  }

  send(data) {
    if (!this.connected && !this.isHost) return;
    if (this.isHost && this.authority) {
      this.authority.handleLocal(data);
      return;
    }
    if (!this.msg || !this.hostPeerId) return;
    this.msg.send(data, { target: this.hostPeerId });
  }

  sendState(player, mode) {
    if (!this.connected) return;
    const now = performance.now();
    if (now - this.lastSend < TICK_MS) return;
    this.lastSend = now;
    const name = this.localName || this.pendingName || undefined;
    this.send({
      type: Msg.STATE,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      yaw: player.yaw,
      pitch: player.pitch,
      mode,
      dead: !!player.dead,
      name,
    });
  }

  sendBlock(x, y, z, id) {
    if (!this.connected) return;
    this.send({ type: Msg.BLOCK, x, y, z, id });
  }

  sendShot(origin, direction) {
    if (!this.connected) return;
    this.send({
      type: Msg.SHOT,
      ox: origin.x,
      oy: origin.y,
      oz: origin.z,
      dx: direction.x,
      dy: direction.y,
      dz: direction.z,
    });
  }

  sendHit(targetId, damage, part) {
    if (!this.connected || targetId == null) return;
    this.send({
      type: Msg.HIT,
      targetId: String(targetId),
      damage,
      part: part || undefined,
    });
  }

  sendKill(killerId) {
    if (!this.connected || !this.id) return;
    this.send({
      type: Msg.KILL,
      victimId: String(this.id),
      killerId: killerId != null ? String(killerId) : null,
    });
  }

  update(dt, camera, renderer) {
    for (const remote of this.remotes.values()) {
      remote.update(dt, camera, renderer);
    }
  }

  leaveMatch() {
    this.connected = false;
    this.id = null;
    this.localName = '';
    this.pendingName = '';
    this.scoreboard.reset();
    this.clearRemotes();
    this.teardownRoom();
    this.onStatus('Left match — host or join again');
  }

  teardownRoom() {
    this.stopPingLoop();
    this.authority = null;
    this.msg = null;
    try {
      this.room?.leave();
    } catch {
      /* ignore */
    }
    this.room = null;
    this.isHost = false;
    this.sessionId = null;
    this.hostPeerId = null;
  }

  get playerCount() {
    return this.remotes.size + (this.id ? 1 : 0);
  }
}
