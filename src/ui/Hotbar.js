import { HOTBAR_BLOCKS } from '../blocks/BlockTypes.js';
import { drawBlockIcon } from '../blocks/Textures.js';

const ICON = 64;

export class Hotbar {
  constructor() {
    this.selectedIndex = 0;
    this.container = document.createElement('div');
    this.container.id = 'hotbar';
    this.container.className = 'hidden';
    this.slots = [];

    HOTBAR_BLOCKS.forEach((blockId, index) => {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = String(index);
      slot.title = `Material ${index + 1}`;

      const swatch = document.createElement('canvas');
      swatch.className = 'hotbar-swatch';
      swatch.width = ICON;
      swatch.height = ICON;
      drawBlockIcon(swatch.getContext('2d'), blockId, ICON);

      slot.appendChild(swatch);
      slot.addEventListener('click', () => this.select(index));
      this.container.appendChild(slot);
      this.slots.push(slot);
    });

    document.body.appendChild(this.container);
    this.updateSelection();
  }

  setVisible(visible) {
    this.container.classList.toggle('hidden', !visible);
  }

  select(index) {
    if (index < 0 || index >= HOTBAR_BLOCKS.length) return;
    this.selectedIndex = index;
    this.updateSelection();
  }

  cycle(delta) {
    const n = HOTBAR_BLOCKS.length;
    this.select((this.selectedIndex + delta + n) % n);
  }

  handleKey(code) {
    const blockKeys = {
      Digit5: 0,
      Digit6: 1,
      Digit7: 2,
      Digit8: 3,
      Digit9: 4,
      Digit0: 5,
    };
    if (code in blockKeys) this.select(blockKeys[code]);
  }

  get selectedBlock() {
    return HOTBAR_BLOCKS[this.selectedIndex];
  }

  updateSelection() {
    this.slots.forEach((slot, i) => {
      slot.classList.toggle('selected', i === this.selectedIndex);
    });
  }
}
