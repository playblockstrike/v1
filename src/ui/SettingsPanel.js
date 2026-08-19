import { gameConfig } from '../config/GameConfig.js';

export class SettingsPanel {
  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'settings-panel';
    this.panel.innerHTML = `
      <div class="settings-title">Settings</div>
      <label class="settings-row" for="song-volume">
        <span>Song volume</span>
        <input id="song-volume" type="range" min="0" max="100" step="1" />
        <span class="settings-value" id="song-volume-value">35%</span>
      </label>
    `;

    this.slider = this.panel.querySelector('#song-volume');
    this.valueLabel = this.panel.querySelector('#song-volume-value');

    this.slider.value = String(Math.round(gameConfig.songVolume * 100));
    this.valueLabel.textContent = `${this.slider.value}%`;

    this.slider.addEventListener('input', () => {
      const volume = Number(this.slider.value) / 100;
      gameConfig.setSongVolume(volume);
      this.valueLabel.textContent = `${this.slider.value}%`;
    });

    // Don't start the game when dragging the slider on the overlay
    this.panel.addEventListener('click', (e) => e.stopPropagation());
    this.panel.addEventListener('mousedown', (e) => e.stopPropagation());

    document.body.appendChild(this.panel);
  }

  setVisible(visible) {
    this.panel.classList.toggle('hidden', !visible);
  }
}
