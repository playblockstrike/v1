import { BlockId } from '../blocks/BlockTypes.js';

const SURFACE = {
  soft: { freq: 180, filter: 600, decay: 0.08, noise: 0.35, type: 'noise' },
  grass: { freq: 220, filter: 900, decay: 0.1, gain: 0.28, type: 'grass' },
  dirt: { freq: 160, filter: 500, decay: 0.09, gain: 0.32, type: 'noise' },
  sand: { freq: 320, filter: 1400, decay: 0.07, gain: 0.22, type: 'sand' },
  stone: { freq: 90, filter: 2200, decay: 0.06, gain: 0.4, type: 'hard' },
  wood: { freq: 140, filter: 1100, decay: 0.08, gain: 0.34, type: 'wood' },
  leaves: { freq: 400, filter: 1800, decay: 0.09, gain: 0.2, type: 'leaves' },
};

const BLOCK_SURFACE = {
  [BlockId.GRASS]: 'grass',
  [BlockId.DIRT]: 'dirt',
  [BlockId.STONE]: 'stone',
  [BlockId.COBBLE]: 'stone',
  [BlockId.SAND]: 'sand',
  [BlockId.WOOD]: 'wood',
  [BlockId.LEAVES]: 'leaves',
  [BlockId.TILE_WHITE]: 'stone',
  [BlockId.TILE_RED]: 'stone',
  [BlockId.TILE_BLUE]: 'stone',
  [BlockId.TILE_PINK]: 'stone',
  [BlockId.TILE_CYAN]: 'stone',
  [BlockId.TILE_NAVY]: 'stone',
  [BlockId.CONCRETE]: 'stone',
  [BlockId.LOCKER]: 'wood',
  [BlockId.GLASS]: 'stone',
  [BlockId.ASPHALT]: 'stone',
  [BlockId.BRICK]: 'stone',
  [BlockId.METAL]: 'wood',
  [BlockId.PAINT]: 'stone',
};

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.started = false;
    this.musicPlaying = false;
    this.stepTimer = 0;
    this.musicNodes = [];
    this.musicBuffer = null;
    this.musicSource = null;
    this.glockBuffer = null;
    this.musicVolume = 0.35;
    /** Background music is 70% quieter than the slider value. */
    this.musicGainScale = 0.3;
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    if (this.music) {
      this.music.gain.value = this.musicVolume * this.musicGainScale;
    }
  }

  async ensureStarted() {
    if (this._startPromise) return this._startPromise;

    this._startPromise = (async () => {
      if (this.started && this.ctx) {
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        return;
      }

      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);

      this.sfx = this.ctx.createGain();
      // Game SFX ~30% louder than before
      this.sfx.gain.value = 0.9 * 1.3;
      this.sfx.connect(this.master);

      this.music = this.ctx.createGain();
      this.music.gain.value = this.musicVolume * this.musicGainScale;
      this.music.connect(this.master);

      const [shot, music] = await Promise.all([
        this.loadAudioBuffer(`${import.meta.env.BASE_URL}sounds/glock-shot.mp3`, true),
        this.loadAudioBuffer(`${import.meta.env.BASE_URL}sounds/action-music.mp3`, false),
      ]);
      this.glockBuffer = shot || this.buildGlock9mmBuffer();
      this.musicBuffer = music;
      this.started = true;
      this.startMusic();
    })();

    try {
      await this._startPromise;
    } finally {
      // keep promise so later calls reuse the resolved state
    }
  }

  async loadAudioBuffer(url, required = false) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      const data = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(data);
    } catch (err) {
      console.warn(`Could not load audio ${url}:`, err);
      if (required) return null;
      return null;
    }
  }

  /**
   * Fallback procedural Glock-like buffer if the MP3 fails to load.
   */
  buildGlock9mmBuffer() {
    const sr = this.ctx.sampleRate;
    const duration = 0.55;
    const n = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(2, n, sr);
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);

    let slidePhase = 0;
    let boomPhase = 0;
    let crackPhase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const noise = Math.random() * 2 - 1;

      const crackEnv = Math.exp(-t * 220) * (t < 0.02 ? 1 : Math.exp(-(t - 0.02) * 40));
      crackPhase += (4200 + noise * 800) / sr;
      const crack =
        noise * 0.85 * crackEnv +
        Math.sin(crackPhase * Math.PI * 2) * 0.25 * crackEnv;

      const boomEnv = Math.exp(-t * 18) * (1 - Math.exp(-t * 400));
      boomPhase += (95 + 40 * Math.exp(-t * 30)) / sr;
      const boom =
        Math.sin(boomPhase * Math.PI * 2) * 0.7 * boomEnv +
        Math.sin(boomPhase * 2.1 * Math.PI * 2) * 0.2 * boomEnv +
        noise * 0.15 * boomEnv;

      const midEnv = Math.exp(-t * 55);
      const mid = noise * midEnv * 0.35 * (t < 0.08 ? 1 : 0.3);

      let slide = 0;
      if (t > 0.022) {
        const st = t - 0.022;
        const slideEnv = Math.exp(-st * 28) * (1 - Math.exp(-st * 200));
        slidePhase += (1850 + Math.sin(st * 40) * 120) / sr;
        slide =
          Math.sin(slidePhase * Math.PI * 2) * 0.22 * slideEnv +
          Math.sin(slidePhase * 2.7 * Math.PI * 2) * 0.08 * slideEnv +
          noise * 0.05 * slideEnv;
      }

      let brass = 0;
      if (t > 0.065 && t < 0.14) {
        const bt = t - 0.065;
        const brassEnv = Math.exp(-bt * 45);
        brass = noise * brassEnv * 0.08 + Math.sin(bt * 5200 * Math.PI * 2) * 0.04 * brassEnv;
      }

      const tailEnv = Math.exp(-t * 6) * 0.12;
      const tail = noise * tailEnv * (t > 0.04 ? 1 : 0);

      let sample = crack * 0.55 + boom * 0.9 + mid * 0.7 + slide * 1.1 + brass + tail;
      sample = Math.tanh(sample * 1.4);

      L[i] = sample * 0.95;
      R[i] = sample * 0.88 + noise * 0.04 * Math.exp(-t * 10);
    }

    return buffer;
  }

  playShot(volume = 1, rate = 1) {
    if (!this.started || !this.glockBuffer) return;
    const now = this.ctx.currentTime;

    const source = this.ctx.createBufferSource();
    source.buffer = this.glockBuffer;
    source.playbackRate.value = (0.97 + Math.random() * 0.06) * rate;

    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.5;

    source.connect(gain);
    gain.connect(this.sfx);
    source.start(now);
  }

  /** Quieter distance-based gunshot for bot firefights. */
  playSpatialShot(listenerPos, shotPos, rate = 1) {
    if (!this.started || !listenerPos || !shotPos) return;
    const dx = shotPos.x - listenerPos.x;
    const dy = shotPos.y - listenerPos.y;
    const dz = shotPos.z - listenerPos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 48) return;
    const volume = Math.max(0.06, 0.42 * (1 - dist / 48));
    this.playShot(volume, rate);
  }

  playHit(volume = 0.35) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this.noiseBurst(now, 0.06, volume, 2200, 0.8);
    this.tone(now, 'square', 180, 0.05, volume * 0.4);
  }

  playReload() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this.tone(now, 'square', 160, 0.07, 0.12);
    this.noiseBurst(now + 0.05, 0.08, 0.12, 1400, 0.6);
    this.tone(now + 0.18, 'triangle', 90, 0.1, 0.1);
  }

  playSpatialHit(listenerPos, hitPos) {
    if (!this.started || !listenerPos || !hitPos) return;
    const dist = Math.hypot(
      hitPos.x - listenerPos.x,
      hitPos.y - listenerPos.y,
      hitPos.z - listenerPos.z
    );
    if (dist > 40) return;
    this.playHit(Math.max(0.08, 0.4 * (1 - dist / 40)));
  }

  surfaceForBlock(blockId) {
    return BLOCK_SURFACE[blockId] || 'soft';
  }

  playFootstep(blockId, sprint = false) {
    if (!this.started) return;
    const key = this.surfaceForBlock(blockId);
    const preset = SURFACE[key] || SURFACE.soft;
    const now = this.ctx.currentTime;
    const rate = sprint ? 1.15 : 1;

    if (preset.type === 'hard') {
      this.noiseBurst(now, preset.decay, preset.gain * rate, preset.filter, 0.4);
      this.tone(now, 'triangle', preset.freq * rate, preset.decay * 0.8, preset.gain * 0.35);
    } else if (preset.type === 'grass') {
      this.noiseBurst(now, preset.decay, preset.gain, preset.filter, 1.2);
      this.noiseBurst(now + 0.015, 0.04, preset.gain * 0.5, 2500, 0.8);
    } else if (preset.type === 'sand') {
      this.noiseBurst(now, preset.decay, preset.gain, preset.filter, 2.5);
    } else if (preset.type === 'wood') {
      this.tone(now, 'triangle', preset.freq, preset.decay, preset.gain * 0.5);
      this.noiseBurst(now, preset.decay * 0.7, preset.gain * 0.45, preset.filter, 0.6);
    } else if (preset.type === 'leaves') {
      this.noiseBurst(now, preset.decay, preset.gain, preset.filter, 3);
    } else {
      this.noiseBurst(now, preset.decay, preset.gain, preset.filter, 0.9);
    }
  }

  playImpact() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this.noiseBurst(now, 0.08, 0.4, 1800, 0.5);
    this.tone(now, 'triangle', 70, 0.1, 0.25);
  }

  playBreak(blockId) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const key = this.surfaceForBlock(blockId);
    if (key === 'wood' || key === 'leaves') {
      this.noiseBurst(now, 0.12, 0.45, 2200, 1.4);
      this.tone(now, 'triangle', 180, 0.1, 0.2);
    } else if (key === 'stone') {
      this.noiseBurst(now, 0.1, 0.55, 3000, 0.35);
      this.tone(now, 'square', 90, 0.08, 0.25);
    } else if (key === 'sand') {
      this.noiseBurst(now, 0.14, 0.35, 2500, 2);
    } else {
      this.noiseBurst(now, 0.11, 0.4, 1600, 0.8);
      this.tone(now, 'triangle', 140, 0.09, 0.18);
    }
  }

  playPlace(blockId) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const key = this.surfaceForBlock(blockId);
    const base = key === 'stone' ? 100 : key === 'wood' ? 160 : key === 'sand' ? 220 : 130;
    this.tone(now, 'triangle', base, 0.08, 0.3);
    this.noiseBurst(now, 0.05, 0.25, 1200, 0.6);
  }

  playModeSwitch() {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this.tone(now, 'sine', 520, 0.05, 0.12);
    this.tone(now + 0.05, 'sine', 680, 0.06, 0.1);
  }

  updateFootsteps(dt, { moving, onGround, sprint, blockId }) {
    if (!this.started || !moving || !onGround) {
      this.stepTimer = 0;
      return;
    }

    const interval = sprint ? 0.28 : 0.38;
    this.stepTimer += dt;
    if (this.stepTimer >= interval) {
      this.stepTimer = 0;
      this.playFootstep(blockId, sprint);
    }
  }

  noiseBurst(when, duration, gainValue, filterFreq, Q = 1) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = Q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  tone(when, type, freq, duration, gainValue) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), when + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  startMusic() {
    if (this.musicPlaying || !this.ctx || !this.musicBuffer) return;
    this.musicPlaying = true;

    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // already stopped
      }
      this.musicSource.disconnect();
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.musicBuffer;
    source.loop = true;
    source.connect(this.music);
    source.start(0);
    this.musicSource = source;
  }

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._musicTimer);
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // already stopped
      }
      this.musicSource.disconnect();
      this.musicSource = null;
    }
  }
}
