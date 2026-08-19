import { MAX_NAME_LEN } from '../net/protocol.js';

const STORAGE_KEY = 'blockstrike.config';

const DEFAULTS = {
  songVolume: 0.35,
  playerName: 'Player',
};

export class GameConfig {
  constructor() {
    this.values = { ...DEFAULTS };
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.songVolume === 'number') {
        this.values.songVolume = clamp01(parsed.songVolume);
      }
      if (typeof parsed.playerName === 'string') {
        this.values.playerName = sanitizeName(parsed.playerName);
      }
    } catch {
      // ignore corrupt storage
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      // ignore quota / private mode
    }
  }

  get songVolume() {
    return this.values.songVolume;
  }

  setSongVolume(value) {
    this.values.songVolume = clamp01(value);
    this.save();
    this.emit();
  }

  get playerName() {
    return this.values.playerName;
  }

  setPlayerName(value) {
    this.values.playerName = sanitizeName(value);
    this.save();
    this.emit();
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) {
      listener(this.values);
    }
  }
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function sanitizeName(value) {
  const cleaned = String(value || '')
    .replace(/[^\w\s\-_.]/g, '')
    .trim()
    .slice(0, MAX_NAME_LEN);
  return cleaned || DEFAULTS.playerName;
}

export const gameConfig = new GameConfig();
