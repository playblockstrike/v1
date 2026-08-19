import { joinRoom, selfId } from 'trystero';
import { TRYSTERO_CONFIG, LOBBY_ROOM } from './config.js';

const ANNOUNCE_MS = 2500;
const STALE_MS = 8000;

/**
 * Serverless match browser: hosts announce open sessions; everyone else lists them.
 */
export class Lobby {
  constructor({ onSessions, onStatus } = {}) {
    this.onSessions = onSessions || (() => {});
    this.onStatus = onStatus || (() => {});
    /** @type {Map<string, object>} */
    this.sessions = new Map();
    this.room = null;
    this.announce = null;
    this.hosting = null;
    this.announceTimer = null;
    this.pruneTimer = null;
  }

  connect() {
    this.onStatus('Finding sessions…');
    this.room = joinRoom(TRYSTERO_CONFIG, LOBBY_ROOM);
    this.announce = this.room.makeAction('session');

    this.announce.onMessage = (data, { peerId }) => {
      if (!data?.sessionId || typeof data.sessionId !== 'string') return;
      this.sessions.set(data.sessionId, {
        sessionId: data.sessionId,
        players: Math.max(1, Number(data.players) || 1),
        mapId: typeof data.mapId === 'string' ? data.mapId : 'fy_pool_day',
        mapName: typeof data.mapName === 'string' ? data.mapName : 'Pool',
        hostId: peerId,
        updatedAt: Date.now(),
      });
      this.emit();
    };

    this.room.onPeerLeave = (peerId) => {
      let changed = false;
      for (const [id, session] of this.sessions) {
        if (session.hostId !== peerId) continue;
        this.sessions.delete(id);
        changed = true;
      }
      if (changed) this.emit();
    };

    this.pruneTimer = setInterval(() => this.prune(), 2000);
    this.onStatus('Ready — host or join a match');
  }

  prune() {
    const now = Date.now();
    let changed = false;
    for (const [id, session] of this.sessions) {
      if (now - session.updatedAt <= STALE_MS) continue;
      this.sessions.delete(id);
      changed = true;
    }
    if (changed) this.emit();
  }

  emit() {
    const list = [...this.sessions.values()]
      .filter((s) => s.hostId !== selfId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    this.onSessions(list);
  }

  startHosting({ sessionId, players = 1, mapId, mapName }) {
    this.hosting = {
      sessionId,
      players,
      mapId: mapId || 'fy_pool_day',
      mapName: mapName || 'Pool',
    };
    const tick = () => {
      if (!this.hosting || !this.announce) return;
      this.announce.send({
        sessionId: this.hosting.sessionId,
        players: this.hosting.players,
        mapId: this.hosting.mapId,
        mapName: this.hosting.mapName,
      });
    };
    tick();
    clearInterval(this.announceTimer);
    this.announceTimer = setInterval(tick, ANNOUNCE_MS);
  }

  updateHosting(partial) {
    if (!this.hosting) return;
    Object.assign(this.hosting, partial);
  }

  stopHosting() {
    clearInterval(this.announceTimer);
    this.announceTimer = null;
    this.hosting = null;
  }

  dispose() {
    this.stopHosting();
    clearInterval(this.pruneTimer);
    this.pruneTimer = null;
    try {
      this.room?.leave();
    } catch {
      /* ignore */
    }
    this.room = null;
    this.sessions.clear();
  }
}
