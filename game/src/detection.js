// Lantern Heist — detection: line of sight and the suspicion meter.
// One job: decide whether a guard can see the player, and how fast the
// meter fills or drains. No movement, no drawing, no sound here.

import {
  TILE, GRID_TOP, GUARD_VIEW_DIST, GUARD_VIEW_HALF_ANGLE,
  GUARD_CLOSE_SPOT_DIST, SUSPICION_GAIN_NEAR, SUSPICION_GAIN_FAR,
  SUSPICION_DECAY, SUSPICION_SNEAK_FACTOR, SUSPICION_SHADOW_FACTOR,
} from './config.js';
import { blocksSight, isShadow, isBush } from './levels.js';

function tileOf(px, py) {
  return { tx: Math.floor(px / TILE), ty: Math.floor((py - GRID_TOP) / TILE) };
}

// Step along the segment in small hops; a wall, crate or bush blocks sight.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const { tx, ty } = tileOf(x0 + dx * t, y0 + dy * t);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}

export function playerTileState(level, player) {
  const { tx, ty } = tileOf(player.x, player.y);
  return {
    inShadow: isShadow(level, tx, ty),
    inBush: isBush(level, tx, ty),
  };
}

// Can this guard see the player right now?
export function guardSeesPlayer(level, guard, player, sneaking) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const { inShadow, inBush } = playerTileState(level, player);

  // Hiding in a bush (or a shadow while sneaking) keeps the thief unseen
  // unless the guard is right on top of them.
  if ((inBush || (inShadow && sneaking)) && dist > GUARD_CLOSE_SPOT_DIST) {
    return { sees: false, dist, hidden: true };
  }

  let viewDist = GUARD_VIEW_DIST;
  if (sneaking) viewDist *= 0.75;
  if (inShadow) viewDist *= 0.6;
  if (dist > viewDist) return { sees: false, dist, hidden: false };

  // Angle to the player vs the guard's facing.
  let angleTo = Math.atan2(dy, dx) - guard.facing;
  while (angleTo > Math.PI) angleTo -= Math.PI * 2;
  while (angleTo < -Math.PI) angleTo += Math.PI * 2;
  if (Math.abs(angleTo) > GUARD_VIEW_HALF_ANGLE) return { sees: false, dist, hidden: false };

  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
    return { sees: false, dist, hidden: false };
  }
  return { sees: true, dist, hidden: false };
}

// Move one guard's suspicion meter one frame. Returns what changed.
export function updateSuspicion(level, guard, player, sneaking, dt) {
  const seen = guardSeesPlayer(level, guard, player, sneaking);
  const before = guard.suspicion;
  if (seen.sees) {
    const closeness = 1 - Math.min(1, seen.dist / GUARD_VIEW_DIST);
    let rate = SUSPICION_GAIN_FAR + (SUSPICION_GAIN_NEAR - SUSPICION_GAIN_FAR) * closeness;
    if (sneaking) rate *= SUSPICION_SNEAK_FACTOR;
    const { inShadow } = playerTileState(level, player);
    if (inShadow) rate *= SUSPICION_SHADOW_FACTOR;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lastSeenAt = performance.now() / 1000;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
  }
  return { seen: seen.sees, rose: guard.suspicion > before, dist: seen.dist };
}
