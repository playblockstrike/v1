/** Shared Trystero app id — peers only match others with the same value. */
export const TRYSTERO_CONFIG = {
  appId: 'blockstrike-v1',
};

export const LOBBY_ROOM = 'blockstrike-lobby';

export function gameRoomId(sessionId) {
  return `blockstrike-game-${sessionId}`;
}

export function randomSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Short label for UI lists (full UUID still used as room id). */
export function shortSessionId(sessionId) {
  return String(sessionId || '').slice(0, 8);
}
