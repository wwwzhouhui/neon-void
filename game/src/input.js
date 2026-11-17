// Keyboard + mouse input with Pointer Lock. The game polls this every frame;
// discrete actions (reload, weapon switch, pause, mute, confirm) are delivered
// through onAction callbacks so the main loop stays in charge of state.
export function createInput(canvas) {
  const keys = new Set();
  let lookDX = 0;
  let lookDY = 0;
  let firing = false;
  let locked = false;
  const actions = new Map(); // code -> [fn, ...]

  function onAction(code, fn) {
    if (!actions.has(code)) actions.set(code, []);
    actions.get(code).push(fn);
  }

  function fireActions(code, event) {
    const list = actions.get(code);
    if (list) for (const fn of list) fn(event);
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space') event.preventDefault();
    fireActions(event.code, event);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
    lookDX = 0; lookDY = 0;
    fireActions('FocusLost', null);
  });

  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    lookDX += event.movementX || 0;
    lookDY += event.movementY || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) fireActions('PointerUnlock', null);
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) firing = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) firing = false;
  });

  function clear() { keys.clear(); firing = false; lookDX = 0; lookDY = 0; }

  return {
    clear,
    keys,
    onAction,
    requestLock() {
      if (document.pointerLockElement !== canvas) {
        try {
          const p = canvas.requestPointerLock();
          if (p && p.catch) p.catch(() => {});
        } catch (e) { /* headless / denied: play continues unlocked */ }
      }
    },
    exitLock() {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    isLocked() {
      return locked;
    },
    consumeLook() {
      const out = { dx: lookDX, dy: lookDY };
      lookDX = 0;
      lookDY = 0;
      return out;
    },
    isFiring() {
      return firing;
    },
    setFiring(value) {
      firing = value;
    },
    isDown(code) {
      return keys.has(code);
    },
  };
}
