import { Scoreboard } from '../net/Scoreboard.js';
import { Bot, BOT_COUNT, BOT_NAMES } from './Bot.js';

export class SoloMatch {
  constructor({ scene, world, audio, weapons }) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.weapons = weapons;
    this.scoreboard = new Scoreboard();
    this.localId = 'local';
    this.active = false;
    /** @type {Bot[]} */
    this.bots = [];
  }

  get targets() {
    return this.bots.map((bot) => bot.target());
  }

  start(playerName = 'Player', avoidPos = null) {
    this.stop();
    this.active = true;
    this.scoreboard.ensure(this.localId, playerName);
    const avoid = avoidPos ? [{ x: avoidPos.x, z: avoidPos.z }] : [];
    for (let i = 0; i < BOT_COUNT; i++) {
      const spawn = this.pickSpawn(avoid);
      avoid.push(spawn);
      const bot = new Bot({
        scene: this.scene,
        world: this.world,
        id: `bot-${i}`,
        name: BOT_NAMES[i] || `Bot ${i + 1}`,
        colorIndex: i + 1,
        spawn,
      });
      this.bots.push(bot);
      this.scoreboard.ensure(bot.id, bot.name);
    }
  }

  pickSpawn(avoid) {
    let best = this.world.getRandomSpawnPosition();
    let bestDist = -1;
    for (let i = 0; i < 14; i++) {
      const spawn = this.world.getRandomSpawnPosition();
      const dist = avoid.reduce(
        (min, p) => Math.min(min, Math.hypot(spawn.x - p.x, spawn.z - p.z)),
        Infinity
      );
      if (dist > bestDist) {
        best = spawn;
        bestDist = dist;
      }
      if (dist > 12) return spawn;
    }
    return best;
  }

  stop() {
    for (const bot of this.bots) bot.dispose(this.scene);
    this.bots = [];
    this.active = false;
    this.scoreboard.reset();
  }

  hitBot(targetId, damage) {
    const bot = this.bots.find((b) => b.id === targetId);
    if (!bot || bot.dead) return false;
    const killed = bot.takeDamage(damage);
    if (killed) this.scoreboard.addKill(this.localId, bot.id);
    return killed;
  }

  noteLocalDeath(killerId = null) {
    this.scoreboard.addKill(killerId, this.localId);
  }

  noteBotVoid(botId) {
    this.scoreboard.addKill(null, botId);
  }

  update(dt, player, camera, renderer) {
    if (!this.active) return;
    for (const bot of this.bots) {
      const avoid = [];
      if (player && !player.dead) avoid.push(player.position);
      for (const other of this.bots) {
        if (other !== bot && !other.dead) avoid.push(other.position);
      }
      const result = bot.update(dt, player, this.weapons, this.audio, avoid);
      if (result === 'void') this.noteBotVoid(bot.id);
      bot.remote.update(dt, camera, renderer);
    }
  }
}
