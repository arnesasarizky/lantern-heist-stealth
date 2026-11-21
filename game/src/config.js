// Lantern Heist — shared tuning constants.
// One job: every number the game balances on, in one place.

export const TILE = 64;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GRID_TOP = 16; // first row of tiles sits 16px down, canvas is 1280x720

// Player movement (pixels per second).
export const PLAYER_WALK_SPEED = 175;
export const PLAYER_SNEAK_SPEED = 92;

// Guards.
export const GUARD_PATROL_SPEED = 72;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_SEARCH_SPEED = 95;
export const GUARD_VIEW_DIST = 300;
export const GUARD_VIEW_HALF_ANGLE = 0.66; // ~38 degrees each side
export const GUARD_PAUSE_AT_WAYPOINT = 0.9; // seconds, look around
export const GUARD_CLOSE_SPOT_DIST = 70; // hidden player seen this close anyway
export const GUARD_CATCH_DIST = 30; // alerted guard touching the player = caught
export const GUARD_HEAR_RADIUS = 170; // walking footsteps heard this far

// Suspicion meter (0..100 per guard).
export const SUSPICION_GAIN_NEAR = 58; // per second, player close and visible
export const SUSPICION_GAIN_FAR = 26; // per second, player at cone edge
export const SUSPICION_DECAY = 34; // per second, no line of sight
export const SUSPICION_SNEAK_FACTOR = 0.55; // sneaking fills the meter slower
export const SUSPICION_SHADOW_FACTOR = 0.5; // standing in shadow fills it slower
export const SUSPICIOUS_AT = 45; // guard investigates the last-seen spot
export const ALERT_AT = 100; // guard chases and raises the alarm
export const ALERT_MEMORY = 3.5; // seconds of lost sight before alert gives up
export const SEARCH_TIME = 3.0; // seconds a guard searches the last-seen spot

// Scoring.
export const PAGE_POINTS = 100;
export const LEVEL_TIME_BONUS = 300;
export const GHOST_BONUS = 150; // finish a level with zero alarms
export const CAUGHT_PENALTY = 75;

// Colours.
export const COLORS = {
  floorA: '#2b2118',
  floorB: '#2e241b',
  floorLine: '#241b13',
  shadowFloor: '#141a2e',
  shadowTint: 'rgba(8, 12, 32, 0.42)',
  wallTop: '#5d4a33',
  wallFace: '#3a2d1e',
  wallEdge: '#1c140c',
  crate: '#7a5a2e',
  crateEdge: '#4a3517',
  bush: '#1e4d2a',
  bushLeaf: '#2f7a3e',
  page: '#f5e6b8',
  pageGlow: 'rgba(245, 230, 184, 0.55)',
  exit: '#2fae5f',
  exitGlow: 'rgba(47, 174, 95, 0.5)',
  playerCloak: '#7d2e2e',
  playerHood: '#4a1d1d',
  lantern: '#ffcf6e',
  guardBody: '#2e3d5c',
  guardHelmet: '#46587e',
  coneCalm: 'rgba(255, 214, 90, 0.16)',
  coneSuspicious: 'rgba(255, 150, 40, 0.28)',
  coneAlert: 'rgba(255, 60, 50, 0.34)',
  night: 'rgba(3, 5, 14, 0.52)',
};
