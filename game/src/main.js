// Lantern Heist — game state and loop.
// One job: own the state machine (title / playing / paused / caught /
// level-clear / win), run the frame loop, and keep the HUD honest.
// Movement, detection, drawing and sound live in their own modules.

import { TILE, GRID_TOP, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED, PAGE_POINTS, LEVEL_TIME_BONUS, GHOST_BONUS, CAUGHT_PENALTY } from './config.js';
import { LEVELS, parseLevel, isSolid } from './levels.js';
import { createInput } from './input.js';
import { createGuard, updateGuard, collideCircle, tileCenter } from './guards.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();
const audio = createAudio();

const $ = (id) => document.getElementById(id);
const hud = {
  level: $('hud-level'),
  pages: $('hud-pages'),
  timer: $('hud-timer'),
  score: $('hud-score'),
  eye: $('hud-eye'),
  banner: $('hud-banner'),
  overlay: $('overlay'),
  overlayTitle: $('overlay-title'),
  overlayText: $('overlay-text'),
  overlayHint: $('overlay-hint'),
};

const game = {
  state: 'title', // title | playing | paused | caught | levelclear | win
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  particles: [],
  score: 0,
  detections: 0, // alarms raised this level
  totalDetections: 0,
  elapsed: 0,
  started: false,
  stepTimer: 0,
  nearMissWarned: false,
  shot: null,
  frozen: false, // screenshot scenes: render but never simulate
};

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function loadLevel(index) {
  game.levelIndex = index;
  game.level = parseLevel(LEVELS[index]);
  const s = tileCenter(game.level.playerStart.x, game.level.playerStart.y);
  game.player = { x: s.x, y: s.y, faceAngle: 0, moving: false };
  game.guards = LEVELS[index].guards.map((def, i) => createGuard(def, i));
  game.particles = [];
  game.detections = 0;
  game.nearMissWarned = false;
  game.elapsed = 0;
  game.started = false;
}

function showOverlay(title, text, hint) {
  hud.overlayTitle.textContent = title;
  hud.overlayText.textContent = text;
  hud.overlayHint.textContent = hint;
  hud.overlay.classList.remove('hidden');
}

function hideOverlay() {
  hud.overlay.classList.add('hidden');
}

function flashBanner(text, cls) {
  hud.banner.textContent = text;
  hud.banner.className = `banner ${cls}`;
  clearTimeout(flashBanner._t);
  flashBanner._t = setTimeout(() => { hud.banner.className = 'banner'; }, 2200);
}

// Staged-scene banner: stays put (no timeout) for screenshot scenes.
function setBanner(text, cls) {
  clearTimeout(flashBanner._t);
  hud.banner.textContent = text;
  hud.banner.className = `banner ${cls}`;
}

function updateHud() {
  const pagesGot = game.level.pages.filter((p) => p.taken).length;
  hud.level.textContent = `${game.level.name}  ·  Level ${game.levelIndex + 1}/3`;
  hud.pages.textContent = `📜 Pages ${pagesGot}/3`;
  hud.timer.textContent = `⏱ ${fmtTime(game.elapsed)}`;
  hud.score.textContent = `★ ${game.score}`;
  const maxSuspicion = Math.max(0, ...game.guards.map((g) => g.suspicion));
  const anyAlert = game.guards.some((g) => g.state === 'alert');
  if (anyAlert) {
    hud.eye.textContent = '👁 SPOTTED!';
    hud.eye.className = 'eye alert';
  } else if (maxSuspicion >= 45) {
    hud.eye.textContent = '👁 SUSPICIOUS';
    hud.eye.className = 'eye suspicious';
  } else if (maxSuspicion > 5) {
    hud.eye.textContent = '👁 GLIMPSED';
    hud.eye.className = 'eye suspicious';
  } else {
    hud.eye.textContent = '👁 UNSEEN';
    hud.eye.className = 'eye';
  }
}

function spawnParticles(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 30 + Math.random() * 70;
    game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6 });
  }
}

function burstParticles(dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function startGame() {
  audio.unlock();
  audio.click();
  game.score = 0;
  game.totalDetections = 0;
  loadLevel(0);
  game.state = 'playing';
  hideOverlay();
  flashBanner('Steal the three ledger pages — stay out of the light', 'info');
}

function nextLevel() {
  const timeBonus = Math.max(0, LEVEL_TIME_BONUS - Math.floor(game.elapsed) * 2);
  const ghost = game.detections === 0 ? GHOST_BONUS : 0;
  game.score += timeBonus + ghost;
  audio.levelClear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'win';
    audio.win();
    showOverlay(
      '🏆 THE HEIST IS COMPLETE',
      `Every ledger stolen, never caught. Final score ${game.score} · time ${fmtTime(game.elapsed)} · alarms ${game.totalDetections}.` +
        (game.totalDetections === 0 ? ' GHOST — not a single alarm all night.' : ''),
      'Press R to play again',
    );
    return;
  }
  game.state = 'levelclear';
  showOverlay(
    `✓ ${game.level.name} — CLEARED`,
    `Time bonus +${timeBonus}${ghost ? ` · Ghost bonus +${ghost} (no alarms!)` : ''} · Score ${game.score}`,
    'Press any key for the next wing…',
  );
}

function caught() {
  game.state = 'caught';
  game.score = Math.max(0, game.score - CAUGHT_PENALTY);
  audio.caught();
  showOverlay(
    '🚨 CAUGHT!',
    `A watchman grabbed you in the dark. −${CAUGHT_PENALTY} points. The ledgers stay where they are… this time.`,
    'Press R to try this wing again',
  );
}

function movePlayer(dt) {
  const p = game.player;
  const mx = input.moveX;
  const my = input.moveY;
  p.moving = mx !== 0 || my !== 0;
  if (!p.moving) return;
  const len = Math.hypot(mx, my);
  const speed = input.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  const vx = (mx / len) * speed * dt;
  const vy = (my / len) * speed * dt;
  p.faceAngle = Math.atan2(my, mx);
  // Move one axis at a time so the thief slides along walls.
  p.x += vx;
  collideCircle(game.level, p, 15);
  p.y += vy;
  collideCircle(game.level, p, 15);
  // Footsteps: quieter and slower while sneaking.
  game.stepTimer -= dt;
  if (game.stepTimer <= 0) {
    game.stepTimer = input.sneaking ? 0.55 : 0.36;
    const pan = Math.max(-1, Math.min(1, (p.x - 640) / 640));
    audio.footstep(pan, 0.12, input.sneaking);
  }
}

function checkPickups() {
  const p = game.player;
  for (const page of game.level.pages) {
    if (page.taken) continue;
    const px = page.x * TILE + TILE / 2;
    const py = GRID_TOP + page.y * TILE + TILE / 2;
    if (Math.hypot(p.x - px, p.y - py) < 36) {
      page.taken = true;
      game.score += PAGE_POINTS;
      audio.pickup();
      spawnParticles(px, py, 14);
      const got = game.level.pages.filter((q) => q.taken).length;
      flashBanner(got >= 3 ? 'All three pages! Now reach the green EXIT →' : `Ledger page ${got}/3 — ${3 - got} to go`, 'info');
    }
  }
  const ex = game.level.exit;
  const exX = ex.x * TILE + TILE / 2;
  const exY = GRID_TOP + ex.y * TILE + TILE / 2;
  if (game.level.pages.every((q) => q.taken) && Math.hypot(p.x - exX, p.y - exY) < 38) {
    nextLevel();
  }
}

function updatePlaying(dt, now) {
  if (!game.started && game.player.moving) game.started = true;
  if (game.started) game.elapsed += dt;
  movePlayer(dt);
  checkPickups();
  for (const guard of game.guards) {
    const res = updateGuard(game.level, guard, game.player, input.sneaking, dt, now);
    if (guard.justAlerted) {
      guard.justAlerted = false;
      game.detections += 1;
      game.totalDetections += 1;
      audio.alarm();
      flashBanner('🚨 SPOTTED! Break line of sight — run!', 'danger');
    }
    if (guard.state === 'alert' && !res.seen && guard.suspicion > 70 && !game.nearMissWarned) {
      // Near miss: the guard is hot on the trail but lost you.
    }
    if (guard.stepped) {
      const dist = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
      if (dist < 420) {
        const pan = Math.max(-1, Math.min(1, (guard.x - game.player.x) / 420));
        audio.guardStep(pan, Math.max(0.03, 0.22 * (1 - dist / 420)));
      }
    }
    if (res.caught) {
      caught();
      return;
    }
  }
  // Near-miss warning: a guard's meter spikes past 70 without a full alert.
  const hot = game.guards.some((g) => g.suspicion >= 70 && g.state !== 'alert');
  if (hot && !game.nearMissWarned) {
    game.nearMissWarned = true;
    audio.nearMiss();
    flashBanner('⚠ A watchman almost saw you — freeze or slip into shadow!', 'warn');
  } else if (!hot) {
    game.nearMissWarned = false;
  }
  burstParticles(dt);
}

// ---- Deterministic screenshot scenes (?shot=cover|suspicion|shadow|win) ----
function applyShot(shot) {
  game.shot = shot;
  game.frozen = true; // staged scene: render only, never simulate
  if (shot === 'cover') {
    loadLevel(0);
    game.state = 'playing';
    hideOverlay();
    const p = tileCenter(5, 7);
    game.player.x = p.x; game.player.y = p.y; game.player.faceAngle = Math.PI / 4;
    game.level.pages[2].taken = true; // the bottom-corridor page is pocketed
    game.score = 100;
    game.elapsed = 42;
    game.started = true;
    const g0 = game.guards[0];
    const c0 = tileCenter(15, 2); g0.x = c0.x; g0.y = c0.y; g0.facing = Math.PI * 0.75;
    const g1 = game.guards[1];
    const c1 = tileCenter(9, 7); g1.x = c1.x; g1.y = c1.y; g1.facing = 0;
  } else if (shot === 'suspicion') {
    loadLevel(0);
    game.state = 'playing';
    hideOverlay();
    const g0 = game.guards[0];
    const c0 = tileCenter(15, 1); g0.x = c0.x; g0.y = c0.y; g0.facing = Math.PI / 2;
    g0.suspicion = 62; g0.state = 'suspicious';
    g0.lastSeen = { x: game.player.x, y: game.player.y };
    const p = tileCenter(15, 4);
    game.player.x = p.x; game.player.y = p.y; game.player.faceAngle = -Math.PI / 2;
    g0.lastSeen = { x: p.x, y: p.y };
    game.level.pages[0].taken = true;
    game.level.pages[1].taken = true;
    game.score = 200;
    game.elapsed = 72;
    game.started = true;
    setBanner('⚠ A watchman almost saw you — freeze or slip into shadow!', 'warn');
  } else if (shot === 'shadow') {
    loadLevel(1);
    game.state = 'playing';
    hideOverlay();
    const p = tileCenter(4, 3);
    game.player.x = p.x; game.player.y = p.y; game.player.faceAngle = Math.PI / 2;
    game.level.pages[2].taken = true;
    game.score = 100;
    game.elapsed = 125;
    game.started = true;
    const g1 = game.guards[1];
    const c1 = tileCenter(5, 6); g1.x = c1.x; g1.y = c1.y; g1.facing = -Math.PI / 2;
    g1.pauseTimer = 0.6;
    input.keys.add('shift'); // sneaking: the ring shows, the cone passes over
    setBanner('Hidden in the shadows — the cone sweeps right past you', 'info');
  } else if (shot === 'win') {
    loadLevel(2);
    for (const page of game.level.pages) page.taken = true;
    game.score = 2450;
    game.elapsed = 391;
    game.totalDetections = 0;
    game.state = 'win';
    showOverlay(
      '🏆 THE HEIST IS COMPLETE',
      'Every ledger stolen, never caught. Final score 2450 · time 06:31 · alarms 0. GHOST — not a single alarm all night.',
      'Press R to play again',
    );
  }
  updateHud();
}

// ---- Input wiring ----
input.onAnyKey = () => {
  audio.unlock();
  if (game.state === 'title') startGame();
  else if (game.state === 'levelclear') {
    loadLevel(game.levelIndex + 1);
    game.state = 'playing';
    hideOverlay();
    flashBanner(game.level.intro, 'info');
  }
};
input.onPauseKey = () => {
  if (game.state === 'playing') {
    game.state = 'paused';
    showOverlay('⏸ PAUSED', 'The archive waits. The watchmen hold their rounds.', 'Press P to resume · R to restart this wing');
  } else if (game.state === 'paused') {
    game.state = 'playing';
    hideOverlay();
  }
};
input.onRestartKey = () => {
  if (game.state === 'caught' || game.state === 'paused' || game.state === 'win') {
    audio.click();
    loadLevel(game.levelIndex);
    game.state = 'playing';
    hideOverlay();
  }
};
canvas.addEventListener('click', () => {
  audio.unlock();
  if (game.state === 'title') startGame();
});

// ---- Boot ----
loadLevel(0);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(shot);
} else {
  showOverlay(
    '🕯 LANTERN HEIST',
    'You are the thief in the Lantern Archive. Steal the 3 ledger pages on each wing, then slip out the green door — unseen.\n\nWASD / arrows — move · SHIFT — sneak (slow, quiet, harder to spot) · P — pause · R — restart\n\nWatchmen patrol with lantern cones. Shadows and bushes hide you; breaking line of sight lets suspicion fade. A full alarm means run — if a watchman touches you, you are caught.',
    'Click or press any key to begin the heist',
  );
}
updateHud();

// Expose a small handle for automated playtests (not part of the game).
window.__game = game;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing' && !game.frozen) updatePlaying(dt, now / 1000);
  renderer.render(game, now / 1000);
  if (game.state === 'playing') updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the HUD honest even while overlays are up.
setInterval(() => { if (game.state !== 'playing') updateHud(); }, 250);
