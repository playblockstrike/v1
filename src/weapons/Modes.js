export const Mode = {
  CONSTRUCTOR: 'constructor',
  AK: 'ak',
  PISTOL: 'pistol',
  SNIPER: 'sniper',
};

/** Slot 1 / 2 / 3 / 4 */
export const MODE_ORDER = [Mode.CONSTRUCTOR, Mode.AK, Mode.PISTOL, Mode.SNIPER];

export const MODE_LABELS = {
  [Mode.CONSTRUCTOR]: 'Constructor',
  [Mode.AK]: 'AK-47',
  [Mode.PISTOL]: 'Pistol',
  [Mode.SNIPER]: 'Sniper',
};

export const WEAPON_STATS = {
  [Mode.AK]: {
    automatic: true,
    cooldown: 0.098,
    recoil: 1.45,
    pitch: 0.76,
    spread: 0.01,
    spreadBloom: 0.095,
    bloomMax: 1,
    bloomPerShot: 0.09,
    bloomRecover: 2.2,
    magSize: 30,
    reloadTime: 2,
    blockHits: 3,
    damage: { head: 100, body: 15, arm: 10, leg: 10 },
  },
  [Mode.PISTOL]: {
    automatic: false,
    cooldown: 0.22,
    recoil: 1,
    pitch: 1,
    blockHits: 1,
  },
  [Mode.SNIPER]: {
    automatic: false,
    cooldown: 0.15,
    recoil: 2.2,
    pitch: 0.42,
    magSize: 1,
    reloadTime: 2,
    blockHits: 1,
    requiresScope: true,
    scopeFov: 17,
    lookScale: 0.28,
    bulletSpeed: 220,
    damage: { head: 100, body: 100, arm: 100, leg: 100 },
  },
};

export function isGunMode(mode) {
  return mode === Mode.AK || mode === Mode.PISTOL || mode === Mode.SNIPER;
}

export function weaponDamage(mode, part, fallback) {
  const table = WEAPON_STATS[mode]?.damage;
  if (table && part in table) return table[part];
  return fallback;
}
