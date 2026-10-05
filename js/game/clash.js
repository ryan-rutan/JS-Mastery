// Code Clash: a turn-based robot duel you play by writing JavaScript.
// - Rendering & animation: Phaser 3, loaded from a CDN only when a mission opens.
// - Your code runs in a Web Worker against ClashRules (rules.js), so infinite
//   loops get stopped and the page stays responsive.
// - The CPU opponents' AI also lives in ClashRules and runs on the page.
(function () {
  const PHASER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js';
  const TILE = 64, OX = 30, OY = 26;
  const W = OX + 11 * TILE + 10, H = OY + 7 * TILE + 10;
  const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const R = ClashRules();
  const DIRV = R.DIRS;
  const MISSIONS = window.CLASH_MISSIONS;
  const cx = x => OX + x * TILE + TILE / 2;
  const cy = y => OY + y * TILE + TILE / 2;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pickOne = list => list[Math.floor(Math.random() * list.length)];

  const COLORS = {
    player: 0xf7df1e, enemy: 0xff4d6d, drone: 0xb07cff, ink: 0x0b0f17, shield: 0x5ad1ff,
    laser: { player: 0xffe94d, enemy: 0xff4d6d },
    hpGood: 0x3ddc84, hpMid: 0xf7c948, hpLow: 0xff4d6d,
  };

  // The CPU's personality, from its own point of view.
  const PERSONAS = {
    trainer: {
      name: 'BYTE-9000',
      hello: ['Training simulation loaded. Try not to crash.', 'Ah, a new programmer. How... adorable.', 'Show me what your code can do, human.'],
      playerWon: ['Acceptable. Proceed to the next test.', 'Hmm. Not terrible. For a human.', 'Impressive... I mean, adequate.'],
      playerLost: ['Simulation failed. Debug and retry.', 'Out of turns. Perhaps... a loop?'],
      error: ['A bug? Already? Fascinating.', 'Error detected. In YOUR code. Obviously.'],
    },
    drone: {
      name: 'DRONE-1',
      hello: ['bzzt. target acquired... wait, I AM the target?', 'bzzt bzzt. catch me if you can.'],
      hurt: ['bzzt! ow!', 'my propellers!', 'not the face! bzzt!'],
      playerWon: ['bzzt... *fizz* ...'],
      playerLost: ['bzzt. survived. bzzt.'],
      error: ['bzzt? your code is broken. bzzt.'],
    },
    rookie: {
      name: 'ROOKIE',
      hello: ['Hi! I just learned to code yesterday!', 'Let\'s have a fun, fair fight!'],
      hit: ['Wait, did I actually hit you?!', 'Beginner\'s luck!', 'Mom! I\'m doing it!'],
      hurt: ['Ouch!', 'Hey, no fair!', 'Was that a for loop?!'],
      playerWon: ['GG! You\'re really good at this.'],
      playerLost: ['I... won? I WON!'],
      error: ['Um, I think your code has a bug?'],
    },
    hunter: {
      name: 'HUNTER',
      hello: ['Target acquired.', 'You can run. Your code can\'t.'],
      hit: ['Predictable.', 'Your code is too slow.', 'Got you in my sights.'],
      hurt: ['Lucky shot.', 'Recalculating...', 'Hmph.'],
      playerWon: ['Impossible... the hunter... hunted.'],
      playerLost: ['Hunt complete.'],
      error: ['Debugging under fire? Bold.'],
    },
    boss: {
      name: 'BYTE-9000',
      hello: ['I have computed 14 million futures. You lose in all of them.', 'Finally, the student faces the teacher.'],
      hit: ['Syntax error: your defense.', '404: dodge not found.', 'Have you tried turning your strategy off and on again?', 'Bullseye.'],
      hurt: ['A minor exception. Handled.', 'Impossible... recalculating.', 'You will regret that semicolon.'],
      playerWon: ['Fatal error... well played, human.', 'Shutting... down... GG.'],
      playerLost: ['Game over. Insert more code.', 'As computed.'],
      error: ['Your code crashed. My code never crashes.'],
    },
  };

  // Command reference. Each mission lists which entries to show.
  const API = {
    move: { sig: 'bot.move(direction)', cost: '1⚡', desc: 'Move one tile: "up", "down", "left" or "right". Returns true if you moved.', snippet: 'bot.move("right");' },
    fire: { sig: 'bot.fire(direction)', cost: '2⚡', desc: 'Shoot a laser in a straight line. Returns what it hit.', snippet: 'bot.fire("right");' },
    shield: { sig: 'bot.shield()', cost: '2⚡', desc: 'Blocks the next hit, until your next turn.', snippet: 'bot.shield();' },
    say: { sig: 'bot.say(text)', cost: 'free', desc: 'Speech bubble. Trash talk encouraged.', snippet: 'bot.say("Beep boop!");' },
    log: { sig: 'console.log(value)', cost: 'free', desc: 'Print anything to the battle log. Great for debugging.', snippet: 'console.log(bot.x, bot.y);' },
    position: { sig: 'bot.x   bot.y', desc: 'Your column and row. y grows DOWNWARD.', snippet: 'console.log("I am at", bot.x, bot.y);' },
    energy: { sig: 'bot.energy   bot.hp', desc: 'Energy left this turn, and your health.', snippet: 'console.log("Energy left:", bot.energy);' },
    canMove: { sig: 'bot.canMove(direction)', desc: 'true if the next tile that way is free.', snippet: 'if (bot.canMove("right")) {\n  bot.move("right");\n}' },
    look: { sig: 'bot.look(direction)', desc: 'What a laser would hit: "enemy", "wall", "crate"…', snippet: 'if (bot.look("up") === "enemy") {\n  bot.fire("up");\n}' },
    enemy: { sig: 'enemy.x   enemy.y   enemy.hp', desc: 'The enemy\'s position and health.', snippet: 'console.log("Enemy at", enemy.x, enemy.y);' },
    canHit: { sig: 'enemy.canHit(x, y)', desc: 'true if the enemy could shoot tile (x, y).', snippet: 'if (enemy.canHit(bot.x, bot.y)) {\n  bot.shield();\n}' },
    directionTo: { sig: 'bot.directionTo(x, y)', desc: 'Which way to step to get closer to (x, y). Ignores walls.', snippet: 'bot.move(bot.directionTo(enemy.x, enemy.y));' },
    pathTo: { sig: 'bot.pathTo(x, y)', desc: 'Array of directions: the shortest route around walls.', snippet: 'const path = bot.pathTo(enemy.x, enemy.y);\nif (path.length > 0) bot.move(path[0]);' },
    arena: { sig: 'arena.pickups', desc: 'Array of { x, y, type } for batteries and repair kits.', snippet: 'const kit = arena.pickups.find(p => p.type === "repair");' },
    memory: { sig: 'memory', desc: 'An object that remembers values between turns.', snippet: 'memory.turnCount = (memory.turnCount || 0) + 1;' },
    for: { sig: 'for loop', desc: 'Repeat code a set number of times.', snippet: 'for (let i = 0; i < 3; i++) {\n  bot.move("right");\n}' },
    while: { sig: 'while loop', desc: 'Repeat while a condition is true.', snippet: 'while (bot.energy > 0) {\n  bot.move("right");\n}' },
    if: { sig: 'if / else', desc: 'Do one thing or another.', snippet: 'if (bot.canMove("right")) {\n  bot.move("right");\n} else {\n  bot.move("down");\n}' },
    compare: { sig: '<   >   ===', desc: 'Compare values to make decisions.', snippet: 'if (enemy.y > bot.y) {\n  bot.move("down");\n}' },
    variable: { sig: 'const name = value', desc: 'Store a value under a name.', snippet: 'const gap = enemy.y - bot.y;' },
    forOf: { sig: 'for…of', desc: 'Loop over every item in an array.', snippet: 'for (const dir of ["up", "down", "left", "right"]) {\n  if (bot.look(dir) === "enemy") bot.fire(dir);\n}' },
    function: { sig: 'function name() { }', desc: 'Name a block of code, then call it.', snippet: 'function attack() {\n  // ...\n}\n\nattack();' },
  };

  // ---------- Save data ----------
  // save.goals[missionId] = which of the 3 star goals have ever been achieved,
  // so stars can be collected across different runs. save.stars holds the counts.
  function loadSave(store) {
    const s = store.get('jsm-clash', null) || {};
    s.stars = s.stars || {};
    s.goals = s.goals || {};
    return s;
  }
  const isUnlocked = (save, i) => i === 0 || save.unlockAll || (save.stars[MISSIONS[i - 1].id] || 0) > 0;
  const totalStars = save => MISSIONS.reduce((n, m) => n + (save.stars[m.id] || 0), 0);

  // ---------- Sound effects (synthesized, no audio files) ----------
  const Sfx = (() => {
    let ac = null, master = null, noiseBuf = null, muted = false;
    function ctx() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.45;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(type, f1, f2, dur, vol, delay) {
      if (muted) return;
      const a = ctx();
      if (!a) return;
      const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    function noise(dur, vol, f1, f2) {
      if (muted) return;
      const a = ctx();
      if (!a) return;
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = a.currentTime, src = a.createBufferSource(), filter = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noiseBuf;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(f1, t);
      filter.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + dur);
    }
    const arp = (type, notes, gap, dur, vol) => notes.forEach((f, i) => tone(type, f, f, dur, vol, i * gap));
    return {
      get muted() { return muted; },
      setMuted(m) { muted = m; },
      unlock() { if (!muted) ctx(); },
      move() { tone('triangle', 260, 420, 0.07, 0.12); },
      bonk() { tone('square', 150, 70, 0.13, 0.1); },
      laser(enemy) { tone('sawtooth', enemy ? 900 : 1500, enemy ? 110 : 220, 0.2, 0.08); },
      hit() { noise(0.25, 0.35, 2600, 300); tone('square', 200, 60, 0.18, 0.08); },
      block() { tone('sine', 900, 1600, 0.16, 0.14); },
      shield() { tone('sine', 300, 950, 0.25, 0.12); },
      crate() { noise(0.18, 0.25, 1800, 400); },
      pop() { noise(0.3, 0.3, 2400, 200); tone('triangle', 600, 120, 0.2, 0.1); },
      explode() { noise(0.8, 0.5, 1800, 50); tone('sine', 120, 30, 0.7, 0.25); },
      pickup() { arp('square', [660, 880, 1320], 0.06, 0.07, 0.07); },
      spawn() { tone('triangle', 500, 1000, 0.15, 0.08); },
      denied() { tone('square', 220, 170, 0.12, 0.07); },
      type() { tone('square', 1700 + Math.random() * 500, 1700, 0.012, 0.012); },
      run() { tone('triangle', 400, 820, 0.1, 0.08); },
      win() { arp('square', [523, 659, 784, 1046, 1318], 0.1, 0.16, 0.08); },
      lose() { arp('sawtooth', [392, 330, 262, 196], 0.17, 0.22, 0.07); },
    };
  })();

  // ---------- Sandboxed runner for the player's code ----------
  const WORKER_SRC = 'var R = (' + ClashRules.toString() + ')();\n' +
    'self.onmessage = function (e) {\n' +
    '  var d = e.data, res;\n' +
    '  try { res = R.runPlayerCode(d.state, d.code); }\n' +
    '  catch (err) { res = { events: [], error: { name: "Error", message: String((err && err.message) || err) } }; }\n' +
    '  res.id = d.id;\n' +
    '  try { postMessage(res); }\n' +
    '  catch (err) { postMessage({ id: d.id, events: [], error: { name: "DataCloneError", message: "memory can only hold plain data (numbers, strings, booleans, arrays and objects), not functions or bots." } }); }\n' +
    '};';
  let workerUrl = null;

  function makeCodeRunner() {
    let worker = null, seq = 0, pending = null;
    const kill = () => { if (worker) worker.terminate(); worker = null; };
    function settle(data) {
      if (!pending) return;
      const p = pending;
      pending = null;
      clearTimeout(p.timer);
      p.resolve(data);
    }
    function ensure() {
      if (worker) return;
      workerUrl = workerUrl || URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
      worker.onmessage = e => { if (pending && e.data.id === pending.id) settle(e.data); };
      worker.onerror = e => {
        e.preventDefault();
        kill();
        settle({ events: [], error: { name: 'Error', message: e.message || 'Something went wrong running your code.' } });
      };
    }
    function run(state, code, timeout) {
      if (pending) { kill(); settle({ stale: true }); }
      ensure();
      const id = ++seq;
      return new Promise(resolve => {
        pending = {
          id, resolve,
          timer: setTimeout(() => {
            if (!pending || pending.id !== id) return;
            kill();
            settle({ events: [], error: { name: 'Timeout', message: 'Your code ran for over ' + timeout / 1000 + ' seconds, so it was stopped. Is there a loop that never ends?' } });
          }, timeout),
        };
        worker.postMessage({ id, state, code });
      });
    }
    return { run, destroy() { if (pending) { clearTimeout(pending.timer); pending = null; } kill(); } };
  }

  // ---------- Phaser ----------
  let phaserPromise = null;
  function loadPhaser() {
    if (window.Phaser) return Promise.resolve();
    if (!phaserPromise) {
      phaserPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PHASER_URL;
        s.onload = resolve;
        s.onerror = () => { phaserPromise = null; s.remove(); reject(new Error('Couldn\'t load the game engine')); };
        document.head.append(s);
      });
    }
    return phaserPromise;
  }

  function createArena(parent) {
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let resolveReady;
    const ready = new Promise(r => { resolveReady = r; });
    class ArenaScene extends Phaser.Scene {
      constructor() { super({ key: 'arena' }); }
      create() { this.setup(DPR); resolveReady(this); }
    }
    Object.assign(ArenaScene.prototype, SceneMethods);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: W * DPR,
      height: H * DPR,
      backgroundColor: '#0b0f17',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
      audio: { noAudio: true },
      render: { antialias: true },
      scene: ArenaScene,
    });
    return { game, ready };
  }

  // Particle presets: [texture, config]. Scales are divided by the device
  // pixel ratio because textures are generated at high resolution.
  const FX = p => ({
    sparkPlayer: ['dot', { speed: { min: 80, max: 280 }, lifespan: { min: 200, max: 500 }, scale: { start: 0.9 * p, end: 0 }, tint: [0xffe94d, 0xffffff, 0xffb02e], blendMode: 'ADD' }],
    sparkEnemy: ['dot', { speed: { min: 80, max: 280 }, lifespan: { min: 200, max: 500 }, scale: { start: 0.9 * p, end: 0 }, tint: [0xff4d6d, 0xffffff, 0xff9a3c], blendMode: 'ADD' }],
    boom: ['dot', { speed: { min: 100, max: 440 }, lifespan: { min: 400, max: 950 }, scale: { start: 1.7 * p, end: 0 }, tint: [0xffe94d, 0xff9a3c, 0xff4d6d, 0xffffff], blendMode: 'ADD' }],
    wood: ['spark', { speed: { min: 80, max: 300 }, lifespan: { min: 300, max: 700 }, scale: { start: 1.2 * p, end: 0.2 * p }, rotate: { min: 0, max: 360 }, gravityY: 500, tint: [0x9a6534, 0x6b4220, 0xc58a4f] }],
    dust: ['dot', { speed: { min: 10, max: 50 }, lifespan: 350, scale: { start: 0.7 * p, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0x8b93a7 }],
    heal: ['dot', { speed: { min: 30, max: 130 }, angle: { min: 200, max: 340 }, lifespan: 650, scale: { start: 0.8 * p, end: 0 }, tint: [0x3ddc84, 0xffffff, 0xf7df1e], blendMode: 'ADD' }],
    shieldFx: ['dot', { speed: { min: 60, max: 200 }, lifespan: 420, scale: { start: 0.7 * p, end: 0 }, tint: [0x5ad1ff, 0xffffff], blendMode: 'ADD' }],
    stars: ['star', { speed: { min: 100, max: 360 }, lifespan: 900, scale: { start: 0.8 * p, end: 0 }, rotate: { min: 0, max: 360 } }],
  });

  // Mixed into the Phaser scene class once Phaser has loaded.
  const SceneMethods = {
    setup(dpr) {
      this.dpr = dpr;
      this.speed = 1;
      this.alive = true;
      this.boardObjs = [];
      this.bots = {};
      this.crates = new Map();
      this.targets = new Map();
      this.pickups = new Map();
      this.emitters = new Map();
      this.fx = FX(1 / dpr);
      this.cameras.main.setZoom(dpr).centerOn(W / 2, H / 2);
      this.makeTextures();
      this.ghostG = this.add.graphics().setDepth(3);
      this.ghostLabels = [];
      this.hover = this.add.rectangle(0, 0, TILE - 4, TILE - 4).setStrokeStyle(2, 0xffffff, 0.45).setDepth(2).setVisible(false);
      this.hoverText = this.txt(0, 0, '', 11, '#e6e9f2', { backgroundColor: '#0b0f17', padding: { x: 5, y: 2 } })
        .setOrigin(0.5, 1).setDepth(12).setVisible(false);
      this.input.on('pointermove', p => this.onHover(p));
      this.input.on('gameout', () => { this.hover.setVisible(false); this.hoverText.setVisible(false); });
      this.input.on('pointerdown', p => {
        const t = this.tileUnder(p);
        if (t && this.onTileClick) this.onTileClick(t.x, t.y);
      });
      this.events.once('destroy', () => { this.alive = false; });
    },

    // ----- helpers -----
    txt(x, y, s, size, color, extra) {
      return this.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: this.dpr }, extra || {}));
    },
    img(x, y, key) { return this.add.image(x, y, key).setScale(1 / this.dpr); },
    track(o) { this.boardObjs.push(o); return o; },
    killTweens(o) {
      this.tweens.killTweensOf(o);
      if (o.list) o.list.forEach(c => this.killTweens(c));
    },
    wait(ms) { return new Promise(r => this.time.delayedCall(ms * this.speed, r)); },
    tween(cfg) {
      return new Promise(r => this.tweens.add(Object.assign({}, cfg, { duration: (cfg.duration || 200) * this.speed, onComplete: () => r() })));
    },
    burst(key, x, y, n) {
      if (!this.emitters.has(key)) {
        const [tex, cfg] = this.fx[key];
        this.emitters.set(key, this.add.particles(0, 0, tex, Object.assign({ emitting: false }, cfg)).setDepth(8));
      }
      this.emitters.get(key).explode(n, x, y);
    },
    float(x, y, text, color, size) {
      const t = this.txt(x, y, text, size || 18, color, { fontStyle: 'bold', stroke: '#0b0f17', strokeThickness: 4 }).setOrigin(0.5).setDepth(11);
      this.tweens.add({ targets: t, y: y - 38, alpha: { from: 1, to: 0 }, duration: 950 * Math.max(this.speed, 0.6), ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    },
    ripple(x, y, color) {
      const r = this.img(x, y, 'ring').setTint(color).setDepth(9);
      const s = r.scale;
      r.setScale(s * 0.5);
      this.tweens.add({ targets: r, scale: s * 1.7, alpha: { from: 1, to: 0 }, duration: 380, onComplete: () => r.destroy() });
    },

    // ----- textures (drawn once, at device resolution) -----
    makeTextures() {
      const make = (key, w, h, draw) => {
        if (this.textures.exists(key)) return;
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        draw(g, this.dpr);
        g.generateTexture(key, Math.ceil(w * this.dpr), Math.ceil(h * this.dpr));
        g.destroy();
      };
      const floor = shade => (g, k) => {
        g.fillStyle(0x10151f, 1); g.fillRect(0, 0, 64 * k, 64 * k);
        g.fillStyle(shade, 1); g.fillRoundedRect(3 * k, 3 * k, 58 * k, 58 * k, 9 * k);
        g.lineStyle(1 * k, 0x253049, 1); g.strokeRoundedRect(3.5 * k, 3.5 * k, 57 * k, 57 * k, 9 * k);
      };
      make('floor', 64, 64, floor(0x182033));
      make('floor2', 64, 64, floor(0x161d2e));
      make('wall', 64, 64, (g, k) => {
        g.fillStyle(0x0a0d14, 1); g.fillRect(0, 0, 64 * k, 64 * k);
        g.fillStyle(0x252d46, 1); g.fillRoundedRect(2 * k, 4 * k, 60 * k, 58 * k, 8 * k);
        g.fillStyle(0x3a4466, 1); g.fillRoundedRect(2 * k, 2 * k, 60 * k, 50 * k, 8 * k);
        g.fillStyle(0x4f5b85, 1); g.fillRoundedRect(9 * k, 8 * k, 46 * k, 5 * k, 2.5 * k);
        g.fillStyle(0x2c3452, 1); g.fillCircle(12 * k, 44 * k, 2.5 * k); g.fillCircle(52 * k, 44 * k, 2.5 * k);
      });
      make('crate', 64, 64, (g, k) => {
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(9 * k, 12 * k, 50 * k, 48 * k, 6 * k);
        g.fillStyle(0x6b4220, 1); g.fillRoundedRect(7 * k, 6 * k, 50 * k, 50 * k, 6 * k);
        g.fillStyle(0x9a6534, 1); g.fillRoundedRect(11 * k, 10 * k, 42 * k, 42 * k, 4 * k);
        g.lineStyle(5 * k, 0x6b4220, 1); g.lineBetween(15 * k, 14 * k, 49 * k, 48 * k); g.lineBetween(49 * k, 14 * k, 15 * k, 48 * k);
        g.lineStyle(2 * k, 0xc58a4f, 0.6); g.strokeRoundedRect(11 * k, 10 * k, 42 * k, 42 * k, 4 * k);
      });
      make('target', 64, 64, (g, k) => {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(32 * k, 55 * k, 34 * k, 8 * k);
        g.fillStyle(0x3a4466, 1); g.fillRect(29 * k, 38 * k, 6 * k, 17 * k);
        [[22, 0xff4d6d], [17, 0xffffff], [12, 0xff4d6d], [7, 0xffffff], [3, 0xff4d6d]].forEach(([r, c]) => {
          g.fillStyle(c, 1); g.fillCircle(32 * k, 28 * k, r * k);
        });
      });
      make('battery', 40, 40, (g, k) => {
        g.fillStyle(COLORS.ink, 1); g.fillRoundedRect(9 * k, 5 * k, 22 * k, 32 * k, 5 * k); g.fillRect(15 * k, 2 * k, 10 * k, 4 * k);
        g.fillStyle(0x3ddc84, 1); g.fillRoundedRect(11.5 * k, 8 * k, 17 * k, 26.5 * k, 3.5 * k);
        g.fillStyle(COLORS.ink, 1);
        g.fillPoints([{ x: 22 * k, y: 11 * k }, { x: 14 * k, y: 23 * k }, { x: 19.5 * k, y: 23 * k }, { x: 17 * k, y: 32 * k }, { x: 26 * k, y: 19 * k }, { x: 20.5 * k, y: 19 * k }], true);
      });
      make('repair', 40, 40, (g, k) => {
        g.fillStyle(COLORS.ink, 1); g.fillCircle(20 * k, 20 * k, 17 * k);
        g.fillStyle(0xffffff, 1); g.fillCircle(20 * k, 20 * k, 14.5 * k);
        g.fillStyle(0xff4d6d, 1); g.fillRect(17 * k, 10 * k, 6 * k, 20 * k); g.fillRect(10 * k, 17 * k, 20 * k, 6 * k);
      });
      make('star', 40, 40, (g, k) => {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = (i % 2 ? 8 : 18) * k, a = -Math.PI / 2 + (i * Math.PI) / 5;
          pts.push({ x: 20 * k + Math.cos(a) * r, y: 20 * k + Math.sin(a) * r });
        }
        g.fillStyle(0xf7df1e, 1); g.fillPoints(pts, true);
      });
      make('goal', 64, 64, (g, k) => {
        g.fillStyle(0xf7df1e, 0.14); g.fillRoundedRect(4 * k, 4 * k, 56 * k, 56 * k, 10 * k);
        g.lineStyle(2 * k, 0xf7df1e, 0.85); g.strokeRoundedRect(6 * k, 6 * k, 52 * k, 52 * k, 9 * k);
      });
      make('dot', 8, 8, (g, k) => { g.fillStyle(0xffffff, 1); g.fillCircle(4 * k, 4 * k, 4 * k); });
      make('spark', 6, 10, (g, k) => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6 * k, 10 * k); });
      make('ring', 64, 64, (g, k) => { g.lineStyle(3 * k, 0xffffff, 1); g.strokeCircle(32 * k, 32 * k, 29 * k); });
    },

    // ----- board -----
    build(state, mission) {
      this.clearBoard();
      this.state = state;
      this.mission = mission;
      for (let x = 0; x < state.w; x++) this.track(this.txt(cx(x), OY / 2 + 1, String(x), 12, '#5d6782').setOrigin(0.5));
      for (let y = 0; y < state.h; y++) this.track(this.txt(OX / 2, cy(y), String(y), 12, '#5d6782').setOrigin(0.5));
      for (let y = 0; y < state.h; y++) {
        for (let x = 0; x < state.w; x++) {
          const t = state.tiles[y][x];
          if (t === '#') { this.track(this.img(cx(x), cy(y), 'wall').setDepth(4)); continue; }
          this.track(this.img(cx(x), cy(y), (x + y) % 2 ? 'floor2' : 'floor').setDepth(0));
          if (t === 'G') {
            const pad = this.track(this.img(cx(x), cy(y), 'goal').setDepth(1));
            const star = this.track(this.img(cx(x), cy(y), 'star').setDepth(2));
            this.tweens.add({ targets: pad, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
            this.tweens.add({ targets: star, angle: 360, duration: 6000, repeat: -1 });
            this.tweens.add({ targets: star, scale: star.scale * 1.18, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
          if (t === 'C') this.crates.set(x + ',' + y, this.track(this.img(cx(x), cy(y), 'crate').setDepth(4)));
        }
      }
      state.targets.forEach(t => this.addTarget(t));
      state.pickups.forEach(p => this.addPickup(p, false));
      if (state.player) this.bots.player = this.makeBot('player', state.player);
      if (state.enemy) this.bots.enemy = this.makeBot('enemy', state.enemy);
    },

    clearBoard() {
      for (const o of this.boardObjs) { this.killTweens(o); o.destroy(); }
      for (const v of Object.values(this.bots)) {
        this.killTweens(v.c);
        if (v.bubble) v.bubble.destroy();
        v.c.destroy();
      }
      this.boardObjs = [];
      this.bots = {};
      this.crates.clear();
      this.targets.clear();
      this.pickups.clear();
      this.ghost(null);
    },

    addTarget(t) {
      const s = this.track(this.img(cx(t.x), cy(t.y), 'target').setDepth(4));
      this.tweens.add({ targets: s, angle: { from: -4, to: 4 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.targets.set(t.id, s);
    },

    addPickup(p, animate) {
      const s = this.track(this.img(cx(p.x), cy(p.y), p.type).setDepth(2));
      const scale = s.scale;
      this.tweens.add({ targets: s, y: cy(p.y) - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (animate) {
        s.setScale(0);
        this.tweens.add({ targets: s, scale, duration: 350, ease: 'Back.easeOut' });
        this.ripple(cx(p.x), cy(p.y), p.type === 'battery' ? 0x3ddc84 : 0xffffff);
      }
      this.pickups.set(p.id, s);
    },

    makeBot(who, b) {
      const isDrone = who === 'enemy' && this.mission.ai === 'drone';
      const color = who === 'player' ? COLORS.player : isDrone ? COLORS.drone : COLORS.enemy;
      const c = this.add.container(cx(b.x), cy(b.y)).setDepth(5);
      const shadow = this.add.ellipse(0, 25, 40, 10, 0x000000, 0.4);
      const inner = this.add.container(0, 0);
      const barrel = this.add.rectangle(0, 0, 16, 9, COLORS.ink).setStrokeStyle(2, color);
      const body = this.add.graphics();
      body.fillStyle(COLORS.ink, 1); body.fillRoundedRect(-23, -21, 46, 44, 13);
      body.fillStyle(color, 1); body.fillRoundedRect(-20, -18, 40, 38, 11);
      body.fillStyle(0xffffff, 0.28); body.fillRoundedRect(-15, -15, 30, 5, 2.5);
      body.fillStyle(COLORS.ink, 1); body.fillRoundedRect(-15, -5, 30, 14, 7);
      const eyeColor = who === 'player' ? 0x7cf2ff : 0xffffff;
      const eyes = this.add.container(0, 2, [this.add.circle(-6, 0, 3.2, eyeColor), this.add.circle(6, 0, 3.2, eyeColor)]);
      inner.add([barrel, body, eyes]);
      let tip = null;
      if (isDrone) {
        const rotor = this.add.rectangle(0, -26, 34, 4, COLORS.ink);
        inner.add([this.add.rectangle(0, -23, 3, 6, COLORS.ink), rotor]);
        this.tweens.add({ targets: rotor, scaleX: 0.15, duration: 70, yoyo: true, repeat: -1 });
      } else {
        tip = this.add.circle(0, -31, 4, color).setStrokeStyle(2, COLORS.ink);
        inner.add([this.add.rectangle(0, -26, 3, 9, COLORS.ink), tip]);
        this.tweens.add({ targets: tip, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
      }
      const shield = this.add.circle(0, 0, 35, COLORS.shield, 0.12).setStrokeStyle(3, COLORS.shield, 0.9).setVisible(false);
      const hpBg = this.add.rectangle(0, -45, 48, 8, COLORS.ink).setStrokeStyle(1, 0x2a3350);
      const hpFill = this.add.rectangle(-22, -45, 44, 4, COLORS.hpGood).setOrigin(0, 0.5);
      c.add([shadow, inner, shield, hpBg, hpFill]);
      const v = { who, c, inner, barrel, eyes, shield, hpFill, maxHp: b.maxHp, bubble: null, shieldTween: null };
      this.tweens.add({ targets: inner, y: -2.5, duration: 1000 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.face(v, b.facing);
      this.setHp(v, b.hp, false);
      this.setShield(v, b.shielded, false);
      return v;
    },

    face(v, dir) {
      const [dx, dy] = DIRV[dir] || [1, 0];
      v.barrel.setPosition(dx * 24, dy * 24 + (dy ? 0 : 3)).setAngle(dy ? 90 : 0);
      v.eyes.setPosition(dx * 3, 2 + dy * 2);
    },

    setHp(v, hp, animate) {
      const r = Math.max(0, hp) / v.maxHp;
      v.hpFill.setFillStyle(r > 0.6 ? COLORS.hpGood : r > 0.3 ? COLORS.hpMid : COLORS.hpLow);
      if (animate) this.tweens.add({ targets: v.hpFill, scaleX: r, duration: 350, ease: 'Cubic.easeOut' });
      else v.hpFill.scaleX = r;
    },

    setShield(v, on, animate) {
      if (v.shieldTween) { v.shieldTween.stop(); v.shieldTween = null; }
      this.tweens.killTweensOf(v.shield);
      if (on) {
        v.shield.setVisible(true).setAlpha(1).setScale(animate ? 0.2 : 1);
        if (animate) this.tweens.add({ targets: v.shield, scale: 1, duration: 300, ease: 'Back.easeOut' });
        v.shieldTween = this.tweens.add({ targets: v.shield, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, delay: 300 });
      } else if (v.shield.visible) {
        if (animate) this.tweens.add({ targets: v.shield, scale: 1.4, alpha: 0, duration: 250, onComplete: () => v.shield.setVisible(false) });
        else v.shield.setVisible(false);
      }
    },

    say(who, text) {
      const v = this.bots[who];
      if (!v || !v.c.visible || v.c.alpha === 0) return;
      if (v.bubble) { v.bubble.destroy(); v.bubble = null; }
      const t = this.txt(0, 0, text, 13, '#10131c', { wordWrap: { width: 200, useAdvancedWrap: true }, align: 'center' }).setOrigin(0.5);
      const w = Math.max(44, t.width + 22), h = t.height + 14;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 10);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + 9);
      const b = this.add.container(0, 0, [g, t]).setDepth(13);
      b.bw = w;
      b.bh = h;
      v.bubble = b;
      this.placeBubble(v);
      b.setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: b, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => {
        if (v.bubble !== b) return;
        v.bubble = null;
        this.tweens.add({ targets: b, alpha: 0, duration: 250, onComplete: () => b.destroy() });
      });
    },

    // Keep a speech bubble above its bot (and inside the arena) as the bot moves.
    placeBubble(v) {
      const b = v.bubble;
      b.setPosition(
        Math.min(Math.max(v.c.x, b.bw / 2 + 4), W - b.bw / 2 - 4),
        Math.max(b.bh / 2 + 4, v.c.y - 60 - b.bh / 2)
      );
    },

    // Phaser calls this every frame.
    update() {
      for (const v of Object.values(this.bots)) if (v.bubble) this.placeBubble(v);
    },

    laserEnd(e) {
      const [dx, dy] = DIRV[e.dir], [hx, hy] = e.to;
      if (e.what === 'wall' || e.what === 'crate' || e.what === 'edge') return [cx(hx) - (dx * TILE) / 2, cy(hy) - (dy * TILE) / 2];
      return [cx(hx) - dx * 18, cy(hy) - dy * 18];
    },

    // ----- animation of game events -----
    async play(events, onEvent) {
      for (const e of events) {
        if (!this.alive) return;
        if (onEvent) onEvent(e);
        await this.animate(e);
      }
    },

    async animate(e) {
      const v = e.who ? this.bots[e.who] : null;
      switch (e.t) {
        case 'move': {
          this.face(v, e.dir);
          Sfx.move();
          this.burst('dust', cx(e.from[0]), cy(e.from[1]) + 20, 6);
          this.tweens.add({ targets: v.inner, scaleY: 0.86, scaleX: 1.08, duration: 90 * this.speed, yoyo: true });
          await this.tween({ targets: v.c, x: cx(e.to[0]), y: cy(e.to[1]), duration: 210, ease: 'Sine.easeInOut' });
          return;
        }
        case 'bonk': {
          this.face(v, e.dir);
          Sfx.bonk();
          const [dx, dy] = DIRV[e.dir];
          this.float(cx(e.x) + dx * 34, cy(e.y) + dy * 34 - 10, 'BONK!', '#ff9a3c', 16);
          this.cameras.main.shake(120, 0.004);
          await this.tween({ targets: v.c, x: cx(e.x) + dx * 13, y: cy(e.y) + dy * 13, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
          v.c.setPosition(cx(e.x), cy(e.y));
          return;
        }
        case 'noenergy':
          Sfx.denied();
          this.float(v.c.x, v.c.y - 52, 'Out of ⚡', '#9aa3b8', 14);
          return this.wait(260);
        case 'fire':
          return this.animateFire(e, v);
        case 'damage':
          Sfx.hit();
          this.cameras.main.shake(180, 0.009);
          this.float(v.c.x, v.c.y - 30, '-' + e.amount, '#ff5d73', 24);
          this.setHp(v, e.hp, true);
          this.tweens.add({ targets: v.inner, alpha: 0.25, duration: 60 * this.speed, yoyo: true, repeat: 2 });
          return this.wait(280);
        case 'blocked':
          Sfx.block();
          this.ripple(v.c.x, v.c.y, COLORS.shield);
          this.burst('shieldFx', v.c.x, v.c.y, 18);
          this.float(v.c.x, v.c.y - 42, 'BLOCKED!', '#5ad1ff', 18);
          this.setShield(v, false, true);
          return this.wait(300);
        case 'destroyed':
          Sfx.explode();
          this.cameras.main.shake(450, 0.02);
          this.cameras.main.flash(180, 255, 240, 200);
          this.burst('boom', v.c.x, v.c.y, 70);
          if (v.bubble) { v.bubble.destroy(); v.bubble = null; }
          this.tweens.add({ targets: v.c, scale: 1.35, alpha: 0, duration: 420 * this.speed, ease: 'Cubic.easeOut' });
          return this.wait(700);
        case 'crate': {
          const key = e.x + ',' + e.y, s = this.crates.get(key);
          Sfx.crate();
          this.burst('wood', cx(e.x), cy(e.y), 22);
          if (s) {
            this.crates.delete(key);
            this.tweens.add({ targets: s, scale: s.scale * 1.25, alpha: 0, duration: 200, onComplete: () => s.destroy() });
          }
          return this.wait(180);
        }
        case 'target': {
          const s = this.targets.get(e.id);
          Sfx.pop();
          this.burst('boom', cx(e.x), cy(e.y), 30);
          this.float(cx(e.x), cy(e.y) - 26, e.left ? e.left + ' left' : 'CLEAR!', '#f7df1e', 16);
          if (s) {
            this.targets.delete(e.id);
            this.tweens.killTweensOf(s);
            this.tweens.add({ targets: s, scale: 0, angle: 180, duration: 260, onComplete: () => s.destroy() });
          }
          return this.wait(260);
        }
        case 'shield':
          Sfx.shield();
          this.setShield(v, true, true);
          return this.wait(260);
        case 'shieldDown':
          this.setShield(v, false, true);
          return;
        case 'pickup': {
          const s = this.pickups.get(e.id);
          Sfx.pickup();
          this.burst('heal', cx(e.x), cy(e.y), 16);
          this.float(cx(e.x), cy(e.y) - 30, e.text, e.type === 'battery' ? '#f7df1e' : '#3ddc84', 18);
          if (e.hp !== undefined && v) this.setHp(v, e.hp, true);
          if (s) {
            this.pickups.delete(e.id);
            this.tweens.killTweensOf(s);
            this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, scale: s.scale * 1.4, duration: 300, onComplete: () => s.destroy() });
          }
          return this.wait(220);
        }
        case 'spawn':
          Sfx.spawn();
          this.addPickup(e, true);
          return this.wait(300);
        case 'say':
          this.say(e.who, e.text);
          return this.wait(380);
        case 'goal':
          this.burst('stars', cx(e.x), cy(e.y), 24);
          return this.wait(200);
        case 'info':
          this.float(v.c.x, v.c.y - 52, e.text, '#9aa3b8', 13);
          return this.wait(200);
        default:
          return undefined;
      }
    },

    async animateFire(e, v) {
      this.face(v, e.dir);
      Sfx.laser(e.who === 'enemy');
      const [dx, dy] = DIRV[e.dir];
      const sx = v.c.x + dx * 28, sy = v.c.y + dy * 28 + (dy ? 0 : 3);
      const [ex, ey] = this.laserEnd(e);
      const color = COLORS.laser[e.who];
      const flash = this.add.circle(sx, sy, 9, 0xffffff, 1).setDepth(8).setBlendMode('ADD');
      this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
      const g = this.add.graphics().setDepth(7).setBlendMode('ADD');
      g.lineStyle(16, color, 0.16); g.lineBetween(sx, sy, ex, ey);
      g.lineStyle(8, color, 0.45); g.lineBetween(sx, sy, ex, ey);
      g.lineStyle(3, 0xffffff, 1); g.lineBetween(sx, sy, ex, ey);
      this.tweens.add({ targets: g, alpha: 0, duration: 320 * this.speed, delay: 90 * this.speed, onComplete: () => g.destroy() });
      this.burst(e.who === 'player' ? 'sparkPlayer' : 'sparkEnemy', ex, ey, 16);
      if (e.what === 'wall' || e.what === 'edge') this.cameras.main.shake(60, 0.002);
      await this.wait(170);
    },

    // ----- ghost preview of the player's planned turn -----
    ghost(events) {
      const g = this.ghostG;
      g.clear();
      this.ghostLabels.forEach(l => l.setVisible(false));
      if (!events || !this.bots.player || !this.state) return;
      let x = this.state.player.x, y = this.state.player.y, n = 0;
      const label = (lx, ly) => {
        let l = this.ghostLabels[n];
        if (!l) {
          l = this.txt(0, 0, '', 10, '#10131c', { fontStyle: 'bold', backgroundColor: '#f7df1e', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(10);
          this.ghostLabels.push(l);
        }
        n++;
        l.setText(String(n)).setPosition(lx, ly).setVisible(true);
      };
      const dots = (x1, y1, x2, y2, color, alpha, gap) => {
        const steps = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / gap));
        g.fillStyle(color, alpha);
        for (let i = 0; i <= steps; i++) g.fillCircle(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps, 2.2);
      };
      for (const e of events) {
        if (e.who !== 'player') continue;
        if (e.t === 'move') {
          dots(cx(e.from[0]), cy(e.from[1]), cx(e.to[0]), cy(e.to[1]), 0xf7df1e, 0.8, 9);
          g.lineStyle(2, 0xf7df1e, 0.55); g.strokeCircle(cx(e.to[0]), cy(e.to[1]), 7);
          x = e.to[0]; y = e.to[1];
          label((cx(e.from[0]) + cx(e.to[0])) / 2, (cy(e.from[1]) + cy(e.to[1])) / 2);
        } else if (e.t === 'bonk') {
          const [dx, dy] = DIRV[e.dir], bx = cx(e.x) + dx * 27, by = cy(e.y) + dy * 27;
          g.lineStyle(3, 0xff9a3c, 0.95); g.lineBetween(bx - 6, by - 6, bx + 6, by + 6); g.lineBetween(bx + 6, by - 6, bx - 6, by + 6);
          label(bx + 12, by - 12);
        } else if (e.t === 'fire') {
          const [dx, dy] = DIRV[e.dir], [ex, ey] = this.laserEnd(e);
          dots(cx(e.from[0]) + dx * 28, cy(e.from[1]) + dy * 28, ex, ey, 0xff6b81, 0.9, 7);
          g.fillStyle(0xff6b81, 0.9); g.fillCircle(ex, ey, 5);
          label(cx(e.from[0]) + dx * 40 + (dy ? 12 : 0), cy(e.from[1]) + dy * 40 - (dy ? 0 : 12));
        } else if (e.t === 'shield') {
          g.lineStyle(2, COLORS.shield, 0.85); g.strokeCircle(cx(x), cy(y), 34);
          label(cx(x) + 26, cy(y) - 26);
        }
      }
      if (x !== this.state.player.x || y !== this.state.player.y) {
        g.fillStyle(0xf7df1e, 0.12); g.fillRoundedRect(cx(x) - 22, cy(y) - 20, 44, 42, 12);
        g.lineStyle(2, 0xf7df1e, 0.9); g.strokeRoundedRect(cx(x) - 22, cy(y) - 20, 44, 42, 12);
      }
    },

    // ----- hover info -----
    tileUnder(p) {
      const x = Math.floor((p.worldX - OX) / TILE), y = Math.floor((p.worldY - OY) / TILE);
      return this.state && x >= 0 && y >= 0 && x < this.state.w && y < this.state.h ? { x, y } : null;
    },
    onHover(p) {
      const t = this.tileUnder(p);
      if (!t) { this.hover.setVisible(false); this.hoverText.setVisible(false); return; }
      const what = R.whatsAt(this.state, t.x, t.y, 'player');
      this.hover.setPosition(cx(t.x), cy(t.y)).setVisible(true);
      this.hoverText.setText('(' + t.x + ', ' + t.y + ')' + (what === 'floor' ? '' : ' ' + what))
        .setPosition(cx(t.x), cy(t.y) - TILE / 2 + 1).setVisible(true);
    },

    // ----- snap everything to match the state -----
    sync(state) {
      this.state = state;
      for (const who of ['player', 'enemy']) {
        const b = state[who], v = this.bots[who];
        if (!b || !v) continue;
        if (b.hp > 0) v.c.setPosition(cx(b.x), cy(b.y)).setAlpha(1).setScale(1);
        this.face(v, b.facing);
        this.setHp(v, b.hp, false);
        if (v.shield.visible !== b.shielded) this.setShield(v, b.shielded, false);
      }
      for (const [key, s] of this.crates) {
        const [x, y] = key.split(',').map(Number);
        if (state.tiles[y][x] !== 'C') { s.destroy(); this.crates.delete(key); }
      }
      for (const [id, s] of this.targets) if (!state.targets.some(t => t.id === id)) { s.destroy(); this.targets.delete(id); }
      for (const [id, s] of this.pickups) if (!state.pickups.some(p => p.id === id)) { s.destroy(); this.pickups.delete(id); }
      state.pickups.forEach(p => { if (!this.pickups.has(p.id)) this.addPickup(p, false); });
    },

    celebrate() {
      const conf = this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: W }, y: -10, lifespan: 2600,
        speedY: { min: 120, max: 300 }, speedX: { min: -90, max: 90 }, gravityY: 160,
        rotate: { min: 0, max: 360 }, scale: { min: 0.8 / this.dpr, max: 1.5 / this.dpr },
        quantity: 3, frequency: 25, tint: [0xf7df1e, 0xff4d6d, 0x3ddc84, 0x5ad1ff, 0xb07cff],
      }).setDepth(20);
      this.time.delayedCall(1400, () => conf.stop());
      this.time.delayedCall(4500, () => conf.destroy());
      const v = this.bots.player;
      if (v) this.tweens.add({ targets: v.c, y: v.c.y - 18, duration: 220, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
    },

    defeat() {
      this.cameras.main.shake(300, 0.012);
      this.cameras.main.flash(250, 120, 0, 20);
    },
  };

  // ---------- Mission menu ----------
  function renderMenu(root, ctx) {
    const { el, store } = ctx;
    const save = loadSave(store);
    const next = MISSIONS.find((m, i) => isUnlocked(save, i) && !save.stars[m.id]) || MISSIONS[0];
    const stars = totalStars(save);

    root.append(el('section', { class: 'clash-hero' }, [
      el('div', { class: 'clash-hero-text' }, [
        el('div', { class: 'clash-badge', text: '🎮 GAME · ' + stars + ' / ' + MISSIONS.length * 3 + ' ★' }),
        el('h1', { text: 'CODE CLASH' }),
        el('p', { text: 'Program a battle bot with real JavaScript and outsmart the computer. Every move you make is a line of code.' }),
        el('div', { class: 'clash-hero-code', html: '<span class="k">bot</span>.fire(<span class="s">"right"</span>); <span class="c">// 💥</span><span class="cursor"></span>' }),
        el('div', { class: 'btn-row' }, [
          el('a', { class: 'btn primary', href: '#/game/' + next.id, text: '▶ ' + (stars ? 'Continue: ' : 'Start: ') + next.title }),
        ]),
      ]),
      el('div', { class: 'clash-hero-art', 'aria-hidden': 'true', html: HERO_SVG }),
    ]));

    root.append(el('div', { class: 'clash-how' }, [
      ['⌨️', 'Write JavaScript', 'Commands like <code>bot.move("right")</code> control your bot.'],
      ['👻', 'Preview it', 'A ghost path shows what your code will do as you type.'],
      ['⚡', 'Run your turn', 'Your bot acts it out, then the CPU strikes back.'],
      ['🔁', 'Go autopilot', 'Make your code smart enough to run every turn by itself.'],
    ].map(([icon, title, text]) => el('div', { class: 'how-step' }, [
      el('div', { class: 'how-icon', text: icon }), el('strong', { text: title }), el('p', { html: text }),
    ]))));

    const grid = el('div', { class: 'mission-grid' });
    MISSIONS.forEach((m, i) => {
      const unlocked = isUnlocked(save, i), got = save.stars[m.id] || 0;
      const attrs = { class: 'mission-card' + (unlocked ? '' : ' locked') + (got ? ' done' : '') };
      if (unlocked) attrs.href = '#/game/' + m.id;
      const card = el(unlocked ? 'a' : 'div', attrs, [
        el('div', { class: 'mission-num', text: unlocked ? String(i + 1) : '🔒' }),
        el('div', { class: 'mission-info' }, [
          el('h3', { text: m.title }),
          el('div', { class: 'mission-meta' }, [
            el('span', { class: 'chip', text: m.concept }),
            el('span', { class: 'mission-opp', text: m.ai ? '🤖 vs ' + m.opponent : '🎯 ' + m.opponent }),
          ]),
        ]),
        el('div', { class: 'mission-stars', text: '★'.repeat(got) + '☆'.repeat(3 - got) }),
      ]);
      grid.append(card);
    });
    root.append(el('h2', { class: 'clash-h2', text: 'Missions' }), grid);

    if (!save.unlockAll && MISSIONS.some((m, i) => !isUnlocked(save, i))) {
      root.append(el('button', {
        class: 'link-btn clash-unlock', text: 'Skip ahead: unlock all missions',
        onclick: () => { save.unlockAll = true; store.set('jsm-clash', save); location.hash = '#/game'; window.dispatchEvent(new HashChangeEvent('hashchange')); },
      }));
    }
  }

  const HERO_SVG = `<svg viewBox="0 0 340 170">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="hero-bot hero-bot-a">
      <rect x="55" y="38" width="4" height="16" fill="#0b0f17"/><circle cx="57" cy="36" r="6" fill="#f7df1e" stroke="#0b0f17" stroke-width="3"/>
      <rect x="27" y="54" width="60" height="58" rx="17" fill="#0b0f17"/><rect x="31" y="58" width="52" height="50" rx="14" fill="#f7df1e"/>
      <rect x="38" y="62" width="38" height="6" rx="3" fill="#fff" opacity=".35"/>
      <rect x="37" y="74" width="40" height="18" rx="9" fill="#0b0f17"/><circle cx="51" cy="83" r="4" fill="#7cf2ff"/><circle cx="65" cy="83" r="4" fill="#7cf2ff"/>
      <rect x="87" y="80" width="16" height="10" rx="2" fill="#0b0f17"/>
    </g>
    <g class="hero-bot hero-bot-b">
      <rect x="281" y="38" width="4" height="16" fill="#0b0f17"/><circle cx="283" cy="36" r="6" fill="#ff4d6d" stroke="#0b0f17" stroke-width="3"/>
      <rect x="253" y="54" width="60" height="58" rx="17" fill="#0b0f17"/><rect x="257" y="58" width="52" height="50" rx="14" fill="#ff4d6d"/>
      <rect x="264" y="62" width="38" height="6" rx="3" fill="#fff" opacity=".35"/>
      <rect x="263" y="74" width="40" height="18" rx="9" fill="#0b0f17"/><circle cx="277" cy="83" r="4" fill="#fff"/><circle cx="291" cy="83" r="4" fill="#fff"/>
      <rect x="237" y="80" width="16" height="10" rx="2" fill="#0b0f17"/>
    </g>
    <g class="hero-laser" filter="url(#glow)">
      <line x1="106" y1="85" x2="232" y2="85" stroke="#ffe94d" stroke-width="9" stroke-linecap="round" opacity=".45"/>
      <line x1="106" y1="85" x2="232" y2="85" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    </g>
    <ellipse cx="57" cy="128" rx="30" ry="6" fill="#000" opacity=".25"/><ellipse cx="283" cy="128" rx="30" ry="6" fill="#000" opacity=".25"/>
  </svg>`;

  // ---------- A mission ----------
  function renderMission(root, mission, index, ctx) {
    const { el, createEditor, store, setCleanup } = ctx;
    const persona = PERSONAS[mission.persona];
    const save = loadSave(store);
    const codeKey = 'jsm-clash-code:' + mission.id;
    const turnRunner = makeCodeRunner(), previewRunner = makeCodeRunner();
    let state = R.createState(mission);
    let scene = null, game = null, alive = true, phase = 'loading';
    let autopilot = false, autoTimer = null, previewTimer = null, previewSeq = 0;
    let speed = store.get('jsm-clash-speed', 1);
    let stats = { turns: 0, autopilotAll: true };
    Sfx.setMuted(store.get('jsm-clash-muted', false));

    // ----- top bar -----
    const muteBtn = el('button', { class: 'icon-btn', title: 'Sound on/off' });
    const showMute = () => { muteBtn.textContent = Sfx.muted ? '🔇' : '🔊'; };
    muteBtn.addEventListener('click', () => {
      Sfx.setMuted(!Sfx.muted);
      store.set('jsm-clash-muted', Sfx.muted);
      showMute();
    });
    showMute();
    const speedSel = el('select', { class: 'clash-speed', title: 'Animation speed' },
      [[1, '1× speed'], [0.5, '2× speed'], [0.25, '4× speed']].map(([v, t]) => el('option', { value: String(v), text: t })));
    speedSel.value = String(speed);
    speedSel.addEventListener('change', () => {
      speed = Number(speedSel.value);
      store.set('jsm-clash-speed', speed);
      if (scene) scene.speed = speed;
    });

    const top = el('div', { class: 'clash-top' }, [
      el('a', { class: 'btn', href: '#/game', text: '← Missions' }),
      el('div', { class: 'clash-title' }, [
        el('div', { class: 'clash-kicker', text: 'Mission ' + (index + 1) + ' of ' + MISSIONS.length + ' · ' + mission.concept }),
        el('h1', { text: mission.title }),
      ]),
      el('div', { class: 'clash-tools' }, [speedSel, muteBtn]),
    ]);

    // ----- HUD -----
    function hudBot(label, cls) {
      const fill = el('div'), num = el('span', { class: 'hud-num' }), en = el('span', { class: 'hud-en' });
      const sh = el('span', { class: 'hud-shield', text: '🛡', title: 'Shield up', hidden: '' });
      return { node: el('div', { class: 'hud-bot ' + cls }, [el('span', { class: 'hud-name', text: label }), el('div', { class: 'hud-hp' }, fill), num, en, sh]), fill, num, en, sh };
    }
    const hudYou = hudBot('YOU', 'you');
    const hudCpu = mission.ai ? hudBot(persona.name, 'cpu') : null;
    const hudTurn = el('div', { class: 'hud-turn' });
    const hudGoal = el('div', { class: 'hud-goal' });
    const hud = el('div', { class: 'clash-hud' }, [hudYou.node, el('div', { class: 'hud-mid' }, [hudTurn, hudGoal]), hudCpu ? hudCpu.node : el('div')]);

    function setHudHp(h, hp, max) {
      h.fill.style.width = Math.max(0, (hp / max) * 100) + '%';
      h.fill.className = hp / max > 0.6 ? 'good' : hp / max > 0.3 ? 'mid' : 'low';
      h.num.textContent = hp + ' HP';
    }
    function refreshHud() {
      setHudHp(hudYou, state.player.hp, state.player.maxHp);
      hudYou.en.textContent = '⚡ ' + state.player.energy;
      hudYou.sh.hidden = !state.player.shielded;
      if (hudCpu && state.enemy) {
        setHudHp(hudCpu, state.enemy.hp, state.enemy.maxHp);
        hudCpu.en.textContent = '';
        hudCpu.sh.hidden = !state.enemy.shielded;
      }
      hudTurn.textContent = 'Turn ' + Math.min(state.turn, mission.maxTurns) + ' / ' + mission.maxTurns;
      hudGoal.textContent = mission.goal === 'targets' ? '🎯 Targets left: ' + state.targets.length
        : mission.goal === 'reach' ? '🏁 Reach the goal at (' + state.goal.x + ', ' + state.goal.y + ')'
        : '⚔️ Defeat ' + persona.name;
    }

    // ----- stage, battle log, CPU terminal -----
    const canvasBox = el('div', { class: 'clash-canvas' }, el('div', { class: 'clash-loading', text: 'Loading the game engine…' }));
    const overlay = el('div', { class: 'clash-overlay', hidden: '' });
    const stage = el('div', { class: 'clash-stage' }, [
      hud,
      el('div', { class: 'clash-canvas-wrap' }, [canvasBox, overlay]),
      el('div', { class: 'clash-tip', text: '💡 Hover a tile to see its (x, y). Click a tile to type its coordinates into your code.' }),
    ]);
    const logBody = el('div', { class: 'clash-log-body', 'aria-live': 'polite' });
    const termBody = el('div', { class: 'clash-term-body' });
    const panels = el('div', { class: 'clash-panels' }, [
      el('div', { class: 'clash-log' }, [el('div', { class: 'panel-head', text: '📜 Battle log' }), logBody]),
      el('div', { class: 'clash-term' }, [el('div', { class: 'panel-head' }, [el('span', { class: 'term-dot' }), document.createTextNode(persona.name + ' // terminal')]), termBody]),
    ]);

    // ----- briefing, hints, stars -----
    const goalsDone = () => save.goals[mission.id] || [];
    const starItem = (st, i) => el('li', { class: goalsDone()[i] ? 'got' : '', text: (goalsDone()[i] ? '★ ' : '☆ ') + st.text });
    const starList = el('ul', { class: 'brief-stars' }, mission.stars.map(starItem));
    const hintList = el('ol', { class: 'hint-list' });
    let hintsShown = 0, solutionArmed = false;
    const hintBtn = el('button', { class: 'btn small', text: '💡 Hint' });
    hintBtn.addEventListener('click', () => {
      if (hintsShown < mission.hints.length) hintList.append(el('li', { text: mission.hints[hintsShown++] }));
      if (hintsShown >= mission.hints.length) hintBtn.hidden = true;
    });
    const solutionBtn = el('button', { class: 'btn small', text: '🔓 Show a solution' });
    solutionBtn.addEventListener('click', () => {
      if (!solutionArmed) {
        solutionArmed = true;
        solutionBtn.textContent = 'Replace my code with a solution?';
        setTimeout(() => { solutionArmed = false; solutionBtn.textContent = '🔓 Show a solution'; }, 4000);
        return;
      }
      solutionArmed = false;
      solutionBtn.textContent = '🔓 Show a solution';
      editor.setValue(mission.solution + '\n');
      log('Loaded a sample solution. Read it line by line, then run it!' + (mission.solutionNote ? ' ' + mission.solutionNote : ''), 'info');
    });
    const briefing = el('details', { class: 'clash-brief', open: '' }, [
      el('summary', {}, [el('strong', { text: '📋 Briefing' }), el('span', { class: 'chip', text: mission.concept })]),
      el('div', { class: 'brief-body', html: mission.briefing }),
      el('div', { class: 'brief-objective', html: '🎯 <strong>Objective:</strong> ' + mission.objective }),
      starList,
      el('div', { class: 'btn-row' }, [hintBtn, solutionBtn]),
      hintList,
    ]);

    // ----- editor and controls -----
    const editorCard = el('div', { class: 'runner clash-editor' });
    editorCard.append(el('div', { class: 'runner-head' }, [
      el('span', { class: 'label', text: 'bot.js' }),
      el('span', { class: 'kbd', text: (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + ' + Enter to run' }),
    ]));
    const editor = createEditor(editorCard, store.get(codeKey, null) ?? mission.starter, () => runTurn(), value => {
      store.set(codeKey, value);
      schedulePreview();
    });
    const planBar = el('div', { class: 'clash-plan' });
    editorCard.append(planBar);

    const runBtn = el('button', { class: 'btn primary clash-run' });
    runBtn.addEventListener('click', () => runTurn());
    const autoBox = el('input', { type: 'checkbox' });
    autoBox.addEventListener('change', () => {
      autopilot = autoBox.checked;
      if (!autopilot) clearTimeout(autoTimer);
      setControls();
    });
    const restartBtn = el('button', { class: 'btn', text: '↺ Restart' });
    restartBtn.addEventListener('click', () => restart());
    const controls = el('div', { class: 'clash-controls' }, [
      runBtn,
      el('label', { class: 'clash-auto', title: 'Run this same code automatically every turn' }, [autoBox, el('span', { text: '🔁 Autopilot' })]),
      restartBtn,
    ]);

    const cheat = el('div', { class: 'clash-cheat' }, [
      el('div', { class: 'panel-head', text: '🧰 Commands: click one to insert it' }),
      el('div', { class: 'cheat-list' }, mission.api.map(key => {
        const a = API[key];
        const b = el('button', { class: 'cheat-item', title: 'Insert into your code' }, [
          el('code', { text: a.sig }),
          a.cost ? el('span', { class: 'cost', text: a.cost }) : null,
          el('span', { class: 'desc', text: a.desc }),
        ]);
        b.addEventListener('click', () => editor.insert(a.snippet + '\n'));
        return b;
      })),
    ]);

    root.append(el('div', { class: 'clash' }, [
      top,
      el('div', { class: 'clash-grid' }, [
        el('div', { class: 'clash-main' }, [stage, panels]),
        el('div', { class: 'clash-side' }, [briefing, editorCard, controls, cheat]),
      ]),
    ]));

    // ----- logging -----
    function log(text, cls) {
      const d = el('div', { class: 'log-line ' + (cls || ''), text });
      logBody.append(d);
      while (logBody.childNodes.length > 400) logBody.firstChild.remove();
      logBody.scrollTop = logBody.scrollHeight;
    }
    const whatName = w => ({ enemy: persona.name, player: 'YOU', wall: 'a wall', crate: 'a crate', target: 'a target', edge: 'the edge' }[w] || w);
    function describeEvent(e) {
      const who = e.who === 'player' ? 'You' : persona.name;
      switch (e.t) {
        case 'move': return [who + ': move("' + e.dir + '") → (' + e.to[0] + ', ' + e.to[1] + ')', e.who];
        case 'bonk': return [who + ': move("' + e.dir + '") → BONK! Something is in the way.', 'warn'];
        case 'fire': return [who + ': fire("' + e.dir + '") → hit ' + whatName(e.what), e.who];
        case 'shield': return [who + ': shield() → shields up', e.who];
        case 'noenergy': return [who + ': ' + e.action + '() needs ' + e.cost + ' ⚡ but only ' + e.en + ' left, so it was skipped.', 'warn'];
        case 'damage': return [(e.who === 'player' ? 'You take ' : persona.name + ' takes ') + e.amount + ' damage (' + e.hp + ' HP left)', e.who === 'player' ? 'bad' : 'good'];
        case 'blocked': return ['🛡 ' + (e.who === 'player' ? 'Your' : persona.name + '\'s') + ' shield absorbed the hit!', 'info'];
        case 'crate': return ['📦 Crate destroyed at (' + e.x + ', ' + e.y + ')', 'info'];
        case 'target': return ['🎯 Target destroyed! ' + (e.left ? e.left + ' left.' : 'All clear!'), 'good'];
        case 'pickup': return ['✨ ' + who + ' grabbed a ' + (e.type === 'battery' ? 'battery' : 'repair kit') + ' (' + e.text + ')', e.who === 'player' ? 'good' : 'info'];
        case 'spawn': return ['✨ A ' + (e.type === 'battery' ? 'battery (+2 ⚡)' : 'repair kit (+30 HP)') + ' appeared at (' + e.x + ', ' + e.y + ')', 'info'];
        case 'log': return ['📝 ' + e.text, 'console ' + e.level];
        case 'say': return [who + ' says "' + e.text + '"', 'say'];
        case 'info': return [who + ': ' + e.text, 'warn'];
        default: return null;
      }
    }
    function onEvent(e) {
      const d = describeEvent(e);
      if (d) log(d[0], d[1]);
      if (e.who === 'player' && e.en !== undefined) hudYou.en.textContent = '⚡ ' + e.en;
      if ((e.t === 'damage' || e.t === 'pickup') && e.hp !== undefined) {
        const h = e.who === 'player' ? hudYou : hudCpu;
        if (h) setHudHp(h, e.hp, state[e.who].maxHp);
      }
      if (e.t === 'shield' || e.t === 'blocked' || e.t === 'shieldDown') {
        const h = e.who === 'player' ? hudYou : hudCpu;
        if (h) h.sh.hidden = e.t !== 'shield';
      }
      if (e.t === 'target') hudGoal.textContent = '🎯 Targets left: ' + e.left;
    }

    // ----- CPU terminal -----
    let termQueue = Promise.resolve();
    function termType(lines, cls) {
      termQueue = termQueue.then(async () => {
        for (const line of lines) {
          if (!alive) return;
          const d = el('div', { class: 'term-line ' + (cls || '') });
          termBody.append(d);
          for (let i = 1; i <= line.length; i++) {
            if (!alive) return;
            d.textContent = line.slice(0, i);
            if (i % 3 === 0) {
              if (cls !== 'say') Sfx.type();
              await sleep(16 * speed);
            }
          }
          while (termBody.childNodes.length > 200) termBody.firstChild.remove();
          termBody.scrollTop = termBody.scrollHeight;
        }
      });
      return termQueue;
    }
    function cpuSay(kind) {
      const list = persona[kind];
      if (!list || !list.length) return;
      const text = pickOne(list);
      termType(['> ' + text], 'say');
      if (scene && state.enemy && state.enemy.hp > 0) scene.say('enemy', text);
    }

    // ----- errors -----
    function lineOf(err) {
      const n = editor.getValue().split('\n').length;
      return err.line >= 1 && err.line <= n ? err.line : null;
    }
    function hintFor(err) {
      const m = err.message;
      const dir = /^(?:Can't find variable: |)(up|down|left|right)(?: is not defined|)$/.exec(m);
      if (dir) return ' → Directions are strings, so put quotes around them: "' + dir[1] + '"';
      if (/null/.test(m) && !state.enemy) return ' → There\'s no enemy in this mission, so enemy is null.';
      if (/Unexpected end of input/.test(m)) return ' → Looks like a } or ) is missing.';
      if (/missing \) after argument list/.test(m)) return ' → A ( is missing its matching ).';
      if (/Invalid or unexpected token/.test(m)) return ' → Check for curly quotes “ ” and use straight quotes " instead.';
      if (/Assignment to constant variable/.test(m)) return ' → Use let instead of const if the value needs to change.';
      if (/is not defined|Can't find variable/.test(m)) return ' → Check the spelling, or create it first with const or let.';
      if (/is not a function/.test(m)) return ' → Check the spelling, and that you added () after a function name.';
      return '';
    }
    function errorText(err) {
      const line = lineOf(err);
      return '🐞 ' + (line ? 'Line ' + line + ': ' : '') + err.message + hintFor(err);
    }

    // ----- ghost preview of the plan -----
    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(runPreview, 280);
    }
    async function runPreview() {
      if (!alive || phase !== 'idle' || !scene) return;
      const code = editor.getValue(), seq = ++previewSeq;
      const res = await previewRunner.run(state, code, 1200);
      if (!alive || seq !== previewSeq || phase !== 'idle' || res.stale) return;
      if (res.error) {
        scene.ghost(null);
        editor.markLine(lineOf(res.error));
        planBar.className = 'clash-plan error';
        planBar.textContent = errorText(res.error);
        return;
      }
      editor.markLine(null);
      scene.ghost(res.events);
      const mine = res.events.filter(e => e.who === 'player');
      const count = t => mine.filter(e => e.t === t).length;
      const lastEnergy = [...mine].reverse().find(e => e.en !== undefined);
      const hits = mine.filter(e => e.t === 'fire' && (e.what === 'enemy' || e.what === 'target')).length;
      const parts = ['👣 ' + count('move') + ' move' + (count('move') === 1 ? '' : 's')];
      if (count('bonk')) parts.push('💥 ' + count('bonk') + ' bonk' + (count('bonk') === 1 ? '' : 's'));
      parts.push('🔫 ' + count('fire') + ' shot' + (count('fire') === 1 ? '' : 's') + (count('fire') ? ' (' + hits + ' on target)' : ''));
      if (count('shield')) parts.push('🛡 shield');
      parts.push('⚡ ' + (lastEnergy ? lastEnergy.en : state.player.energy) + ' left');
      if (count('noenergy')) parts.push('⚠️ ran out of energy');
      if (res.state && res.state.over && res.state.over.result === 'win') parts.push('🏆 wins!');
      parts.push('✍️ ' + R.codeSize(code) + ' chars');
      planBar.className = 'clash-plan';
      planBar.textContent = 'Plan: ' + parts.join(' · ');
    }

    // ----- turn flow -----
    function setControls() {
      runBtn.disabled = phase === 'loading' || (phase === 'running' && !autopilot);
      if (phase === 'over') runBtn.textContent = '↺ Play again';
      else if (phase === 'running') runBtn.textContent = autopilot ? '⏸ Stop autopilot' : '⏳ Running…';
      else runBtn.textContent = '▶ Run turn ' + state.turn;
      restartBtn.disabled = phase === 'loading';
    }
    function stopAutopilot() {
      autopilot = false;
      autoBox.checked = false;
      clearTimeout(autoTimer);
    }

    async function runTurn() {
      if (phase === 'over') return restart();
      if (phase === 'running' && autopilot) { stopAutopilot(); setControls(); return; }
      if (phase !== 'idle') return;
      Sfx.unlock();
      Sfx.run();
      phase = 'running';
      setControls();
      clearTimeout(previewTimer);
      previewSeq++;
      const code = editor.getValue();
      const res = await turnRunner.run(state, code, 2000);
      if (!alive) return;
      if (res.stale) { phase = 'idle'; setControls(); return; }
      if (res.error) {
        (res.events || []).forEach(onEvent);
        log(errorText(res.error), 'error');
        log('Your turn didn\'t happen. Fix the bug and press Run again.', 'muted');
        editor.markLine(lineOf(res.error));
        planBar.className = 'clash-plan error';
        planBar.textContent = errorText(res.error);
        if (Math.random() < 0.5) cpuSay('error');
        Sfx.denied();
        stopAutopilot();
        phase = 'idle';
        setControls();
        return;
      }
      editor.markLine(null);
      scene.ghost(null);
      stats.turns++;
      if (!autopilot) stats.autopilotAll = false;
      log('── Turn ' + state.turn + ': you ──', 'turn');
      const enemyHp = state.enemy ? state.enemy.hp : 0;
      state = res.state;
      scene.state = state;
      await scene.play(res.events, onEvent);
      if (!alive) return;
      scene.sync(state);
      refreshHud();
      if (state.over) return endGame();
      if (state.enemy && state.enemy.hp < enemyHp && Math.random() < 0.6) cpuSay('hurt');
      await cpuTurn();
    }

    async function cpuTurn() {
      if (state.enemy && mission.ai && state.enemy.hp > 0) {
        await sleep(250 * speed);
        if (!alive) return;
        log('── Turn ' + state.turn + ': ' + persona.name + ' ──', 'turn');
        await scene.play(R.startTurn(state, 'enemy'), onEvent);
        const playerHp = state.player.hp;
        const { events, lines } = R.aiTurn(state);
        termType(lines);
        await scene.play(events, onEvent);
        if (!alive) return;
        scene.sync(state);
        refreshHud();
        if (state.over) return endGame();
        if (state.player.hp < playerHp && Math.random() < 0.6) cpuSay('hit');
      }
      state.turn++;
      if (state.turn > mission.maxTurns) {
        R.finish(state, 'lose', 'Out of turns!', []);
        return endGame();
      }
      await scene.play(R.startTurn(state, 'player'), onEvent);
      if (!alive) return;
      scene.sync(state);
      refreshHud();
      phase = 'idle';
      setControls();
      if (autopilot) autoTimer = setTimeout(() => { if (autopilot && phase === 'idle') runTurn(); }, 500 * speed);
      else runPreview();
    }

    function endGame() {
      phase = 'over';
      stopAutopilot();
      setControls();
      scene.ghost(null);
      const won = state.over.result === 'win';
      const s = {
        won, turns: stats.turns, bonks: state.stats.bonks, shots: state.stats.shots, hits: state.stats.hits,
        hp: state.player.hp, autopilot: stats.autopilotAll && stats.turns > 0, code: R.codeSize(editor.getValue()),
      };
      const results = mission.stars.map(st => won && !!st.test(s));
      const earned = results.filter(Boolean).length;
      const prev = save.stars[mission.id] || 0;
      const goals = mission.stars.map((_, i) => !!(goalsDone()[i] || results[i]));
      save.goals[mission.id] = goals;
      save.stars[mission.id] = goals.filter(Boolean).length;
      store.set('jsm-clash', save);
      starList.replaceChildren(...mission.stars.map(starItem));
      if (won) { Sfx.win(); scene.celebrate(); } else { Sfx.lose(); scene.defeat(); }
      cpuSay(won ? 'playerWon' : 'playerLost');
      log(won ? '🏆 ' + state.over.reason : '💀 ' + state.over.reason, won ? 'good' : 'bad');
      setTimeout(() => { if (alive) showOverlay(won, results, earned, save.stars[mission.id] > prev); }, 900);
    }

    function showOverlay(won, results, earned, improved) {
      overlay.innerHTML = '';
      const next = MISSIONS[index + 1];
      overlay.append(el('div', { class: 'ov-card ' + (won ? 'win' : 'lose') }, [
        el('div', { class: 'ov-title', text: won ? 'Mission complete!' : /turns/.test(state.over.reason) ? 'Time\'s up!' : 'Defeated' }),
        el('div', { class: 'ov-reason', text: state.over.reason + (improved ? ' ★ New star' + (save.stars[mission.id] > 1 ? 's' : '') + ' saved!' : '') }),
        won ? el('div', { class: 'ov-stars' }, [0, 1, 2].map(i => el('span', { class: 'ov-star' + (i < earned ? ' on' : ''), style: 'animation-delay:' + (0.2 + i * 0.25) + 's', text: '★' }))) : null,
        el('ul', { class: 'ov-goals' }, mission.stars.map((st, i) => el('li', { class: won && results[i] ? 'ok' : '', text: (won && results[i] ? '★ ' : '☆ ') + st.text }))),
        won ? null : el('div', { class: 'ov-tip', text: '💡 ' + mission.hints[Math.min(1, mission.hints.length - 1)] }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn' + (won ? '' : ' primary'), text: won ? '↺ Replay' : '↺ Try again', onclick: () => restart() }),
          won && next ? el('a', { class: 'btn primary', href: '#/game/' + next.id, text: 'Next: ' + next.title + ' →' }) : null,
          el('a', { class: 'btn', href: '#/game', text: 'All missions' }),
        ]),
      ]));
      overlay.hidden = false;
    }

    function restart() {
      if (!scene) return;
      overlay.hidden = true;
      stopAutopilot();
      clearTimeout(previewTimer);
      state = R.createState(mission);
      stats = { turns: 0, autopilotAll: true };
      scene.build(state, mission);
      R.startTurn(state, 'player');
      logBody.innerHTML = '';
      termBody.innerHTML = '';
      log('Mission start! ' + mission.objective, 'info');
      refreshHud();
      phase = 'idle';
      setControls();
      runPreview();
      cpuSay('hello');
    }

    setCleanup(() => {
      alive = false;
      clearTimeout(previewTimer);
      clearTimeout(autoTimer);
      turnRunner.destroy();
      previewRunner.destroy();
      if (game) game.destroy(true);
    });

    refreshHud();
    setControls();
    loadPhaser()
      .then(() => {
        if (!alive) return null;
        canvasBox.innerHTML = '';
        const arena = createArena(canvasBox);
        game = arena.game;
        return arena.ready;
      })
      .then(s => {
        if (!alive || !s) return;
        scene = s;
        scene.speed = speed;
        scene.onTileClick = (x, y) => editor.insert(x + ', ' + y);
        if (/[?&]clashdebug/.test(location.search)) window.__clash = { scene, game, getState: () => state, getPhase: () => phase };
        restart();
      })
      .catch(err => {
        canvasBox.innerHTML = '';
        canvasBox.append(el('div', { class: 'clash-loading', text: '⚠️ ' + err.message + '. Check your internet connection and reload the page.' }));
      });
  }

  function render(root, param, ctx) {
    const index = MISSIONS.findIndex(m => m.id === param);
    if (index === -1) renderMenu(root, ctx);
    else renderMission(root, MISSIONS[index], index, ctx);
  }

  window.CodeClash = { render, totalStars: store => totalStars(loadSave(store)), maxStars: MISSIONS.length * 3 };
})();
