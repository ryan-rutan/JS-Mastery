// Code Clash missions. Maps are 11×7.
// Legend: # wall, . floor, C crate (one laser shot breaks it), G goal, T target,
// B battery (+2 ⚡), R repair kit (+30 HP), P you, E enemy.
// Each star's test() receives { won, turns, bonks, shots, hits, hp, autopilot, code }.

(function () {
  const won = { text: 'Complete the mission', test: s => s.won };
  const autopilotStar = { text: 'Win with Autopilot on from your first turn', test: s => s.won && s.autopilot };

  // A solid all-round strategy used as the sample solution for the duels.
  const DUEL_SOLUTION = `const DIRS = ["up", "down", "left", "right"];
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Fire in any direction where we have a clear shot.
function shootIfPossible() {
  for (const dir of DIRS) {
    if (bot.energy >= 2 && bot.look(dir) === "enemy") {
      bot.fire(dir);
      return true;
    }
  }
  return false;
}

// Is the tile next to us (in this direction) out of the enemy's line of fire?
function isSafe(dir) {
  const [dx, dy] = STEP[dir];
  return bot.canMove(dir) && !enemy.canHit(bot.x + dx, bot.y + dy);
}

// 1. Shoot first if we can.
shootIfPossible();

// 2. Close in, keeping 2 ⚡ for a shot.
while (bot.energy >= 3 && !enemy.canHit(bot.x, bot.y)) {
  const path = bot.pathTo(enemy.x, enemy.y);
  if (path.length === 0 || !bot.move(path[0])) break;
}
shootIfPossible();

// 3. Don't end the turn standing in the line of fire.
if (enemy.canHit(bot.x, bot.y)) {
  const escape = DIRS.find(isSafe);
  if (escape && bot.energy >= 1) {
    bot.move(escape);
  } else if (bot.energy >= 2) {
    bot.shield();
  }
}
`;

  window.CLASH_MISSIONS = [
    {
      id: 'hello-bot',
      title: 'Hello, Bot!',
      concept: 'Calling functions',
      opponent: 'Training',
      persona: 'trainer',
      goal: 'reach',
      energy: 6,
      maxTurns: 8,
      map: [
        '###########',
        '#.........#',
        '#.........#',
        '#.P....G..#',
        '#.........#',
        '#.........#',
        '###########',
      ],
      api: ['move', 'say', 'log'],
      briefing: `<p>This is your bot. It does <strong>exactly</strong> what your JavaScript tells it, nothing more.</p>
        <p><code>bot</code> is an <strong>object</strong>, and <code>move</code> is a <strong>function</strong> that belongs to it. Writing <code>bot.move("right")</code> <strong>calls</strong> that function with one <strong>argument</strong>: the string <code>"right"</code>.</p>
        <p>Each move costs <strong>1 ⚡</strong> and you get <strong>6 ⚡</strong> per turn. While you type, a dotted <strong>ghost path</strong> shows what your code will do. Press <strong>Run turn</strong> to make it happen.</p>`,
      objective: 'Reach the glowing goal tile.',
      starter: `// Your bot runs this code when you press "Run turn".
// Each bot.move() call moves one tile and costs 1 ⚡.
bot.move("right");
`,
      hints: [
        'Hover over the goal to see its coordinates. You start at (2, 3), so how many steps right is it?',
        'Write bot.move("right"); five times, one per line.',
      ],
      solution: `bot.move("right");
bot.move("right");
bot.move("right");
bot.move("right");
bot.move("right");
bot.say("Made it!");`,
      stars: [
        won,
        { text: 'Do it in a single turn', test: s => s.won && s.turns <= 1 },
        { text: 'Never bump into a wall', test: s => s.won && s.bonks === 0 },
      ],
    },

    {
      id: 'target-practice',
      title: 'Target Practice',
      concept: 'Arguments & order',
      opponent: 'Training',
      persona: 'trainer',
      goal: 'targets',
      energy: 8,
      maxTurns: 8,
      map: [
        '###########',
        '#....T....#',
        '#.........#',
        '#T...P....#',
        '#.........#',
        '#........T#',
        '###########',
      ],
      api: ['move', 'fire', 'say', 'log'],
      briefing: `<p>One function can do different jobs depending on the <strong>argument</strong> you give it: <code>bot.fire("up")</code> and <code>bot.fire("left")</code> call the same function, aimed different ways.</p>
        <p>Code runs <strong>top to bottom</strong>, one line at a time, so the <strong>order</strong> of your commands matters. Lasers fly in straight lines and cost <strong>2 ⚡</strong>. You have 8 ⚡ per turn.</p>`,
      objective: 'Destroy all 3 targets.',
      starter: `// bot.fire(direction) shoots a laser in a straight line. Costs 2 ⚡.
bot.fire("up");
`,
      hints: [
        'Two targets are already in a straight line from you: one up, one left.',
        'The third target is at (9, 5). Move down twice to line up with it, then fire right.',
      ],
      solution: `bot.fire("up");
bot.fire("left");
bot.move("down");
bot.move("down");
bot.fire("right");`,
      stars: [
        won,
        { text: 'Clear them all in one turn', test: s => s.won && s.turns <= 1 },
        { text: 'Never miss a shot', test: s => s.won && s.shots === s.hits },
      ],
    },

    {
      id: 'long-hallway',
      title: 'The Long Hallway',
      concept: 'for loops',
      opponent: 'Training',
      persona: 'trainer',
      goal: 'reach',
      energy: 10,
      maxTurns: 6,
      map: [
        '###########',
        '###########',
        '###########',
        '#P.......G#',
        '###########',
        '###########',
        '###########',
      ],
      api: ['move', 'for', 'log'],
      briefing: `<p>Typing <code>bot.move("right");</code> eight times works, but programmers hate repeating themselves. A <strong>for loop</strong> repeats code for you:</p>
<pre class="code-sample">for (let i = 0; i &lt; 3; i++) {
  bot.move("right");
}</pre>
        <p>Read it as: start a counter <code>i</code> at 0, keep going <em>while</em> <code>i &lt; 3</code>, and add 1 after each round (<code>i++</code>). The body runs 3 times, for i = 0, 1 and 2.</p>`,
      objective: 'Reach the goal at the end of the hallway.',
      starter: `// This loop runs its body 3 times.
// How many times do you need?
for (let i = 0; i < 3; i++) {
  bot.move("right");
}
`,
      hints: [
        'You start at x = 1 and the goal is at x = 9. That\'s 8 steps.',
        'Change the 3 in the loop to an 8.',
      ],
      solution: `for (let i = 0; i < 8; i++) {
  bot.move("right");
}`,
      stars: [
        won,
        { text: 'Do it in a single turn', test: s => s.won && s.turns <= 1 },
        { text: 'Use 45 characters of code or fewer (hint: a loop!)', test: s => s.won && s.code <= 45 },
      ],
    },

    {
      id: 'staircase',
      title: 'The Staircase',
      concept: 'if / else & while',
      opponent: 'Training',
      persona: 'trainer',
      goal: 'reach',
      energy: 4,
      maxTurns: 14,
      map: [
        '###########',
        '#P..#######',
        '###...#####',
        '#####...###',
        '#######..G#',
        '###########',
        '###########',
      ],
      api: ['move', 'canMove', 'if', 'while', 'energy', 'log'],
      briefing: `<p>Tick <strong>🔁 Autopilot</strong> and your code runs again <em>every turn</em> by itself. That means the same code has to work wherever the bot is standing, so it needs to <strong>make decisions</strong>.</p>
        <p><code>if (condition) { … } else { … }</code> runs one block or the other. <code>bot.canMove("right")</code> returns <code>true</code> or <code>false</code>, which makes a perfect condition.</p>
        <p>A <strong>while loop</strong> keeps repeating as long as its condition is true. <code>while (bot.energy &gt; 0) { … }</code> keeps going until you run out of energy.</p>`,
      objective: 'Get down the staircase to the goal.',
      starter: `// With Autopilot on, this runs EVERY turn.
if (bot.canMove("right")) {
  bot.move("right");
} else {
  bot.move("down");
}
`,
      hints: [
        'The starter code works, but it only spends 1 ⚡ per turn. You have 4!',
        'Wrap the if/else in while (bot.energy > 0) { ... }, tick Autopilot, then press Run.',
      ],
      solution: `while (bot.energy > 0) {
  if (bot.canMove("right")) {
    bot.move("right");
  } else {
    bot.move("down");
  }
}`,
      stars: [
        won,
        autopilotStar,
        { text: 'Finish in 3 turns or fewer', test: s => s.won && s.turns <= 3 },
      ],
    },

    {
      id: 'moving-target',
      title: 'Moving Target',
      concept: 'Variables & comparisons',
      opponent: 'DRONE-1',
      persona: 'drone',
      goal: 'defeat',
      ai: 'drone',
      energy: 4,
      enemyEnergy: 2,
      enemyHp: 75,
      maxTurns: 15,
      map: [
        '###########',
        '#.......E.#',
        '#.........#',
        '#.P.......#',
        '#.........#',
        '#.........#',
        '###########',
      ],
      api: ['move', 'fire', 'position', 'enemy', 'compare', 'while', 'variable', 'log'],
      briefing: `<p><code>enemy.y</code> is the drone's row and <code>bot.y</code> is yours. Compare them with <code>&lt;</code>, <code>&gt;</code> and <code>===</code> (exactly equal).</p>
        <p>⚠️ On screens, <strong>y grows downward</strong>: row 1 is near the top and row 5 is near the bottom. So <code>enemy.y &gt; bot.y</code> means the drone is <em>below</em> you.</p>
        <p>Store values in <strong>variables</strong> to keep code readable: <code>const gap = enemy.y - bot.y;</code>. The drone dodges after every turn, so your code has to aim fresh each time.</p>`,
      objective: 'Shoot down DRONE-1 (75 HP, 3 hits).',
      starter: `// Line up with the drone's row, then fire right.
if (enemy.y > bot.y) {
  bot.move("down");
}
`,
      hints: [
        'There are three cases: the drone is above you, below you, or in your row.',
        'Use while loops to move until bot.y === enemy.y, but keep 2 ⚡ for the shot, then bot.fire("right").',
      ],
      solution: `while (bot.y < enemy.y && bot.energy > 2) {
  bot.move("down");
}
while (bot.y > enemy.y && bot.energy > 2) {
  bot.move("up");
}
if (bot.y === enemy.y) {
  bot.fire("right");
}`,
      stars: [
        won,
        { text: 'Win in 6 turns or fewer', test: s => s.won && s.turns <= 6 },
        autopilotStar,
      ],
    },

    {
      id: 'rookie',
      title: 'First Duel: ROOKIE',
      concept: 'Putting it together',
      opponent: 'ROOKIE',
      persona: 'rookie',
      goal: 'defeat',
      ai: 'rookie',
      energy: 4,
      enemyEnergy: 3,
      maxTurns: 25,
      map: [
        '###########',
        '#.....C..E#',
        '#..#......#',
        '#..#..B#..#',
        '#......#..#',
        '#P..C.....#',
        '###########',
      ],
      api: ['move', 'fire', 'look', 'directionTo', 'enemy', 'forOf', 'log'],
      briefing: `<p>Your first real duel, and ROOKIE <strong>shoots back</strong>. Every hit takes 25 HP.</p>
        <p><code>bot.look(direction)</code> tells you what a laser would hit that way: <code>"enemy"</code>, <code>"wall"</code>, <code>"crate"</code>… Only fire when it says <code>"enemy"</code>.</p>
        <p><code>bot.directionTo(x, y)</code> returns which way to go to get closer to a tile. Crates block your path, but one laser shot breaks them. Grab the ⚡ battery for extra energy!</p>`,
      objective: 'Defeat ROOKIE.',
      starter: `// Get closer...
const dir = bot.directionTo(enemy.x, enemy.y);
bot.move(dir);

// ...and fire when you have a clear shot.
if (bot.look("right") === "enemy") {
  bot.fire("right");
}
`,
      hints: [
        'Check all four directions with bot.look() before you move.',
        'for (const dir of ["up", "down", "left", "right"]) { if (bot.look(dir) === "enemy") bot.fire(dir); }',
      ],
      solution: DUEL_SOLUTION,
      stars: [
        won,
        { text: 'Win with 50+ HP left', test: s => s.won && s.hp >= 50 },
        { text: 'Win in 10 turns or fewer', test: s => s.won && s.turns <= 10 },
      ],
    },

    {
      id: 'hunter',
      title: 'The HUNTER',
      concept: 'Functions & for…of',
      opponent: 'HUNTER',
      persona: 'hunter',
      goal: 'defeat',
      ai: 'hunter',
      energy: 4,
      enemyEnergy: 3,
      spawnEvery: 4,
      maxTurns: 25,
      map: [
        '###########',
        '#P...#....#',
        '#..C.#.C..#',
        '#.........#',
        '#..C.#.C..#',
        '#....#...E#',
        '###########',
      ],
      api: ['move', 'fire', 'shield', 'look', 'canHit', 'pathTo', 'function', 'forOf', 'log'],
      briefing: `<p>HUNTER doesn't wander around. It lines up shots and dodges yours. Time to organize your strategy into <strong>functions</strong>: named blocks of code you can call whenever you need them.</p>
<pre class="code-sample">function shootIfPossible() {
  for (const dir of ["up", "down", "left", "right"]) {
    if (bot.look(dir) === "enemy") {
      bot.fire(dir);
      return true;
    }
  }
  return false;
}</pre>
        <p><code>for…of</code> loops over every item in an array. <code>return</code> hands back a value <em>and</em> exits the function early.</p>
        <p>Defend yourself too: <code>enemy.canHit(x, y)</code> says whether the enemy could shoot tile (x, y), and <code>bot.shield()</code> (2 ⚡) blocks the next hit.</p>`,
      objective: 'Defeat HUNTER.',
      starter: `function shootIfPossible() {
  for (const dir of ["up", "down", "left", "right"]) {
    if (bot.look(dir) === "enemy") {
      bot.fire(dir);
      return true;
    }
  }
  return false;
}

shootIfPossible();

// Then what? Move closer? Hide? Shield?
`,
      hints: [
        'A good turn: shoot if you can, otherwise move toward the enemy, and never end your turn where enemy.canHit(bot.x, bot.y) is true.',
        'bot.pathTo(enemy.x, enemy.y) gives an array of directions around walls. bot.move(path[0]) takes the first step.',
      ],
      solution: DUEL_SOLUTION,
      stars: [
        won,
        autopilotStar,
        { text: 'Win with 50+ HP left', test: s => s.won && s.hp >= 50 },
      ],
    },

    {
      id: 'boss',
      title: 'Boss: BYTE-9000',
      concept: 'Strategy & memory',
      opponent: 'BYTE-9000',
      persona: 'boss',
      goal: 'defeat',
      ai: 'boss',
      energy: 4,
      enemyEnergy: 4,
      enemyHp: 125,
      spawnEvery: 3,
      maxTurns: 30,
      map: [
        '###########',
        '#P..#...C.#',
        '#.C...#...#',
        '#...#...#.#',
        '#.#...#...#',
        '#.C...#..E#',
        '###########',
      ],
      api: ['move', 'fire', 'shield', 'look', 'canHit', 'pathTo', 'arena', 'memory', 'function', 'forOf', 'log'],
      briefing: `<p>BYTE-9000 has <strong>125 HP</strong> and 4 ⚡ per turn. It uses shields, dodges your shots, and grabs repair kits when it's hurt. You'll need everything you've learned.</p>
        <p>New tool: <code>memory</code> is an object that <strong>survives between turns</strong> (normal variables reset every turn). Use it to count things or switch strategies: <code>memory.turnsHiding = (memory.turnsHiding || 0) + 1;</code></p>
        <p><code>arena.pickups</code> is an <strong>array</strong> of <code>{ x, y, type }</code> objects. Repair kits heal 30 HP, if you get there first.</p>`,
      objective: 'Defeat BYTE-9000.',
      starter: `// Start from your best strategy so far, then improve it!
function shootIfPossible() {
  for (const dir of ["up", "down", "left", "right"]) {
    if (bot.look(dir) === "enemy") {
      bot.fire(dir);
      return true;
    }
  }
  return false;
}

shootIfPossible();
`,
      hints: [
        'Win the damage race: shoot, then step out of the line of fire before your turn ends.',
        'When you\'re hurt, go for repair kits: arena.pickups.find(p => p.type === "repair").',
      ],
      solution: DUEL_SOLUTION,
      solutionNote: 'Heads up: this strategy only beats BYTE-9000 about half the time. Improve it (repair kits! shields!) to win reliably.',
      stars: [
        won,
        autopilotStar,
        { text: 'Win in 15 turns or fewer', test: s => s.won && s.turns <= 15 },
      ],
    },
  ];
})();
