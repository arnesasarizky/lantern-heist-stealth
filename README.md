# 🕯 Lantern Heist

![Lantern Heist — best stealth game](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/arnesasarizky/lantern-heist-stealth/rank.svg)
![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/arnesasarizky/lantern-heist-stealth/reward.svg)

A top-down 2D stealth game: you are the thief in the Lantern Archive at
night. Steal the 3 ledger pages on each wing, then slip out the green exit —
unseen.

## How to play

- **WASD / arrow keys** — move
- **SHIFT** — sneak (slower, quieter, harder to spot)
- **P** — pause · **R** — restart the wing

Watchmen patrol with lantern vision cones. Shadows and bushes hide you;
breaking line of sight lets suspicion fade. A guard who fully spots you
raises the alarm and chases — if one touches you, you are caught. Finish a
wing with zero alarms for the Ghost bonus.

Three wings, escalating patrols: the Reading Room, the Stacks & Shadows, and
the Vault Wing.

## The game

- Guard patrols with waypoints, pauses and look-arounds
- Suspicion meter: Calm → Suspicious (investigates) → Alerted (chases) → Search → Calm, with recovery when you break line of sight
- Hiding in shadow zones and bushes; near-miss warnings
- Synthesized WebAudio sound: footsteps that tell you where a guard is, alert stings, pickup chimes
- Score from pages, time bonus and the Ghost bonus
- All art drawn on canvas, all sound synthesized — fully offline, no libraries, no network requests

## Play it

Serve `game/` with any static server, e.g. `node serve.ts`, then open
http://localhost:8080.

## Layout

- `game/index.html` + `game/style.css` — page and HUD
- `game/src/config.js` — tuning constants
- `game/src/levels.js` — the three wings
- `game/src/input.js` — keyboard input
- `game/src/guards.js` — patrols, chase, search, collision
- `game/src/detection.js` — line of sight and the suspicion meter
- `game/src/audio.js` — synthesized sound
- `game/src/render.js` — canvas art, vision cones, night lighting
- `game/src/main.js` — state machine, loop, HUD

Built for the make.fun bounty
[best-stealth-game-20261121-1759](https://make.fun/c/best-stealth-game-20261121-1759).
