// Lantern Heist — rendering.
// One job: draw everything on the canvas. All art is drawn here from code:
// floorboards, walls, crates, bushes, pages, the exit, the thief, the
// watchmen and their vision cones, plus the night-lighting pass that shows
// at a glance which floor is safe (shadow) and which is lit.

import { TILE, GRID_TOP, VIEW_W, VIEW_H, COLORS, GUARD_VIEW_DIST } from './config.js';
import { tileAt } from './levels.js';

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = VIEW_W;
  dark.height = VIEW_H;
  const dctx = dark.getContext('2d');

  function drawFloor(level) {
    for (let y = 0; y < level.rows; y++) {
      for (let x = 0; x < level.cols; x++) {
        const t = tileAt(level, x, y);
        const px = x * TILE;
        const py = GRID_TOP + y * TILE;
        const h = hash(x, y);
        if (t === '#') continue; // walls drawn later, over the floor
        ctx.fillStyle = t === 's' ? COLORS.shadowFloor : (h > 0.5 ? COLORS.floorA : COLORS.floorB);
        ctx.fillRect(px, py, TILE, TILE);
        // Wood plank seams.
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py + TILE * (0.33 + h * 0.34));
        ctx.lineTo(px + TILE, py + TILE * (0.33 + h * 0.34));
        ctx.moveTo(px + TILE * h, py);
        ctx.lineTo(px + TILE * h, py + TILE);
        ctx.stroke();
        if (t === 's') {
          ctx.fillStyle = COLORS.shadowTint;
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  function drawCone(guard) {
    const state = guard.state;
    const color = state === 'alert' ? COLORS.coneAlert
      : state === 'suspicious' || state === 'search' ? COLORS.coneSuspicious
      : COLORS.coneCalm;
    const half = 0.66;
    const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, GUARD_VIEW_DIST);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255, 210, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD_VIEW_DIST, guard.facing - half, guard.facing + half);
    ctx.closePath();
    ctx.fill();
    // Cone edge lines, brighter when the guard is worked up.
    ctx.strokeStyle = state === 'patrol' ? 'rgba(255, 214, 90, 0.25)' : 'rgba(255, 120, 60, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing - half) * GUARD_VIEW_DIST, guard.y + Math.sin(guard.facing - half) * GUARD_VIEW_DIST);
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing + half) * GUARD_VIEW_DIST, guard.y + Math.sin(guard.facing + half) * GUARD_VIEW_DIST);
    ctx.stroke();
  }

  function drawWalls(level) {
    for (let y = 0; y < level.rows; y++) {
      for (let x = 0; x < level.cols; x++) {
        if (tileAt(level, x, y) !== '#') continue;
        const px = x * TILE;
        const py = GRID_TOP + y * TILE;
        ctx.fillStyle = COLORS.wallFace;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 10);
        ctx.strokeStyle = COLORS.wallEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      }
    }
  }

  function drawCrate(px, py) {
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
    ctx.strokeStyle = COLORS.crateEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - 12);
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 6);
    ctx.lineTo(px + TILE - 6, py + TILE - 6);
    ctx.moveTo(px + TILE - 6, py + 6);
    ctx.lineTo(px + 6, py + TILE - 6);
    ctx.stroke();
  }

  function drawBush(px, py, time) {
    const sway = Math.sin(time * 1.4 + px * 0.05) * 2;
    ctx.fillStyle = COLORS.bush;
    for (const [ox, oy, r] of [[20, 34, 16], [32, 24, 18], [44, 36, 15], [28, 46, 14], [42, 48, 13]]) {
      ctx.beginPath();
      ctx.arc(px + ox + sway, py + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.bushLeaf;
    for (const [ox, oy, r] of [[26, 28, 7], [38, 40, 6], [30, 44, 5]]) {
      ctx.beginPath();
      ctx.arc(px + ox + sway, py + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPage(page, time) {
    const px = page.x * TILE + TILE / 2;
    const py = GRID_TOP + page.y * TILE + TILE / 2;
    const bob = Math.sin(time * 2 + page.x) * 3;
    const glow = ctx.createRadialGradient(px, py + bob, 4, px, py + bob, 42);
    glow.addColorStop(0, COLORS.pageGlow);
    glow.addColorStop(1, 'rgba(245, 230, 184, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py + bob, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(px, py + bob);
    ctx.rotate(-0.12);
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(-11, -14, 22, 28);
    ctx.strokeStyle = '#b39b5e';
    ctx.lineWidth = 1;
    ctx.strokeRect(-11, -14, 22, 28);
    ctx.strokeStyle = '#6b5a33';
    for (let i = -8; i <= 8; i += 5) {
      ctx.beginPath();
      ctx.moveTo(-7, i);
      ctx.lineTo(7, i);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawExit(level, time) {
    const px = level.exit.x * TILE + TILE / 2;
    const py = GRID_TOP + level.exit.y * TILE + TILE / 2;
    const pulse = 0.5 + Math.sin(time * 3) * 0.2;
    const glow = ctx.createRadialGradient(px, py, 6, px, py, 70);
    glow.addColorStop(0, `rgba(47, 174, 95, ${0.45 + pulse * 0.2})`);
    glow.addColorStop(1, 'rgba(47, 174, 95, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(px - 20, py - 26, 40, 52);
    ctx.strokeStyle = '#0e5c2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(px - 20, py - 26, 40, 52);
    ctx.fillStyle = '#dff5e6';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('➜', px, py - 2);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#bff0cf';
    ctx.fillText('EXIT', px, py + 38);
  }

  function drawGuard(guard, time) {
    const bob = Math.sin(time * 6 + guard.index * 2) * 1.5;
    // Body.
    ctx.fillStyle = COLORS.guardBody;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#16203a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Helmet.
    ctx.fillStyle = COLORS.guardHelmet;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#dfe6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y + bob);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 22, guard.y + bob + Math.sin(guard.facing) * 22);
    ctx.stroke();
    // Lantern dot on the chest.
    ctx.fillStyle = COLORS.lantern;
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 8, guard.y + bob + Math.sin(guard.facing) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
    // State mark + suspicion arc above the head.
    const mark = guard.state === 'alert' ? '!' : (guard.state === 'suspicious' || guard.state === 'search') ? '?' : null;
    if (mark) {
      ctx.fillStyle = guard.state === 'alert' ? '#ff5040' : '#ffb020';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(mark, guard.x, guard.y - 24);
    }
    if (guard.suspicion > 1) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = guard.suspicion >= 45 ? '#ff5040' : '#ffb020';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob, 22, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPlayer(player, time, sneaking) {
    const bob = sneaking ? 0 : Math.sin(time * 9) * 1.5;
    // Cloak.
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 16 + bob);
    ctx.quadraticCurveTo(player.x + 16, player.y + 4, player.x + 13, player.y + 16 + bob);
    ctx.quadraticCurveTo(player.x, player.y + 20 + bob, player.x - 13, player.y + 16 + bob);
    ctx.quadraticCurveTo(player.x - 16, player.y + 4, player.x, player.y - 16 + bob);
    ctx.fill();
    ctx.strokeStyle = '#2c1010';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood.
    ctx.fillStyle = COLORS.playerHood;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 8 + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    // Face glint.
    ctx.fillStyle = '#f5d9a0';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.faceAngle) * 3, player.y - 8 + bob + Math.sin(player.faceAngle) * 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Lantern glow in hand.
    ctx.fillStyle = COLORS.lantern;
    ctx.beginPath();
    ctx.arc(player.x + 14, player.y + 8 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    // Sneak indicator: a soft ring while sneaking.
    if (sneaking) {
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y + bob, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles(particles) {
    for (const p of particles) {
      ctx.fillStyle = `rgba(255, 214, 110, ${Math.max(0, p.life / p.max)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + 2 * (p.life / p.max), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLighting(level, player, guards) {
    dctx.clearRect(0, 0, VIEW_W, VIEW_H);
    dctx.fillStyle = COLORS.night;
    dctx.fillRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, strength) => {
      const g = dctx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    };
    hole(player.x, player.y, 240, 0.92); // the thief's lantern
    for (const guard of guards) hole(guard.x, guard.y, 150, 0.75); // watchman lanterns
    for (const page of level.pages) {
      if (!page.taken) hole(page.x * TILE + TILE / 2, GRID_TOP + page.y * TILE + TILE / 2, 60, 0.6);
    }
    hole(level.exit.x * TILE + TILE / 2, GRID_TOP + level.exit.y * TILE + TILE / 2, 90, 0.6);
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
    // Vignette.
    const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  return {
    render(game, time) {
      const { level, player, guards, particles, sneaking } = game;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawFloor(level);
      for (const guard of guards) drawCone(guard);
      drawWalls(level);
      for (let y = 0; y < level.rows; y++) {
        for (let x = 0; x < level.cols; x++) {
          const t = tileAt(level, x, y);
          const px = x * TILE;
          const py = GRID_TOP + y * TILE;
          if (t === 'c') drawCrate(px, py);
          if (t === 'b') drawBush(px, py, time);
        }
      }
      for (const page of level.pages) {
        if (!page.taken) drawPage(page, time);
      }
      drawExit(level, time);
      for (const guard of guards) drawGuard(guard, time);
      drawPlayer(player, time, sneaking);
      drawParticles(particles);
      drawLighting(level, player, guards);
    },
  };
}
