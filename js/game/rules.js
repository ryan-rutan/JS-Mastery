// Code Clash rules: pure game logic with no DOM access.
//
// The page uses it to run the CPU's turns, and it is ALSO converted to a string
// (ClashRules.toString()) and loaded into a Web Worker that runs the player's
// code safely. So this function must not reference anything outside itself.
function ClashRules() {
  'use strict';

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const DIR_NAMES = ['up', 'down', 'left', 'right'];
  const COST = { move: 1, fire: 2, shield: 2 };
  const DAMAGE = 25;
  const REPAIR = 30;
  const BATTERY = 2;
  const MAX_CALLS = 300;

  // ---------- Setup ----------
  // Map legend: # wall, . floor, C crate, G goal, T target, B battery,
  // R repair kit, P player start, E enemy start.
  function createState(m) {
    const tiles = [], targets = [], pickups = [];
    let player = null, enemy = null, goal = null, n = 0;
    m.map.forEach((row, y) => {
      tiles.push(row.split('').map((ch, x) => {
        switch (ch) {
          case '#': return '#';
          case 'C': return 'C';
          case 'G': goal = { x, y }; return 'G';
          case 'P': player = makeBot(x, y, m.playerHp || 100, 'right'); return '.';
          case 'E': enemy = makeBot(x, y, m.enemyHp || 100, 'left'); return '.';
          case 'T': targets.push({ id: 't' + n++, x, y }); return '.';
          case 'B': pickups.push({ id: 'p' + n++, x, y, type: 'battery' }); return '.';
          case 'R': pickups.push({ id: 'p' + n++, x, y, type: 'repair' }); return '.';
          default: return '.';
        }
      }));
    });
    const state = {
      w: tiles[0].length, h: tiles.length, tiles, player, enemy, targets, pickups, goal,
      mode: m.goal, ai: m.ai || null,
      energy: m.energy || 4, enemyEnergy: m.enemyEnergy || 3,
      spawnEvery: m.spawnEvery || 0,
      turn: 1, over: null, memory: {}, nextId: n,
      stats: { shots: 0, hits: 0, bonks: 0 },
    };
    player.energy = state.energy;
    return state;
  }

  function makeBot(x, y, hp, facing) {
    return { x, y, hp, maxHp: hp, energy: 0, shielded: false, facing };
  }

  // ---------- Queries ----------
  const inBounds = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
  const tileAt = (s, x, y) => (inBounds(s, x, y) ? s.tiles[y][x] : null);
  const targetAt = (s, x, y) => s.targets.find(t => t.x === x && t.y === y) || null;

  function botAt(s, x, y, ignore) {
    for (const who of ['player', 'enemy']) {
      const b = s[who];
      if (b && who !== ignore && b.hp > 0 && b.x === x && b.y === y) return who;
    }
    return null;
  }

  function isBlocked(s, x, y, ignore) {
    const t = tileAt(s, x, y);
    if (t === null || t === '#' || t === 'C') return true;
    return !!(targetAt(s, x, y) || botAt(s, x, y, ignore));
  }

  // Follow a laser from (x, y) in `dir` until it hits something.
  function trace(s, x, y, dir, ignore) {
    const [dx, dy] = DIRS[dir];
    let cx = x + dx, cy = y + dy;
    for (;;) {
      const t = tileAt(s, cx, cy);
      if (t === null) return { what: 'edge', x: cx, y: cy };
      if (t === '#') return { what: 'wall', x: cx, y: cy };
      if (t === 'C') return { what: 'crate', x: cx, y: cy };
      const tg = targetAt(s, cx, cy);
      if (tg) return { what: 'target', x: cx, y: cy, id: tg.id };
      const b = botAt(s, cx, cy, ignore);
      if (b) return { what: b, x: cx, y: cy };
      cx += dx; cy += dy;
    }
  }

  // Could a laser fired from (ax, ay) reach tile (bx, by) in a straight line?
  function clearLine(s, ax, ay, bx, by, ignore) {
    if ((ax !== bx && ay !== by) || (ax === bx && ay === by)) return false;
    const end = tileAt(s, bx, by);
    if (end === null || end === '#' || end === 'C') return false;
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    let cx = ax + dx, cy = ay + dy;
    while (cx !== bx || cy !== by) {
      const t = tileAt(s, cx, cy);
      if (t === null || t === '#' || t === 'C' || targetAt(s, cx, cy) || botAt(s, cx, cy, ignore)) return false;
      cx += dx; cy += dy;
    }
    return true;
  }

  // Shortest route (array of directions) for `who` to reach (tx, ty).
  function pathTo(s, who, tx, ty) {
    const b = s[who];
    if (b.x === tx && b.y === ty) return [];
    const prev = new Map([[b.x + ',' + b.y, null]]);
    const queue = [[b.x, b.y]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const dir of DIR_NAMES) {
        const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1], key = nx + ',' + ny;
        if (prev.has(key) || !inBounds(s, nx, ny)) continue;
        const isGoal = nx === tx && ny === ty;
        if (!isGoal && isBlocked(s, nx, ny, who)) continue;
        prev.set(key, [x + ',' + y, dir]);
        if (isGoal) {
          const path = [];
          for (let k = key; prev.get(k); k = prev.get(k)[0]) path.unshift(prev.get(k)[1]);
          return path;
        }
        queue.push([nx, ny]);
      }
    }
    return [];
  }

  function whatsAt(s, x, y, viewer) {
    const t = tileAt(s, x, y);
    if (t === null) return 'outside';
    if (t === '#') return 'wall';
    if (t === 'C') return 'crate';
    const b = botAt(s, x, y);
    if (b) return b === viewer ? 'you' : 'enemy';
    if (targetAt(s, x, y)) return 'target';
    const p = s.pickups.find(q => q.x === x && q.y === y);
    if (p) return p.type;
    if (t === 'G') return 'goal';
    return 'floor';
  }

  // ---------- Actions (each pushes events describing what happened) ----------
  function spend(s, who, action, events) {
    const b = s[who], cost = COST[action];
    if (b.energy < cost) {
      events.push({ t: 'noenergy', who, action, cost, en: b.energy });
      return false;
    }
    b.energy -= cost;
    return true;
  }

  function move(s, who, dir, events) {
    const b = s[who];
    if (!spend(s, who, 'move', events)) return false;
    b.facing = dir;
    const nx = b.x + DIRS[dir][0], ny = b.y + DIRS[dir][1];
    if (isBlocked(s, nx, ny, who)) {
      if (who === 'player') s.stats.bonks++;
      events.push({ t: 'bonk', who, dir, x: b.x, y: b.y, en: b.energy });
      return false;
    }
    events.push({ t: 'move', who, dir, from: [b.x, b.y], to: [nx, ny], en: b.energy });
    b.x = nx;
    b.y = ny;
    const pi = s.pickups.findIndex(p => p.x === nx && p.y === ny);
    if (pi !== -1) {
      const p = s.pickups.splice(pi, 1)[0];
      if (p.type === 'battery') {
        b.energy += BATTERY;
        events.push({ t: 'pickup', who, id: p.id, type: p.type, x: nx, y: ny, text: '+' + BATTERY + ' ⚡', en: b.energy });
      } else {
        const healed = Math.min(b.maxHp, b.hp + REPAIR) - b.hp;
        b.hp += healed;
        events.push({ t: 'pickup', who, id: p.id, type: p.type, x: nx, y: ny, text: '+' + healed + ' HP', hp: b.hp });
      }
    }
    if (who === 'player' && s.mode === 'reach' && s.goal && nx === s.goal.x && ny === s.goal.y) {
      events.push({ t: 'goal', x: nx, y: ny });
      finish(s, 'win', 'You reached the goal!', events);
    }
    return true;
  }

  function fire(s, who, dir, events) {
    const b = s[who];
    if (!spend(s, who, 'fire', events)) return null;
    b.facing = dir;
    const hit = trace(s, b.x, b.y, dir, who);
    events.push({ t: 'fire', who, dir, from: [b.x, b.y], to: [hit.x, hit.y], what: hit.what, en: b.energy });
    if (who === 'player') s.stats.shots++;

    if (hit.what === 'crate') {
      s.tiles[hit.y][hit.x] = '.';
      events.push({ t: 'crate', x: hit.x, y: hit.y });
    } else if (hit.what === 'target') {
      s.targets = s.targets.filter(t => t.id !== hit.id);
      if (who === 'player') s.stats.hits++;
      events.push({ t: 'target', id: hit.id, x: hit.x, y: hit.y, left: s.targets.length });
      if (s.mode === 'targets' && s.targets.length === 0) finish(s, 'win', 'All targets destroyed!', events);
    } else if (hit.what === 'player' || hit.what === 'enemy') {
      const victim = s[hit.what];
      if (who === 'player') s.stats.hits++;
      if (victim.shielded) {
        victim.shielded = false;
        events.push({ t: 'blocked', who: hit.what });
      } else {
        victim.hp = Math.max(0, victim.hp - DAMAGE);
        events.push({ t: 'damage', who: hit.what, by: who, amount: DAMAGE, hp: victim.hp });
        if (victim.hp === 0) {
          events.push({ t: 'destroyed', who: hit.what });
          if (hit.what === 'enemy') finish(s, 'win', 'Enemy destroyed!', events);
          else finish(s, 'lose', 'Your bot was destroyed.', events);
        }
      }
    }
    return hit.what;
  }

  function shield(s, who, events) {
    const b = s[who];
    if (b.shielded) {
      events.push({ t: 'info', who, text: 'Shield is already up' });
      return false;
    }
    if (!spend(s, who, 'shield', events)) return false;
    b.shielded = true;
    events.push({ t: 'shield', who, en: b.energy });
    return true;
  }

  function finish(s, result, reason, events) {
    if (s.over) return;
    s.over = { result, reason };
    events.push({ t: 'over', result, reason });
  }

  // Called at the start of each bot's turn: refill energy, drop old shields,
  // and sometimes spawn a pickup.
  function startTurn(s, who, rng) {
    rng = rng || Math.random;
    const events = [], b = s[who];
    if (!b || s.over) return events;
    if (b.shielded) {
      b.shielded = false;
      events.push({ t: 'shieldDown', who });
    }
    b.energy = who === 'player' ? s.energy : s.enemyEnergy;
    if (who === 'player' && s.spawnEvery && s.turn > 1 && s.turn % s.spawnEvery === 0 && s.pickups.length < 2) {
      spawnPickup(s, rng, events);
    }
    return events;
  }

  function spawnPickup(s, rng, events) {
    const far = (who, x, y) => !s[who] || Math.abs(s[who].x - x) + Math.abs(s[who].y - y) >= 2;
    const free = [];
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (s.tiles[y][x] !== '.' || isBlocked(s, x, y) || s.pickups.some(p => p.x === x && p.y === y)) continue;
        if (far('player', x, y) && far('enemy', x, y)) free.push([x, y]);
      }
    }
    if (!free.length) return;
    const [x, y] = free[Math.floor(rng() * free.length)];
    const hurt = s.player.hp < s.player.maxHp * 0.6 || (s.enemy && s.enemy.hp < s.enemy.maxHp * 0.6);
    const type = rng() < (hurt ? 0.65 : 0.4) ? 'repair' : 'battery';
    const p = { id: 'p' + s.nextId++, x, y, type };
    s.pickups.push(p);
    events.push({ t: 'spawn', id: p.id, type, x, y });
  }

  // ---------- CPU opponents ----------
  // Every tile from which `shooter` would have a clear shot at `targetWho`.
  function firingLines(s, targetWho) {
    const t = s[targetWho], set = new Set();
    for (const dir of DIR_NAMES) {
      const [dx, dy] = DIRS[dir];
      let x = t.x + dx, y = t.y + dy;
      for (;;) {
        const tile = tileAt(s, x, y);
        if (tile === null || tile === '#' || tile === 'C' || targetAt(s, x, y)) break;
        set.add(x + ',' + y);
        x += dx; y += dy;
      }
    }
    return set;
  }

  // Distance (in moves) from every reachable tile to the nearest tile in `sources`.
  function distanceMap(s, sources, mover) {
    const dist = new Map(), queue = [];
    for (const key of sources) {
      const [x, y] = key.split(',').map(Number);
      if (!isBlocked(s, x, y, mover)) { dist.set(key, 0); queue.push([x, y]); }
    }
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], d = dist.get(x + ',' + y);
      for (const dir of DIR_NAMES) {
        const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1], key = nx + ',' + ny;
        if (dist.has(key) || isBlocked(s, nx, ny, mover)) continue;
        dist.set(key, d + 1);
        queue.push([nx, ny]);
      }
    }
    return dist;
  }

  function shotAt(s, who, targetWho) {
    const b = s[who];
    for (const dir of DIR_NAMES) if (trace(s, b.x, b.y, dir, who).what === targetWho) return dir;
    return null;
  }

  function openMoves(s, who) {
    const b = s[who];
    return DIR_NAMES.filter(dir => !isBlocked(s, b.x + DIRS[dir][0], b.y + DIRS[dir][1], who));
  }

  const pick = (rng, list) => list[Math.floor(rng() * list.length)];

  function command(s, lines, action, arg, comment) {
    const call = (s.ai === 'drone' ? 'drone' : 'cpu') + '.' + action + '(' + (arg ? '"' + arg + '"' : '') + ');';
    lines.push(comment ? call.padEnd(21) + ' // ' + comment : call);
  }

  function droneBrain(s, rng, events, lines) {
    const me = s.enemy;
    let dir = rng() < 0.5 ? 'up' : 'down';
    const steps = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < steps && !s.over; i++) {
      if (isBlocked(s, me.x, me.y + DIRS[dir][1], 'enemy')) dir = dir === 'up' ? 'down' : 'up';
      if (isBlocked(s, me.x, me.y + DIRS[dir][1], 'enemy')) break;
      command(s, lines, 'move', dir, i === 0 ? pick(rng, ['bzzt', 'evasive maneuvers', 'wheee']) : '');
      move(s, 'enemy', dir, events);
    }
  }

  function rookieBrain(s, rng, events, lines) {
    const me = s.enemy, foe = s.player;
    for (let guard = 0; guard < 12 && !s.over && me.energy > 0; guard++) {
      const shot = shotAt(s, 'enemy', 'player');
      if (shot && me.energy >= COST.fire && rng() < 0.7) {
        command(s, lines, 'fire', shot, pick(rng, ['pew pew!', 'I see you!', 'is this how it works?']));
        fire(s, 'enemy', shot, events);
        continue;
      }
      const options = openMoves(s, 'enemy');
      if (!options.length) break;
      let dir = pick(rng, options);
      if (rng() < 0.5) {
        const closer = options.filter(d => {
          const nx = me.x + DIRS[d][0], ny = me.y + DIRS[d][1];
          return Math.abs(foe.x - nx) + Math.abs(foe.y - ny) < Math.abs(foe.x - me.x) + Math.abs(foe.y - me.y);
        });
        if (closer.length) dir = pick(rng, closer);
      }
      command(s, lines, 'move', dir, guard === 0 ? pick(rng, ['exploring!', 'um...', 'this way?']) : '');
      move(s, 'enemy', dir, events);
    }
  }

  // How reliably each CPU dodges after shooting and raises shields when exposed.
  // Imperfect on purpose: a perfect opponent makes every duel a foregone conclusion.
  const SKILL = {
    hunter: { dodge: 0.6, shield: 0.5, smart: false },
    boss: { dodge: 0.75, shield: 0.9, smart: true },
  };

  // HUNTER and BYTE-9000: line up shots, avoid the player's firing lines,
  // and shield when caught in the open. Each fires once per turn. The boss
  // (`smart`) also hunts repair kits and gets a follow-up shot when the first
  // one is blocked by a shield, so turtling behind shields won't work.
  function hunterBrain(s, rng, events, lines, skill) {
    const me = s.enemy, smart = skill.smart;
    let shotsLeft = 1;
    for (let guard = 0; guard < 16 && !s.over && me.energy > 0; guard++) {
      const danger = firingLines(s, 'player');
      const here = me.x + ',' + me.y;
      const exposed = danger.has(here);

      // 1. Shoot whenever we're lined up.
      if (exposed && shotsLeft > 0 && me.energy >= COST.fire) {
        const shot = shotAt(s, 'enemy', 'player');
        if (shot) {
          const wasShielded = s.player.shielded;
          command(s, lines, 'fire', shot, pick(rng, wasShielded ? ['shield breaker', 'knock knock'] : ['target locked', 'gotcha', 'firing']));
          fire(s, 'enemy', shot, events);
          shotsLeft--;
          if (smart && wasShielded) shotsLeft++;
          continue;
        }
      }

      // 2. Hurt? Go for a nearby repair kit.
      if (smart && me.hp <= me.maxHp * 0.5) {
        const kits = new Set(s.pickups.filter(p => p.type === 'repair').map(p => p.x + ',' + p.y));
        if (kits.size) {
          const toKit = distanceMap(s, kits, 'enemy');
          const d = toKit.get(here);
          if (d !== undefined && d <= me.energy) {
            const dir = bestStep(s, toKit, () => 0);
            if (dir) { command(s, lines, 'move', dir, 'repairs!'); move(s, 'enemy', dir, events); continue; }
          }
        }
      }

      // 3. Move into a firing position if we can still shoot this turn.
      const dist = distanceMap(s, danger, 'enemy');
      const d = dist.has(here) ? dist.get(here) : Infinity;
      if (shotsLeft > 0 && d > 0 && d <= me.energy - COST.fire) {
        const dir = bestStep(s, dist, () => 0);
        if (dir) { command(s, lines, 'move', dir, 'flanking'); move(s, 'enemy', dir, events); continue; }
      }

      // 4. Otherwise stay close but out of the line of fire
      //    (unless it gets greedy and forgets to dodge).
      if (exposed && rng() > skill.dodge) {
        lines.push('// ...should I dodge? nah.');
        break;
      }
      const score = key => (danger.has(key) ? 100 : 0) + (dist.has(key) ? dist.get(key) : 50);
      let best = null, bestScore = score(here);
      for (const dir of openMoves(s, 'enemy')) {
        const key = (me.x + DIRS[dir][0]) + ',' + (me.y + DIRS[dir][1]);
        if (score(key) < bestScore) { best = dir; bestScore = score(key); }
      }
      if (!best) break;
      command(s, lines, 'move', best, exposed ? 'dodging' : 'repositioning');
      move(s, 'enemy', best, events);
    }

    // 5. Caught in the open at the end of the turn? Shields up.
    if (!s.over && me.energy >= COST.shield && !me.shielded && rng() < skill.shield &&
        firingLines(s, 'player').has(me.x + ',' + me.y)) {
      command(s, lines, 'shield', null, 'shields up');
      shield(s, 'enemy', events);
    }
  }

  // The neighboring move that most reduces the distance in `dist`.
  function bestStep(s, dist, tieBreak) {
    const me = s.enemy;
    let best = null, bestD = dist.has(me.x + ',' + me.y) ? dist.get(me.x + ',' + me.y) : Infinity;
    for (const dir of openMoves(s, 'enemy')) {
      const key = (me.x + DIRS[dir][0]) + ',' + (me.y + DIRS[dir][1]);
      const d = dist.has(key) ? dist.get(key) + tieBreak(dir) : Infinity;
      if (d < bestD) { best = dir; bestD = d; }
    }
    return best;
  }

  function aiTurn(s, rng) {
    rng = rng || Math.random;
    const events = [], lines = [];
    if (!s.enemy || s.over || !s.ai || s.enemy.hp <= 0) return { events, lines };
    if (s.ai === 'drone') droneBrain(s, rng, events, lines);
    else if (s.ai === 'rookie') rookieBrain(s, rng, events, lines);
    else hunterBrain(s, rng, events, lines, SKILL[s.ai] || SKILL.hunter);
    if (!lines.length) lines.push('// waiting...');
    return { events, lines };
  }

  // ---------- Running the player's code ----------
  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }

  function closest(word, options) {
    let best = null, bestD = Infinity;
    for (const o of options) {
      const d = levenshtein(String(word).toLowerCase(), o.toLowerCase());
      if (d < bestD) { best = o; bestD = d; }
    }
    return bestD <= Math.max(2, Math.floor(String(word).length / 3)) ? best : null;
  }

  function describeValue(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'string') return '"' + v + '"';
    if (typeof v === 'function') return 'a function';
    if (typeof v === 'object') return Array.isArray(v) ? 'an array' : 'an object';
    return typeof v + ' ' + String(v);
  }

  function format(v, depth) {
    depth = depth || 0;
    if (typeof v === 'string') return depth ? JSON.stringify(v) : v;
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
    if (typeof v !== 'object') return String(v);
    if (depth > 2) return Array.isArray(v) ? '[…]' : '{…}';
    try {
      if (Array.isArray(v)) return '[' + v.map(x => format(x, depth + 1)).join(', ') + ']';
      return '{ ' + Object.keys(v).map(k => k + ': ' + format(v[k], depth + 1)).join(', ') + ' }';
    } catch (e) {
      return String(v);
    }
  }

  // Wraps an API object so typos produce friendly "did you mean" errors
  // and assignments like bot.x = 5 are refused.
  function guard(name, obj) {
    const keys = Object.keys(obj);
    return new Proxy(obj, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol' || prop in target) return Reflect.get(target, prop, receiver);
        if (prop === 'toJSON' || prop === 'then') return undefined;
        const best = closest(prop, keys);
        throw new TypeError(name + '.' + prop + " doesn't exist." +
          (best ? ' Did you mean ' + name + '.' + best + '?' : ' Try: ' + keys.join(', ')));
      },
      set(target, prop) {
        let extra = '';
        if (name === 'bot' && (prop === 'x' || prop === 'y')) extra = ' No teleporting! Use bot.move().';
        if (name === 'enemy' && prop === 'hp') extra = ' Nice try. 😏 Use bot.fire().';
        if (name === 'bot' && (prop === 'hp' || prop === 'energy')) extra = ' Nice try. 😏';
        throw new TypeError("You can't change " + name + '.' + String(prop) + ' directly.' + extra);
      },
    });
  }

  function runPlayerCode(s, code) {
    const events = [];
    const me = s.player;
    const STOP = { stop: true };
    let calls = 0, noEnergy = 0, says = 0;

    function act(fn) {
      if (s.over) throw STOP;
      if (++calls > MAX_CALLS) throw new Error('Too many commands in one turn (over ' + MAX_CALLS + '). Is a loop running forever?');
      const start = events.length;
      const result = fn();
      // Only report the first "out of energy" per turn.
      for (let i = start; i < events.length; i++) {
        if (events[i].t === 'noenergy' && ++noEnergy > 1) { events.splice(i, 1); i--; }
      }
      if (s.over) throw STOP;
      return result;
    }

    function checkDir(dir, fn, owner) {
      owner = owner || 'bot';
      if (typeof dir !== 'string') {
        throw new TypeError(owner + '.' + fn + '() needs a direction in quotes, like ' + owner + '.' + fn + '("right"), but got ' + describeValue(dir) + '.');
      }
      if (!Object.prototype.hasOwnProperty.call(DIRS, dir)) {
        const lower = dir.trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(DIRS, lower)) {
          throw new TypeError('"' + dir + '" should be "' + lower + '". Strings are case-sensitive, and directions are lowercase!');
        }
        const best = closest(dir, DIR_NAMES);
        throw new TypeError('"' + dir + '" isn\'t a direction.' + (best ? ' Did you mean "' + best + '"?' : '') + ' Use "up", "down", "left" or "right".');
      }
    }

    function checkXY(x, y, fn, owner) {
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new TypeError((owner || 'bot') + '.' + fn + '(x, y) needs two numbers, like ' + (owner || 'bot') + '.' + fn + '(3, 2), but got ' + describeValue(x) + ' and ' + describeValue(y) + '.');
      }
    }

    const bot = guard('bot', {
      get x() { return me.x; },
      get y() { return me.y; },
      get hp() { return me.hp; },
      get maxHp() { return me.maxHp; },
      get energy() { return me.energy; },
      get shielded() { return me.shielded; },
      get facing() { return me.facing; },
      move(dir) { checkDir(dir, 'move'); return act(() => move(s, 'player', dir, events)); },
      fire(dir) { checkDir(dir, 'fire'); return act(() => fire(s, 'player', dir, events)); },
      shield() { return act(() => shield(s, 'player', events)); },
      say(text) {
        if (++says <= 3) events.push({ t: 'say', who: 'player', text: format(text).slice(0, 80) });
      },
      canMove(dir) {
        checkDir(dir, 'canMove');
        return !isBlocked(s, me.x + DIRS[dir][0], me.y + DIRS[dir][1], 'player');
      },
      look(dir) { checkDir(dir, 'look'); return trace(s, me.x, me.y, dir, 'player').what; },
      directionTo(x, y) {
        checkXY(x, y, 'directionTo');
        const dx = x - me.x, dy = y - me.y;
        if (!dx && !dy) return null;
        if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
        return dy > 0 ? 'down' : 'up';
      },
      distanceTo(x, y) { checkXY(x, y, 'distanceTo'); return Math.abs(x - me.x) + Math.abs(y - me.y); },
      pathTo(x, y) { checkXY(x, y, 'pathTo'); return pathTo(s, 'player', x, y); },
    });

    const enemy = s.enemy ? guard('enemy', {
      get x() { return s.enemy.x; },
      get y() { return s.enemy.y; },
      get hp() { return s.enemy.hp; },
      get maxHp() { return s.enemy.maxHp; },
      get shielded() { return s.enemy.shielded; },
      canHit(x, y) {
        checkXY(x, y, 'canHit', 'enemy');
        return s.enemy.hp > 0 && clearLine(s, s.enemy.x, s.enemy.y, x, y, 'player');
      },
    }) : null;

    const arena = guard('arena', {
      width: s.w,
      height: s.h,
      get goal() { return s.goal ? { x: s.goal.x, y: s.goal.y } : null; },
      get targets() { return s.targets.map(t => ({ x: t.x, y: t.y })); },
      get pickups() { return s.pickups.map(p => ({ x: p.x, y: p.y, type: p.type })); },
      isWall(x, y) { checkXY(x, y, 'isWall', 'arena'); const t = tileAt(s, x, y); return t === null || t === '#'; },
      isFree(x, y) { checkXY(x, y, 'isFree', 'arena'); return !isBlocked(s, x, y, 'player'); },
      whatsAt(x, y) { checkXY(x, y, 'whatsAt', 'arena'); return whatsAt(s, x, y, 'player'); },
    });

    const log = level => (...args) => events.push({ t: 'log', level, text: args.map(a => format(a)).join(' ') });
    const consoleApi = { log: log('log'), info: log('log'), warn: log('warn'), error: log('error') };

    let fn;
    try {
      fn = new Function('bot', 'enemy', 'arena', 'memory', 'turn', 'console', '"use strict";\n' + code);
    } catch (err) {
      return { error: errorInfo(err), events: [] };
    }
    try {
      fn(bot, enemy, arena, s.memory, s.turn, consoleApi);
    } catch (err) {
      if (err !== STOP) return { error: errorInfo(err), events: events.filter(e => e.t === 'log') };
    }
    return { events, state: s };
  }

  // Line numbers: new Function adds a 2-line header, plus our "use strict" line.
  function errorInfo(err) {
    const info = { name: (err && err.name) || 'Error', message: (err && err.message) || String(err) };
    const stack = (err && err.stack) || '';
    const m = /<anonymous>:(\d+):\d+/.exec(stack) || /> Function:(\d+):\d+/.exec(stack);
    if (m) info.line = Number(m[1]) - 3;
    return info;
  }

  // Characters of code, ignoring comments and whitespace.
  function codeSize(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '').length;
  }

  return {
    DIRS, DIR_NAMES, COST, DAMAGE, SKILL,
    createState, startTurn, aiTurn, runPlayerCode, finish,
    move, fire, shield, trace, isBlocked, pathTo, whatsAt, firingLines, codeSize,
  };
}
