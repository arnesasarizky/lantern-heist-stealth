// Lantern Heist — guards.
// One job: patrol waypoints, pause and look around, and chase / investigate /
// search when the suspicion meter (see detection.js) tells them to.
// Guards ping-pong their route so every leg is axis-aligned and never cuts
// a wall corner.

import {
  TILE, GRID_TOP, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED,
  GUARD_SEARCH_SPEED, GUARD_PAUSE_AT_WAYPOINT, GUARD_CATCH_DIST,
  GUARD_HEAR_RADIUS, SUSPICIOUS_AT, ALERT_AT, ALERT_MEMORY, SEARCH_TIME,
} from './config.js';
import { updateSuspicion } from './detection.js';
import { isSolid } from './levels.js';

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: GRID_TOP + ty * TILE + TILE / 2 };
}

export function createGuard(def, index) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  return {
    index,
    x: start.x,
    y: start.y,
    facing: 0, // radians; 0 = east
    waypoints: def.waypoints.map(([tx, ty]) => tileCenter(tx, ty)),
    wpIndex: 1,
    wpDir: 1,
    state: 'patrol', // patrol | suspicious | alert | search
    suspicion: 0,
    pauseTimer: 0,
    lookPhase: 0,
    lastSeen: null,
    lastSeenAt: 0,
    lostSightTimer: 0,
    searchTimer: 0,
    stepTimer: 0,
    alertedBefore: false, // raised the alarm already this alert?
    justAlerted: false, // set for one frame when the alarm goes up
  };
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 1;
}

// A guard hears loud (non-sneaking) footsteps nearby and turns to look.
function hearPlayer(guard, player, sneaking) {
  if (sneaking || guard.state === 'alert') return;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (dist < GUARD_HEAR_RADIUS && player.moving) {
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.state === 'patrol' && guard.suspicion < SUSPICIOUS_AT) {
      guard.suspicion = Math.max(guard.suspicion, SUSPICIOUS_AT);
    }
  }
}

export function updateGuard(level, guard, player, sneaking, dt, now) {
  const seen = updateSuspicion(level, guard, player, sneaking, dt);
  hearPlayer(guard, player, sneaking);

  // State transitions from the meter.
  if (guard.suspicion >= ALERT_AT && guard.state !== 'alert') {
    guard.state = 'alert';
    guard.lostSightTimer = 0;
    guard.justAlerted = !guard.alertedBefore;
    guard.alertedBefore = true;
  } else if (guard.state === 'patrol' && guard.suspicion >= SUSPICIOUS_AT) {
    guard.state = 'suspicious';
  } else if (guard.state === 'suspicious' && guard.suspicion < 5) {
    guard.state = 'patrol';
  } else if (guard.state === 'search' && guard.suspicion < 5) {
    guard.state = 'patrol';
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        // Look around while paused: slow sweep of the facing angle.
        guard.lookPhase += dt;
        guard.facing += Math.sin(guard.lookPhase * 2.2) * 0.9 * dt;
        break;
      }
      const target = guard.waypoints[guard.wpIndex];
      if (moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.pauseTimer = GUARD_PAUSE_AT_WAYPOINT;
        guard.lookPhase = 0;
        guard.wpIndex += guard.wpDir;
        if (guard.wpIndex >= guard.waypoints.length || guard.wpIndex < 0) {
          guard.wpDir *= -1;
          guard.wpIndex += guard.wpDir * 2;
        }
      }
      break;
    }
    case 'suspicious': {
      // Walk to the last-seen spot and look around there.
      if (guard.lastSeen) {
        if (moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_SEARCH_SPEED, dt)) {
          guard.lookPhase += dt;
          guard.facing += Math.sin(guard.lookPhase * 2.2) * 1.4 * dt;
          if (guard.suspicion < SUSPICIOUS_AT) guard.state = 'patrol';
        }
      } else {
        guard.state = 'patrol';
      }
      break;
    }
    case 'alert': {
      if (seen.seen) {
        guard.lostSightTimer = 0;
        moveToward(guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
      } else {
        guard.lostSightTimer += dt;
        if (guard.lastSeen) moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_CHASE_SPEED, dt);
        if (guard.lostSightTimer > ALERT_MEMORY) {
          guard.state = 'search';
          guard.searchTimer = SEARCH_TIME;
          guard.alertedBefore = false;
        }
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      guard.lookPhase += dt;
      guard.facing += Math.sin(guard.lookPhase * 2.6) * 1.6 * dt;
      if (guard.searchTimer <= 0) guard.state = 'patrol';
      break;
    }
  }

  // Footstep timing for the audio layer.
  const moving = guard.state === 'alert' || guard.state === 'suspicious' ||
    (guard.state === 'patrol' && guard.pauseTimer <= 0);
  if (moving) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = guard.state === 'alert' ? 0.42 : 0.62;
      guard.stepped = true;
    } else {
      guard.stepped = false;
    }
  } else {
    guard.stepped = false;
  }

  // Caught: an alerted guard touches the player.
  const caught = guard.state === 'alert' &&
    Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD_CATCH_DIST;
  return { seen: seen.seen, caught };
}

// Keep a moving circle out of solid tiles (axis-separated, so corners slide).
export function collideCircle(level, obj, radius) {
  for (const axis of ['x', 'y']) {
    const tx = Math.floor(obj.x / TILE);
    const ty = Math.floor((obj.y - GRID_TOP) / TILE);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!isSolid(level, tx + ox, ty + oy)) continue;
        const bx = (tx + ox) * TILE;
        const by = GRID_TOP + (ty + oy) * TILE;
        const nx = Math.max(bx, Math.min(obj.x, bx + TILE));
        const ny = Math.max(by, Math.min(obj.y, by + TILE));
        const dx = obj.x - nx;
        const dy = obj.y - ny;
        if (dx * dx + dy * dy < radius * radius) {
          if (axis === 'x' && dx !== 0) obj.x = nx + Math.sign(dx) * radius;
          if (axis === 'y' && dy !== 0) obj.y = ny + Math.sign(dy) * radius;
        }
      }
    }
  }
}
