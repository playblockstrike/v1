export class Controls {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = {};
    this.locked = false;

    this.onKeyDown = (e) => {
      this.keys[e.code] = true;
    };
    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    this.onPointerLockChange = () => {
      this.locked = document.pointerLockElement === this.domElement;
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  requestLock() {
    const promise = this.domElement.requestPointerLock();
    if (promise) {
      promise.catch(() => {
        // Pointer lock can fail if the browser blocks it or the element isn't ready.
      });
    }
  }

  isDown(code) {
    return !!this.keys[code];
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
