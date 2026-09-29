// "Live Lab" lessons: each one is a real mini web page (html + css) that the
// learner changes by writing JavaScript, one step at a time.
//
// Each step's `check` is the body of an async function that runs inside a fresh
// copy of the page after the learner's code, and must return true.
// Helpers available in checks: $(sel), $$(sel), click(target), typeInto(target, text),
// press(key), submit(form), wait(ms), and __code (the learner's source as a string).
// Steps complete in order. Challenge steps hide their code behind "Show me".

window.MODULES.unshift({
  id: 'web',
  title: 'Live Lab: JS on a Real Web Page',
  blurb: 'Learn by doing. Type code on the left and watch a real web page react on the right, live.',
});

window.LESSONS.unshift(
  // ─────────────────────────────────────────────────────────────
  {
    id: 'web-intro',
    module: 'web',
    type: 'web',
    title: 'What JavaScript Does on a Page',
    summary: 'HTML, CSS and JS working together. Change a real page with your first lines of code.',
    intro: `
      <p>Every website is made of three languages working together:</p>
      <div class="trio">
        <div><strong>HTML</strong><span>Structure: the bones. Headings, buttons, images.</span></div>
        <div><strong>CSS</strong><span>Style: the skin. Colors, fonts, layout.</span></div>
        <div><strong>JavaScript</strong><span>Behavior: the muscles. Reacting, changing, computing.</span></div>
      </div>
      <p>When a browser opens a page, it reads the HTML and builds a live model of it in memory called the <strong>DOM</strong>. JavaScript can change that model at any moment, and the browser immediately repaints the screen to match.</p>
      <div class="flow">
        <div class="node">📄 HTML + CSS</div><div class="arrow">→</div>
        <div class="node">🌳 Browser builds the DOM</div><div class="arrow">→</div>
        <div class="node accent">⚡ Your JS changes the DOM</div><div class="arrow">→</div>
        <div class="node">🖥️ Screen repaints</div>
      </div>
      <p><strong>How this works:</strong> the page on the right is real. Type the code from each step into the editor. The page re-runs your code as you type, and the step ticks off when it detects that you've done it.</p>
    `,
    html: `<main class="card">
  <h1>A plain web page</h1>
  <p class="lead">Right now this page is just HTML and CSS. Nothing on it does anything.</p>
  <button id="magic">Click me</button>
</main>`,
    css: `h1 { transition: color .3s; }`,
    starter: `// This code runs inside the page on the right →
// Follow the steps on the left. The page updates as you type.

`,
    steps: [
      {
        title: 'Change the heading',
        instruction: `<p><code>document</code> is JavaScript's handle on the whole page. <code>querySelector</code> finds the first element that matches a CSS selector, and <code>textContent</code> is the text inside it.</p><p>Type this and watch the heading change:</p>`,
        code: `document.querySelector("h1").textContent = "Hello from JavaScript!";`,
        check: `return $("h1").textContent.trim() !== "A plain web page";`,
      },
      {
        title: 'Change a style',
        instruction: `<p>Every element has a <code>style</code> property for its CSS. CSS names like <code>font-size</code> become camelCase in JS: <code>fontSize</code>.</p><p>Add this line <em>below</em> your first one:</p>`,
        code: `document.querySelector("h1").style.color = "tomato";`,
        after: `Try other values: <code>"royalblue"</code>, <code>"#8a3ffc"</code>. Or add <code>.style.fontSize = "48px"</code>.`,
        check: `return $("h1").style.color !== "";`,
      },
      {
        title: 'Save it in a variable',
        instruction: `<p>Searching the page over and over is repetitive. Store the element in a variable once and reuse it. <strong>Replace</strong> your two lines with:</p>`,
        code: `const title = document.querySelector("h1");
title.textContent = "Hello from JavaScript!";
title.style.color = "tomato";`,
        check: `return typeof title !== "undefined" && title instanceof HTMLElement;`,
      },
      {
        title: 'Make the button do something',
        instruction: `<p>This is where pages become <em>interactive</em>. <code>addEventListener</code> says "when this happens, run this function." Add:</p>`,
        code: `const button = document.querySelector("#magic");

button.addEventListener("click", () => {
  title.textContent = "You clicked the button! 🎉";
});`,
        after: `Now <strong>click the button in the page</strong> on the right. The <code>#</code> in <code>"#magic"</code> means "the element with id magic".`,
        check: `const before = document.body.innerHTML; click("#magic"); await wait(30); return document.body.innerHTML !== before;`,
      },
      {
        title: 'Create a brand-new element',
        instruction: `<p>JavaScript can also build new HTML from nothing. Create a paragraph and add it to the page:</p>`,
        code: `const note = document.createElement("p");
note.textContent = "I was created by JavaScript.";
document.querySelector("main").append(note);`,
        after: `Open the <strong>DOM tree</strong> tab under the page. Your new <code>&lt;p&gt;</code> is in there, flashing.`,
        check: `return $$("main p").length >= 2;`,
      },
    ],
    quiz: [
      {
        q: 'What is the DOM?',
        options: ['A JavaScript framework', 'The browser\'s live, in-memory model of the page that JS can change', 'A CSS file'],
        answer: 1,
        explain: 'The browser builds the DOM from your HTML. When JS changes it, the screen updates to match.',
      },
      {
        q: 'What does <code>document.querySelector(".box")</code> return?',
        options: ['Every element with class "box"', 'The first element with class "box" (or null)', 'The text "box"'],
        answer: 1,
        explain: 'It returns the first match, or <code>null</code> if there isn\'t one. <code>querySelectorAll</code> returns all matches.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'web-dom',
    module: 'web',
    type: 'web',
    title: 'The DOM Tree',
    summary: 'Your page is a tree of nodes. Select, loop over, add to, and walk it.',
    intro: `
      <p>The browser turns every HTML tag into an object called a <strong>node</strong> and arranges them in a <strong>tree</strong>. A <code>&lt;ul&gt;</code> is a parent, its <code>&lt;li&gt;</code>s are its children, and those children are siblings of each other.</p>
      <p>Keep the <strong>DOM tree</strong> tab open below the page as you work. It's a live view of the tree, like the Elements panel in your browser's DevTools, and nodes flash when your code changes them.</p>
      <div class="callout"><p><strong>Pro tip:</strong> on any real website, right-click → <em>Inspect</em> opens this same tree. Try it on this site!</p></div>
    `,
    html: `<main class="card">
  <h1 id="title">Groceries</h1>
  <ul id="list">
    <li class="item">Apples</li>
    <li class="item">Bread</li>
    <li class="item">Coffee</li>
  </ul>
  <p id="status" class="muted">3 items</p>
</main>`,
    css: `ul { padding-left: 0; list-style: none; }
li { padding: 8px 12px; border-radius: 8px; margin: 4px 0; transition: background .3s; }
.highlight { background: #fff3b0; }
.done { text-decoration: line-through; opacity: .5; }`,
    starter: `// Your code runs inside the grocery page →

`,
    steps: [
      {
        title: 'Select many elements at once',
        instruction: `<p><code>querySelectorAll</code> returns <em>every</em> match as a list. The <code>.</code> in <code>".item"</code> means "has class item".</p>`,
        code: `const items = document.querySelectorAll(".item");
console.log("Found", items.length, "items");`,
        after: `Check the <strong>Console</strong> tab under the page for the output.`,
        check: `return typeof items !== "undefined" && items.length >= 3;`,
      },
      {
        title: 'Loop over them',
        instruction: `<p><code>classList.add</code> puts a CSS class on an element. The page's CSS already defines <code>.highlight</code>. Styling with classes is cleaner than setting <code>style</code> directly.</p>`,
        code: `items.forEach(item => {
  item.classList.add("highlight");
});`,
        check: `return $$(".item.highlight").length >= 3;`,
      },
      {
        title: 'Walk the tree',
        instruction: `<p>Once you have one node, you can move around the tree from it: <code>children</code>, <code>firstElementChild</code>, <code>lastElementChild</code>, <code>parentElement</code>, <code>nextElementSibling</code>…</p>`,
        code: `const list = document.querySelector("#list");
console.log(list.children.length, "children");
console.log("First:", list.firstElementChild.textContent);
list.lastElementChild.classList.add("done");`,
        check: `return [...$$("#list li")].some(li => li.classList.contains("done"));`,
      },
      {
        title: 'Grow the tree',
        instruction: `<p>Create a new <code>&lt;li&gt;</code> and attach it to the list. Watch it appear in the DOM tree tab.</p>`,
        code: `const milk = document.createElement("li");
milk.textContent = "Milk";
milk.className = "item";
list.append(milk);`,
        after: `Notice that "Milk" isn't highlighted. Your <code>forEach</code> ran before Milk existed, and the list from <code>querySelectorAll</code> is a snapshot.`,
        check: `return [...$$("#list li")].some(li => li.textContent.trim() === "Milk");`,
      },
      {
        title: 'Challenge: keep the page in sync',
        challenge: true,
        instruction: `<p>The page still says <strong>"3 items"</strong>, but there are 4 now! At the <strong>bottom</strong> of your code, make <code>#status</code> show the real count. Use <code>list.children.length</code>.</p>`,
        code: `document.querySelector("#status").textContent = list.children.length + " items";`,
        after: `This is the core problem every UI has: keeping what's on screen in sync with your data. Frameworks like React exist to automate exactly this.`,
        check: `return $("#status").textContent.trim() === $("#list").children.length + " items";`,
      },
    ],
    quiz: [
      {
        q: 'What\'s the difference between <code>querySelector</code> and <code>querySelectorAll</code>?',
        options: ['None', 'The first returns one element; the second returns a list of all matches', 'querySelectorAll is faster'],
        answer: 1,
        explain: 'Use <code>querySelectorAll</code> + <code>forEach</code> to act on many elements at once.',
      },
      {
        q: 'Why prefer <code>el.classList.add("active")</code> over setting <code>el.style</code>?',
        options: ['It\'s the only way that works', 'It keeps styling in CSS and behavior in JS, and is easy to undo with remove/toggle', 'Classes load faster'],
        answer: 1,
        explain: 'JS decides <em>when</em>, CSS decides <em>how it looks</em>. <code>classList.toggle</code> makes on/off states trivial.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'web-events',
    module: 'web',
    type: 'web',
    title: 'Events: Pages That React',
    summary: 'Clicks, typing, hovering and key presses. Build a counter and a live greeting.',
    intro: `
      <p>Most of the time, JavaScript on a page is just <em>waiting</em>. When something happens (a click, a key press, typing, the mouse moving), the browser fires an <strong>event</strong>. Your code registers <strong>listeners</strong>, which are functions the browser calls when that event happens.</p>
      <div class="flow">
        <div class="node">🖱️ You click</div><div class="arrow">→</div>
        <div class="node">📬 Browser queues a "click" event</div><div class="arrow">→</div>
        <div class="node accent">⚡ Your listener function runs</div><div class="arrow">→</div>
        <div class="node">🖥️ Page updates</div>
      </div>
      <p>Every listener receives an <strong>event object</strong> with details: which key, which element, where the mouse was, and more.</p>
    `,
    html: `<main class="card">
  <h1>Counter</h1>
  <div class="count" id="count">0</div>
  <div class="row">
    <button id="minus">−</button>
    <button id="plus">+</button>
    <button id="reset" class="ghost">Reset</button>
  </div>
  <hr>
  <label for="name">Your name</label>
  <input id="name" placeholder="Type here…" autocomplete="off">
  <p id="greeting">Hello, stranger!</p>
  <div id="box" class="box">Hover over me</div>
</main>`,
    css: `.count { font-size: 64px; font-weight: 800; text-align: center; margin: 4px 0 12px; font-variant-numeric: tabular-nums; }
.row { display: flex; gap: 8px; justify-content: center; }
.row button { min-width: 64px; font-size: 20px; }
.box { margin-top: 12px; padding: 18px; border-radius: 10px; text-align: center; background: #eee; transition: all .25s; }
.box.active { background: #8a3ffc; color: white; transform: scale(1.04); }`,
    starter: `// Your code runs inside the counter page →

`,
    steps: [
      {
        title: 'Your first listener',
        instruction: `<p>Keep the count in a variable (your <em>data</em>) and update the display whenever it changes.</p>`,
        code: `let count = 0;
const display = document.querySelector("#count");

document.querySelector("#plus").addEventListener("click", () => {
  count++;
  display.textContent = count;
});`,
        after: `Click <strong>+</strong> in the page a few times!`,
        check: `click("#plus"); click("#plus"); return $("#count").textContent.trim() === "2";`,
      },
      {
        title: 'Challenge: finish the counter',
        challenge: true,
        instruction: `<p>Make <strong>−</strong> decrease the count and <strong>Reset</strong> set it back to 0. Use the same pattern as step 1.</p>`,
        code: `document.querySelector("#minus").addEventListener("click", () => {
  count--;
  display.textContent = count;
});

document.querySelector("#reset").addEventListener("click", () => {
  count = 0;
  display.textContent = count;
});`,
        check: `click("#plus"); click("#plus"); click("#minus"); const a = $("#count").textContent.trim(); click("#reset"); return a === "1" && $("#count").textContent.trim() === "0";`,
      },
      {
        title: 'React to typing',
        instruction: `<p>The <code>input</code> event fires on every keystroke. <code>event.target</code> is the element the event happened on, and <code>.value</code> is what's typed in it.</p>`,
        code: `const nameInput = document.querySelector("#name");
const greeting = document.querySelector("#greeting");

nameInput.addEventListener("input", (event) => {
  greeting.textContent = "Hello, " + event.target.value + "!";
});`,
        after: `Type your name in the page's box and watch the greeting follow along.`,
        check: `typeInto("#name", "Ada"); return $("#greeting").textContent.includes("Ada");`,
      },
      {
        title: 'Challenge: handle an empty box',
        challenge: true,
        instruction: `<p>Type something, then delete it all. The page says <strong>"Hello, !"</strong>. Fix it so an empty box shows <strong>"Hello, stranger!"</strong>. (Hint: <code>||</code> gives a fallback for falsy values like <code>""</code>.)</p>`,
        code: `greeting.textContent = "Hello, " + (event.target.value || "stranger") + "!";`,
        check: `typeInto("#name", "Ada"); typeInto("#name", ""); return $("#greeting").textContent.trim() === "Hello, stranger!";`,
      },
      {
        title: 'Mouse events',
        instruction: `<p><code>mouseenter</code> and <code>mouseleave</code> fire when the pointer moves over and off an element. The page's CSS has an <code>.active</code> style ready to go.</p>`,
        code: `const box = document.querySelector("#box");
box.addEventListener("mouseenter", () => box.classList.add("active"));
box.addEventListener("mouseleave", () => box.classList.remove("active"));`,
        check: `const b = $("#box"); b.dispatchEvent(new MouseEvent("mouseenter")); const on = b.classList.contains("active"); b.dispatchEvent(new MouseEvent("mouseleave")); return on && !b.classList.contains("active");`,
      },
      {
        title: 'Keyboard shortcuts',
        instruction: `<p>Listen on the whole <code>document</code> to catch keys pressed anywhere. <code>event.key</code> tells you which key it was.</p>`,
        code: `document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") document.querySelector("#plus").click();
  if (event.key === "ArrowDown") document.querySelector("#minus").click();
});`,
        after: `Click on the page's background first (so it has keyboard focus), then press ↑ and ↓.`,
        check: `press("ArrowUp"); press("ArrowUp"); return $("#count").textContent.trim() === "2";`,
      },
    ],
    quiz: [
      {
        q: 'What\'s wrong with <code>button.addEventListener("click", sayHi())</code>?',
        options: ['Nothing', 'It calls sayHi immediately and passes its result, instead of passing the function itself', 'Event names must be uppercase'],
        answer: 1,
        explain: 'Pass the function, don\'t call it: <code>addEventListener("click", sayHi)</code> or <code>() =&gt; sayHi()</code>.',
      },
      {
        q: 'In a listener, what is <code>event.target</code>?',
        options: ['The element the event happened on', 'The function being called', 'Always the document'],
        answer: 0,
        explain: 'For an input event, <code>event.target.value</code> is the current text in the box.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'web-runtime',
    module: 'web',
    type: 'web',
    title: 'Under the Hood: How the Browser Runs JS',
    summary: 'The engine, Web APIs, and the single main thread. Animate something, then freeze it.',
    intro: `
      <p>Two different things work together when JavaScript runs in a browser:</p>
      <div class="trio two">
        <div><strong>The JS engine</strong><span>V8 (Chrome, Edge), SpiderMonkey (Firefox), JavaScriptCore (Safari). It understands the <em>language</em>: variables, functions, objects, promises.</span></div>
        <div><strong>The browser's Web APIs</strong><span><code>document</code>, events, <code>setTimeout</code>, <code>fetch</code>, <code>localStorage</code>. These aren't part of JavaScript itself; the browser hands them to your code.</span></div>
      </div>
      <p>Both your JavaScript <em>and</em> the drawing of the page share <strong>one main thread</strong>, which repeats this loop about 60 times a second:</p>
      <div class="flow">
        <div class="node">▶️ Run a task<br><small>your script, a click handler, a timer</small></div><div class="arrow">→</div>
        <div class="node">⚡ Run all microtasks<br><small>promise callbacks</small></div><div class="arrow">→</div>
        <div class="node accent">🎨 Render<br><small>requestAnimationFrame → layout → paint</small></div><div class="arrow">↻</div>
      </div>
      <p>So while your code is running, the page <strong>can't repaint or respond</strong>. In this lab you'll see that happen for yourself.</p>
    `,
    html: `<main class="card">
  <h1>The main thread</h1>
  <div class="track"><div id="ball" class="ball"></div></div>
  <div class="row">
    <button id="start">Start / stop</button>
    <button id="freeze" class="danger">Freeze for 1.5s</button>
  </div>
  <div class="row" style="margin-top:14px">
    <button id="clickme" class="ghost">Click me any time</button>
  </div>
  <p class="muted" style="text-align:center">Clicks counted: <strong id="clicks">0</strong></p>
</main>`,
    css: `.track { position: relative; height: 56px; background: #f0efeb; border-radius: 99px; margin: 8px 0 16px; overflow: hidden; }
.ball { position: absolute; top: 8px; left: 8px; width: 40px; height: 40px; border-radius: 50%; background: #f7df1e; border: 3px solid #1f1f1d; }
.row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }`,
    starter: `// Your code runs inside the page →

`,
    steps: [
      {
        title: 'Animate with requestAnimationFrame',
        instruction: `<p><code>requestAnimationFrame(fn)</code> asks the browser to run <code>fn</code> right before the next repaint. Calling it again inside <code>fn</code> gives you a smooth loop, one step per frame.</p>`,
        code: `const ball = document.querySelector("#ball");
let x = 0;

function frame() {
  x = (x + 3) % 280;
  ball.style.transform = "translateX(" + x + "px)";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`,
        after: `The ball is moving because your function runs about 60 times per second.`,
        check: `if (typeof frame === "function") frame(); await wait(60); return /translate/.test($("#ball").style.transform);`,
      },
      {
        title: 'Start and stop it',
        instruction: `<p>Add a <code>running</code> flag. <strong>Replace</strong> your code with this version, which only keeps animating while <code>running</code> is true:</p>`,
        code: `const ball = document.querySelector("#ball");
let x = 0;
let running = false;

function frame() {
  x = (x + 3) % 280;
  ball.style.transform = "translateX(" + x + "px)";
  if (running) requestAnimationFrame(frame);
}

document.querySelector("#start").addEventListener("click", () => {
  running = !running;
  if (running) requestAnimationFrame(frame);
});`,
        check: `click("#start"); const a = running; click("#start"); return a === true && running === false;`,
      },
      {
        title: 'Count clicks',
        instruction: `<p>A simple click counter. You'll use it in the next step to prove a point.</p>`,
        code: `let clicks = 0;
document.querySelector("#clickme").addEventListener("click", () => {
  clicks++;
  document.querySelector("#clicks").textContent = clicks;
});`,
        check: `click("#clickme"); click("#clickme"); return $("#clicks").textContent.trim() === "2";`,
      },
      {
        title: 'Freeze the main thread 🥶',
        instruction: `<p>This loop keeps the thread busy for 1.5 seconds doing nothing useful, just like a slow calculation would.</p>`,
        code: `document.querySelector("#freeze").addEventListener("click", () => {
  const start = Date.now();
  while (Date.now() - start < 1500) {
    // busy... blocking everything
  }
});`,
        after: `<strong>Try it:</strong> start the ball, click <em>Freeze</em>, then quickly click "Click me" several times. The ball stops and the counter doesn't move. When the freeze ends, all your clicks land at once, because they were waiting in the event queue. This is why long-running JS makes websites feel "janky".`,
        check: `const t = Date.now(); click("#freeze"); return Date.now() - t >= 1000;`,
      },
    ],
    quiz: [
      {
        q: 'Where does <code>document</code> come from?',
        options: ['It\'s built into the JavaScript language', 'The browser provides it as a Web API', 'You have to import it'],
        answer: 1,
        explain: 'Node.js runs the same language with no <code>document</code>, because there\'s no page. The DOM is a browser API.',
      },
      {
        q: 'Why does the page stop responding during a long <code>while</code> loop?',
        options: ['The browser crashes', 'JS and rendering share one main thread, so nothing else can run until the loop finishes', 'Loops are slow in JavaScript'],
        answer: 1,
        explain: 'Events and repaints wait in line until the current task finishes. Keep tasks short, or move heavy work to a Web Worker.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'web-todo',
    module: 'web',
    type: 'web',
    title: 'Build It: A To-Do App',
    summary: 'Put it all together: forms, creating elements, toggling, counting, deleting.',
    intro: `
      <p>Time to build a real, working app from scratch using everything so far: selecting elements, listening for events, creating nodes, and keeping the screen in sync with what's happening.</p>
      <p>This is how interactive sites were built before frameworks, and it's what React, Vue and friends do for you behind the scenes. Understanding it makes those tools make sense.</p>
    `,
    html: `<main class="card">
  <h1>My To-Dos</h1>
  <form id="form">
    <input id="input" placeholder="What needs doing?" autocomplete="off">
    <button>Add</button>
  </form>
  <ul id="list"></ul>
  <p id="count" class="muted">0 items left</p>
</main>`,
    css: `form { display: flex; gap: 8px; }
form input { flex: 1; }
ul { list-style: none; padding: 0; margin: 14px 0 4px; }
li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; margin: 6px 0; border: 1px solid #e2e0da; border-radius: 8px; cursor: pointer; user-select: none; }
li:hover { background: #fafaf7; }
li.done { text-decoration: line-through; opacity: .5; }
.delete { background: none; border: none; color: #c0392b; font-size: 16px; padding: 2px 8px; }`,
    starter: `// Build a to-do app for the page on the right →

`,
    steps: [
      {
        title: 'Grab the elements',
        instruction: `<p>Start every UI script the same way: get handles on the elements you'll need.</p>`,
        code: `const form = document.querySelector("#form");
const input = document.querySelector("#input");
const list = document.querySelector("#list");
const count = document.querySelector("#count");`,
        // Elements with an id are also exposed as window globals, so check the source too.
        check: `return ["form", "input", "list", "count"].every(n => (__code.includes("const " + n) || __code.includes("let " + n)) && window.eval(n) instanceof HTMLElement);`,
      },
      {
        title: 'Add items when the form is submitted',
        instruction: `<p>Forms fire a <code>submit</code> event when you press Enter or click the button. By default the browser <em>reloads the page</em>. <code>event.preventDefault()</code> stops that so JavaScript can take over.</p>`,
        code: `form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement("li");
  li.textContent = text;
  list.append(li);

  input.value = "";
});`,
        after: `Add a few to-dos in the page! Then try removing the <code>preventDefault()</code> line to see what happens.`,
        check: `typeInto("#input", "Buy milk"); submit("#form"); return $$("#list li").length === 1 && $("#list li").textContent.includes("Buy milk") && $("#input").value === "";`,
      },
      {
        title: 'Click to complete',
        instruction: `<p>Inside your submit handler, right after creating <code>li</code>, give each new item its own click listener. <code>classList.toggle</code> adds the class if it's missing and removes it if it's there.</p>`,
        code: `  li.addEventListener("click", () => {
    li.classList.toggle("done");
  });`,
        check: `typeInto("#input", "A"); submit("#form"); const li = $("#list li"); li.click(); const on = li.classList.contains("done"); li.click(); return on && !li.classList.contains("done");`,
      },
      {
        title: 'Challenge: count what\'s left',
        challenge: true,
        instruction: `<p>Write a function <code>updateCount()</code> that sets <code>#count</code> to e.g. <strong>"2 items left"</strong> (or <strong>"1 item left"</strong>), counting only items <em>without</em> the <code>done</code> class. Call it after adding <em>and</em> after toggling.</p><p>Hint: <code>list.querySelectorAll("li:not(.done)")</code></p>`,
        code: `function updateCount() {
  const left = list.querySelectorAll("li:not(.done)").length;
  count.textContent = left + (left === 1 ? " item left" : " items left");
}
// ...then call updateCount() at the end of the submit handler
// and inside the click listener, after the toggle.`,
        check: `typeInto("#input", "A"); submit("#form"); typeInto("#input", "B"); submit("#form"); const first = $("#list li"); first.click(); return $("#count").textContent.trim() === "1 item left";`,
      },
      {
        title: 'Add a delete button',
        instruction: `<p>Still inside the submit handler (after <code>li.textContent = text</code>), add a ✕ button. Because the button is <em>inside</em> the <code>li</code>, its click would also bubble up and toggle "done". <code>stopPropagation()</code> prevents that.</p>`,
        code: `  const del = document.createElement("button");
  del.textContent = "✕";
  del.className = "delete";
  del.addEventListener("click", (event) => {
    event.stopPropagation();
    li.remove();
    updateCount();
  });
  li.append(del);`,
        after: `🏆 You just built a real app with plain JavaScript and no frameworks.`,
        check: `typeInto("#input", "A"); submit("#form"); typeInto("#input", "B"); submit("#form"); const del = $("#list li .delete"); if (!del) return false; del.click(); return $$("#list li").length === 1 && !$("#list li").classList.contains("done") && $("#count").textContent.trim() === "1 item left";`,
      },
    ],
    quiz: [
      {
        q: 'Why call <code>event.preventDefault()</code> in a form\'s submit handler?',
        options: ['To stop the browser\'s default behavior of reloading the page', 'To prevent errors', 'It\'s required for all events'],
        answer: 0,
        explain: 'Without it, the page reloads and everything JavaScript added is lost.',
      },
      {
        q: 'A click on a button inside an <code>&lt;li&gt;</code> also triggers the li\'s click listener. Why?',
        options: ['It\'s a browser bug', 'Events bubble up from the target through each of its ancestors', 'Both listeners were added to the button'],
        answer: 1,
        explain: 'That\'s event bubbling. <code>event.stopPropagation()</code> stops it from travelling further up the tree.',
      },
    ],
  }
);
