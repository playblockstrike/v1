import { MODE_LABELS, MODE_ORDER, Mode, isGunMode } from '../weapons/Modes.js';
import { shortSessionId } from '../net/config.js';
import { gameConfig, sanitizeName } from '../config/GameConfig.js';
import { MAX_NAME_LEN, MAX_PLAYERS } from '../net/protocol.js';
import { DEFAULT_MAP_ID, mapList, mapName } from '../world/maps.js';

export class HUD {
  constructor({ onPlay, onHost, onJoin, onLeave } = {}) {
    this.onPlay = onPlay || (() => {});
    this.onHost = onHost || (() => {});
    this.onJoin = onJoin || (() => {});
    this.onLeave = onLeave || (() => {});
    this.inSession = false;
    this.hitMarkerTimer = 0;

    this.overlay = document.createElement('div');
    this.overlay.id = 'overlay';
    this.overlay.innerHTML = `
      <h1>Blockstrike</h1>
      <p class="tagline">Host a match in your browser — anyone can join</p>

      <div id="lobby-panel" class="lobby-panel">
        <label class="name-row" for="player-name">
          <span>Player name</span>
          <input
            id="player-name"
            type="text"
            maxlength="${MAX_NAME_LEN}"
            placeholder="Your name"
            autocomplete="username"
          />
        </label>

        <label class="name-row" for="map-select">
          <span>Map</span>
          <select id="map-select"></select>
        </label>

        <div class="host-row">
          <button type="button" class="play-button host-button">Host match</button>
        </div>

        <div class="sessions-header">
          <span>Active sessions</span>
          <span id="sessions-hint" class="sessions-hint">Searching…</span>
        </div>
        <ul id="session-list" class="session-list"></ul>
      </div>

      <div id="play-panel" class="play-panel hidden">
        <p id="session-label" class="session-label"></p>
        <button type="button" class="play-button">Click to play</button>
        <button type="button" class="leave-button">Leave match</button>
        <p class="controls-hint">
          1–4 switch tools · Constructor: scroll materials · Guns: LMB fire · Sniper: RMB scope · Tab scoreboard
        </p>
      </div>
    `;

    this.lobbyPanel = this.overlay.querySelector('#lobby-panel');
    this.playPanel = this.overlay.querySelector('#play-panel');
    this.playerNameInput = this.overlay.querySelector('#player-name');
    this.mapSelect = this.overlay.querySelector('#map-select');
    this.sessionList = this.overlay.querySelector('#session-list');
    this.sessionsHint = this.overlay.querySelector('#sessions-hint');
    this.sessionLabel = this.overlay.querySelector('#session-label');
    this.playButton = this.overlay.querySelector('.play-panel .play-button');
    this.hostButton = this.overlay.querySelector('.host-button');
    this.leaveButton = this.overlay.querySelector('.leave-button');

    this.playerNameInput.value = gameConfig.playerName;
    this.playerNameInput.addEventListener('change', () => {
      gameConfig.setPlayerName(this.playerNameInput.value);
      this.playerNameInput.value = gameConfig.playerName;
    });
    this.playerNameInput.addEventListener('keydown', (e) => e.stopPropagation());

    for (const map of mapList()) {
      const opt = document.createElement('option');
      opt.value = map.id;
      opt.textContent = map.name;
      this.mapSelect.appendChild(opt);
    }
    this.mapSelect.value = DEFAULT_MAP_ID;

    this.hostButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onHost(this.getPlayerName(), this.getSelectedMap());
    });

    this.playButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onPlay();
    });

    this.leaveButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onLeave();
    });

    this.overlay.addEventListener('click', (event) => {
      if (!this.inSession) return;
      if (event.target.closest('button, input, a, .session-list')) return;
      this.onPlay();
    });

    this.lobbyPanel.addEventListener('click', (e) => e.stopPropagation());
    this.lobbyPanel.addEventListener('mousedown', (e) => e.stopPropagation());

    this.crosshair = document.createElement('div');
    this.crosshair.id = 'crosshair';

    this.scopeOverlay = document.createElement('div');
    this.scopeOverlay.id = 'scope-overlay';
    this.scopeOverlay.className = 'hidden';
    this.scopeOverlay.innerHTML = `
      <div class="scope-lens"></div>
      <div class="scope-reticle">
        <span class="scope-h"></span>
        <span class="scope-v"></span>
        <span class="scope-dot"></span>
      </div>
    `;

    this.hitMarker = document.createElement('div');
    this.hitMarker.id = 'hit-marker';
    this.hitMarker.className = 'hidden';
    this.hitMarker.innerHTML = `
      <span class="hm-line hm-tl"></span>
      <span class="hm-line hm-tr"></span>
      <span class="hm-line hm-bl"></span>
      <span class="hm-line hm-br"></span>
    `;

    this.modeBadge = document.createElement('div');
    this.modeBadge.id = 'mode-badge';

    this.weaponBar = document.createElement('div');
    this.weaponBar.id = 'weapon-bar';
    this.weaponBar.className = 'hidden';
    this.weaponSlots = MODE_ORDER.map((mode, index) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.innerHTML = `
        <span class="weapon-key">${index + 1}</span>
        <span class="weapon-name">${MODE_LABELS[mode]}</span>
      `;
      this.weaponBar.appendChild(slot);
      return slot;
    });

    this.netStatus = document.createElement('div');
    this.netStatus.id = 'net-status';
    this.netStatus.textContent = 'Finding sessions…';

    this.healthBar = document.createElement('div');
    this.healthBar.id = 'health-bar';
    this.healthBar.innerHTML = `
      <div class="health-track">
        <div class="health-fill"></div>
      </div>
      <span class="health-text">100</span>
    `;
    this.healthFill = this.healthBar.querySelector('.health-fill');
    this.healthText = this.healthBar.querySelector('.health-text');

    this.ammoHud = document.createElement('div');
    this.ammoHud.id = 'ammo-hud';
    this.ammoHud.className = 'hidden';
    this.ammoHud.innerHTML = `
      <span class="ammo-count">30</span>
      <span class="ammo-max">/ 30</span>
    `;
    this.ammoCount = this.ammoHud.querySelector('.ammo-count');
    this.ammoMax = this.ammoHud.querySelector('.ammo-max');

    this.reloadBar = document.createElement('div');
    this.reloadBar.id = 'reload-bar';
    this.reloadBar.className = 'hidden';
    this.reloadBar.innerHTML = `
      <span class="reload-label">Reloading</span>
      <div class="reload-track"><div class="reload-fill"></div></div>
    `;
    this.reloadFill = this.reloadBar.querySelector('.reload-fill');

    this.deathBanner = document.createElement('div');
    this.deathBanner.id = 'death-banner';
    this.deathBanner.className = 'hidden';
    this.deathBanner.innerHTML = `
      <div class="death-title">You died</div>
      <div class="death-timer">3</div>
      <div class="death-sub">Respawning</div>
    `;
    this.deathTimer = this.deathBanner.querySelector('.death-timer');

    this.scoreboard = document.createElement('div');
    this.scoreboard.id = 'scoreboard';
    this.scoreboard.className = 'hidden';
    this.scoreboard.innerHTML = `
      <div class="scoreboard-title">Scoreboard</div>
      <div class="scoreboard-head">
        <span>Player</span>
        <span>K</span>
        <span>D</span>
      </div>
      <ul class="scoreboard-list"></ul>
      <p class="scoreboard-hint">Hold Tab</p>
    `;
    this.scoreboardList = this.scoreboard.querySelector('.scoreboard-list');

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.scopeOverlay);
    document.body.appendChild(this.crosshair);
    document.body.appendChild(this.hitMarker);
    document.body.appendChild(this.modeBadge);
    document.body.appendChild(this.weaponBar);
    document.body.appendChild(this.netStatus);
    document.body.appendChild(this.healthBar);
    document.body.appendChild(this.ammoHud);
    document.body.appendChild(this.reloadBar);
    document.body.appendChild(this.deathBanner);
    document.body.appendChild(this.scoreboard);
  }

  getSelectedMap() {
    return this.mapSelect?.value || DEFAULT_MAP_ID;
  }

  getPlayerName() {
    const name = sanitizeName(this.playerNameInput.value);
    gameConfig.setPlayerName(name);
    this.playerNameInput.value = name;
    return name;
  }

  setNetStatus(text) {
    this.netStatus.textContent = text;
  }

  setSessions(sessions) {
    this.sessionList.innerHTML = '';
    if (!sessions.length) {
      this.sessionsHint.textContent = 'No open matches — host one!';
      const empty = document.createElement('li');
      empty.className = 'session-empty';
      empty.textContent = 'Waiting for hosts on the network…';
      this.sessionList.appendChild(empty);
      return;
    }

    this.sessionsHint.textContent = `${sessions.length} open`;
    for (const session of sessions) {
      const li = document.createElement('li');
      li.className = 'session-item';

      const info = document.createElement('div');
      info.className = 'session-info';
      const idLabel = shortSessionId(session.sessionId);
      const mapLabel = session.mapName || mapName(session.mapId);
      const count = Math.max(1, Number(session.players) || 1);
      const full = count >= MAX_PLAYERS;
      info.innerHTML = `
        <span class="session-map">${escapeHtml(mapLabel)}</span>
        <span class="session-meta">${escapeHtml(idLabel)} · ${count}/${MAX_PLAYERS} player${count === 1 ? '' : 's'}${full ? ' · Full' : ''}</span>
      `;

      const joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'join-button';
      joinBtn.textContent = full ? 'Full' : 'Join';
      joinBtn.disabled = full;
      if (!full) {
        joinBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          this.onJoin(session, this.getPlayerName());
        });
      }

      li.appendChild(info);
      li.appendChild(joinBtn);
      this.sessionList.appendChild(li);
    }
  }

  setInSession(inSession, { role, sessionId, mapId } = {}) {
    this.inSession = inSession;
    this.lobbyPanel.classList.toggle('hidden', inSession);
    this.playPanel.classList.toggle('hidden', !inSession);
    if (inSession) {
      const roleLabel = role === 'host' ? 'Hosting' : 'Joined';
      const id = shortSessionId(sessionId);
      const map = mapName(mapId);
      this.sessionLabel.textContent = `${roleLabel} · ${map} · ${id}`;
      this.sessionLabel.title = sessionId || '';
    } else {
      this.setScoreboardVisible(false);
    }
  }

  setMode(mode) {
    this.modeBadge.textContent = MODE_LABELS[mode];
    const modeClass =
      mode === Mode.CONSTRUCTOR
        ? 'mode-constructor'
        : mode === Mode.AK
          ? 'mode-ak'
          : mode === Mode.SNIPER
            ? 'mode-sniper'
            : 'mode-shot';
    this.modeBadge.className = modeClass;
    this.crosshair.classList.toggle('crosshair-shot', isGunMode(mode));
    this.crosshair.classList.toggle('crosshair-constructor', mode === Mode.CONSTRUCTOR);
    this.weaponSlots.forEach((slot, i) => {
      slot.classList.toggle('selected', MODE_ORDER[i] === mode);
    });
  }

  setScoped(scoped) {
    this.scopeOverlay.classList.toggle('hidden', !scoped);
    this.crosshair.classList.toggle('hidden', scoped);
  }

  setHealth(current, max = 100) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthText.textContent = String(Math.ceil(current));
    this.healthBar.classList.toggle('health-low', pct <= 30);
    this.healthBar.classList.toggle('health-mid', pct > 30 && pct <= 60);
  }

  setMagazine({ visible = false, ammo = 0, magSize = 0, reloading = false, progress = 0 } = {}) {
    const playing = this.overlay.classList.contains('hidden');
    this.ammoHud.classList.toggle('hidden', !playing || !visible);
    if (playing && visible) {
      this.ammoCount.textContent = String(ammo);
      this.ammoMax.textContent = `/ ${magSize}`;
      this.ammoHud.classList.toggle('ammo-empty', ammo <= 0);
    }
    this.reloadBar.classList.toggle('hidden', !playing || !reloading);
    if (playing && reloading) {
      this.reloadFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    }
  }

  setDeathBanner(secondsLeft) {
    if (secondsLeft == null || secondsLeft <= 0) {
      this.deathBanner.classList.add('hidden');
      return;
    }
    this.deathTimer.textContent = String(Math.ceil(secondsLeft));
    this.deathBanner.classList.remove('hidden');
  }

  showHitMarker({ headshot = false, kill = false } = {}) {
    this.hitMarker.classList.remove('hidden', 'hit-head', 'hit-kill');
    if (kill) this.hitMarker.classList.add('hit-kill');
    else if (headshot) this.hitMarker.classList.add('hit-head');
    this.hitMarkerTimer = kill ? 0.55 : 0.22;
  }

  updateHitMarker(dt) {
    if (this.hitMarkerTimer <= 0) return;
    this.hitMarkerTimer -= dt;
    if (this.hitMarkerTimer <= 0) {
      this.hitMarker.classList.add('hidden');
      this.hitMarker.classList.remove('hit-head', 'hit-kill');
    }
  }

  setScoreboard(entries, localId = null) {
    this.scoreboardList.innerHTML = '';
    if (!entries?.length) {
      const empty = document.createElement('li');
      empty.className = 'scoreboard-empty';
      empty.textContent = 'No players yet';
      this.scoreboardList.appendChild(empty);
      return;
    }
    for (const row of entries) {
      const li = document.createElement('li');
      li.className = 'scoreboard-row';
      if (localId && String(row.id) === String(localId)) {
        li.classList.add('is-local');
      }
      li.innerHTML = `
        <span class="sb-name">${escapeHtml(row.name)}</span>
        <span class="sb-k">${row.kills}</span>
        <span class="sb-d">${row.deaths}</span>
      `;
      this.scoreboardList.appendChild(li);
    }
  }

  setScoreboardVisible(visible) {
    this.scoreboard.classList.toggle('hidden', !visible);
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.weaponBar.classList.remove('hidden');
  }

  showOverlay() {
    this.overlay.classList.remove('hidden');
    this.weaponBar.classList.add('hidden');
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
