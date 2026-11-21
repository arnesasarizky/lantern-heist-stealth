// Lantern Heist — keyboard input.
// One job: turn key events into a small, stable input state the game reads.

export function createInput() {
  const keys = new Set();
  let onFirstKey = null;
  let onPauseKey = null;
  let onRestartKey = null;
  let onAnyKey = null;

  function down(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      if (onAnyKey) onAnyKey();
      if (onFirstKey && !keys.size) onFirstKey();
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (onPauseKey) onPauseKey();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (onRestartKey) onRestartKey();
      }
    }
    keys.add(e.key.toLowerCase());
  }

  function up(e) {
    keys.delete(e.key.toLowerCase());
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  return {
    keys,
    get moveX() {
      let x = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      return x;
    },
    get moveY() {
      let y = 0;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return y;
    },
    get sneaking() {
      return keys.has('shift');
    },
    set onFirstKey(fn) { onFirstKey = fn; },
    set onPauseKey(fn) { onPauseKey = fn; },
    set onRestartKey(fn) { onRestartKey = fn; },
    set onAnyKey(fn) { onAnyKey = fn; },
  };
}
