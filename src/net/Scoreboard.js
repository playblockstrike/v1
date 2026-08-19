/**
 * Match kill/death tracker shared by HUD scoreboard.
 */
export class Scoreboard {
  constructor() {
    /** @type {Map<string, { id: string, name: string, kills: number, deaths: number }>} */
    this.entries = new Map();
    this.onChange = null;
  }

  reset() {
    this.entries.clear();
    this.emit();
  }

  ensure(id, name) {
    if (!id) return null;
    const key = String(id);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { id: key, name: name || `Player${key}`, kills: 0, deaths: 0 };
      this.entries.set(key, entry);
      this.emit();
    } else if (name && entry.name !== name) {
      entry.name = name;
      this.emit();
    }
    return entry;
  }

  setName(id, name) {
    const entry = this.ensure(id, name);
    if (entry && name) {
      entry.name = name;
      this.emit();
    }
  }

  remove(id) {
    if (this.entries.delete(String(id))) this.emit();
  }

  addKill(killerId, victimId) {
    if (killerId) {
      const killer = this.ensure(killerId);
      killer.kills += 1;
    }
    if (victimId) {
      const victim = this.ensure(victimId);
      victim.deaths += 1;
    }
    this.emit();
  }

  list() {
    return [...this.entries.values()].sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.name.localeCompare(b.name);
    });
  }

  emit() {
    this.onChange?.(this.list());
  }
}
