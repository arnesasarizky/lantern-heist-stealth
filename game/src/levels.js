// Lantern Heist — level data.
// One job: the three archive wings, as tile maps plus guard patrol routes.
//
// Legend: # wall · . floor · s shadow floor · c crate (blocks sight + movement)
//          b bush (hide inside) · P ledger page · E exit · @ player start
// Guards ping-pong their waypoint route (tile coords), so every leg is
// axis-aligned and no route ever cuts a wall corner.

export const LEVELS = [
  {
    name: 'Wing I — The Reading Room',
    intro: 'Three ledger pages. Slip past the watchmen. Reach the green door unseen.',
    grid: [
      '####################',
      '#@...s....#....P...#',
      '#....s....#........#',
      '#..c.s....#..c.....#',
      '#....s....#.......P#',
      '#....s....#....#...#',
      '#....#####.#####...#',
      '#..................#',
      '#..b.....#...P.....#',
      '#........#.....#E..#',
      '####################',
    ],
    guards: [
      { waypoints: [[13, 1], [17, 1], [17, 4], [13, 4]] },
      { waypoints: [[2, 7], [17, 7]] },
    ],
  },
  {
    name: 'Wing II — Stacks & Shadows',
    intro: 'Long shadows between the stacks. Sneak slow, stay dark.',
    grid: [
      '####################',
      '#@..s.....#....P...#',
      '#...s..c..#........#',
      '#...s.....#.#####..#',
      '#...s.....#.....#..#',
      '#...####..#..P..#..#',
      '#.........#.....#..#',
      '#..b......#..c.....#',
      '#....P....#.....E..#',
      '#....s........s....#',
      '####################',
    ],
    guards: [
      { waypoints: [[12, 1], [17, 1], [17, 3]] },
      { waypoints: [[2, 6], [8, 6]] },
      { waypoints: [[14, 6], [14, 9], [17, 9], [17, 6]] },
    ],
  },
  {
    name: 'Wing III — The Vault Wing',
    intro: 'Four watchmen, tight corridors. The last ledger is behind the vault.',
    grid: [
      '####################',
      '#@....#...s....P...#',
      '#..c..#...s........#',
      '#.....#...s..###...#',
      '#..P..#...s..#.....#',
      '#.....###...#..c...#',
      '#.....#.....#......#',
      '#..s..#..P..#.##...#',
      '#..s..#.....#......#',
      '#..s....b...#..E...#',
      '####################',
    ],
    guards: [
      { waypoints: [[11, 1], [16, 1], [16, 2]] },
      { waypoints: [[2, 4], [5, 4], [5, 1], [2, 1]] },
      { waypoints: [[11, 6], [11, 9]] },
      { waypoints: [[16, 6], [18, 6], [18, 9], [16, 9]] },
    ],
  },
];

// Parse one level's grid into the structures the game reads.
export function parseLevel(level) {
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const tiles = level.grid.map((row) => row.split(''));
  let playerStart = { x: 1, y: 1 };
  const pages = [];
  let exit = { x: cols - 2, y: rows - 2 };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = tiles[y][x];
      if (t === '@') { playerStart = { x, y }; tiles[y][x] = '.'; }
      if (t === 'P') { pages.push({ x, y, taken: false }); tiles[y][x] = '.'; }
      if (t === 'E') { exit = { x, y }; tiles[y][x] = '.'; }
    }
  }
  return { name: level.name, intro: level.intro, tiles, rows, cols, playerStart, pages, exit };
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.tiles[ty][tx];
}

// Walls and crates stop movement and sight; bushes hide the player.
export function isSolid(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'c';
}

export function blocksSight(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'c' || t === 'b';
}

export function isShadow(level, tx, ty) {
  return tileAt(level, tx, ty) === 's';
}

export function isBush(level, tx, ty) {
  return tileAt(level, tx, ty) === 'b';
}
