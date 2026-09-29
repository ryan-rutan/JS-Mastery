// All course content lives here.
// In `content`, {{run:N}} is replaced by a live editor loaded with examples[N].
// Exercise tests are JS expressions that run after the learner's code and must evaluate to true.
// `await` is allowed inside a test expression. __eq(a, b) does a deep (JSON) comparison.

window.MODULES = [
  { id: 'fundamentals', title: 'Fundamentals', blurb: 'The building blocks every JavaScript program is made of.' },
  { id: 'data', title: 'Working with Data', blurb: 'Arrays and objects: shaping, transforming and copying data.' },
  { id: 'deeper', title: 'Going Deeper', blurb: 'Closures, this, classes and errors: the ideas that trip people up.' },
  { id: 'async', title: 'Async JavaScript', blurb: 'Promises, async/await and the event loop that runs it all.' },
];

window.LESSONS = [
  // ───────────────────────────── FUNDAMENTALS ─────────────────────────────
  {
    id: 'variables',
    module: 'fundamentals',
    title: 'Variables: let, const & var',
    summary: 'Storing values, choosing the right keyword, and block scope.',
    content: `
      <p>A variable is a name that points at a value. Modern JavaScript gives you two keywords you'll use every day:</p>
      <ul>
        <li><code>const</code>: the name can't be pointed at a different value later. <strong>Use this by default.</strong></li>
        <li><code>let</code>: the name <em>can</em> be reassigned. Use it when the value really needs to change (counters, loop variables).</li>
      </ul>
      <p>There's also the older <code>var</code>. It ignores block scope and has confusing hoisting, so avoid it in new code, but you'll see it in older tutorials.</p>
      {{run:0}}
      <div class="callout"><p><strong>Key idea:</strong> <code>const</code> locks the <em>name</em>, not the value. A <code>const</code> object or array can still be changed from the inside.</p></div>
      <h3>Block scope</h3>
      <p><code>let</code> and <code>const</code> only exist inside the <code>{ }</code> block they were declared in. <code>var</code> leaks out to the whole function.</p>
      {{run:1}}
      <h3>The temporal dead zone</h3>
      <p>Using a <code>let</code>/<code>const</code> variable before its declaration line throws a <code>ReferenceError</code>. That's a good thing: it catches bugs early.</p>
    `,
    examples: [
`let score = 10;
score = score + 5;
console.log("score:", score);

const name = "Ada";
// name = "Grace"; // ❌ TypeError: Assignment to constant variable.

const user = { name: "Ada" };
user.name = "Grace"; // ✅ allowed: we changed the object, not the binding
console.log(user);

const list = [1, 2];
list.push(3);        // ✅ also allowed
console.log(list);`,
`if (true) {
  var a = "var leaks out of blocks";
  let b = "let stays inside";
}
console.log(a);
console.log(typeof b); // "undefined": b doesn't exist out here

// Try uncommenting this line:
// console.log(later); let later = 1;`,
    ],
    exercise: {
      prompt: `<p>Create a variable <code>count</code> that starts at <code>0</code>, then (on separate lines) increase it by <code>1</code> three times.</p>
               <p>Also create a constant <code>greeting</code> with the value <code>"Hello, JS"</code>.</p>`,
      starter: `// Your code here\n`,
      hint: `<code>count</code> has to change, so which keyword must it use? <code>count = count + 1</code>, <code>count += 1</code> and <code>count++</code> all work.`,
      solution: `let count = 0;\ncount++;\ncount++;\ncount++;\nconst greeting = "Hello, JS";`,
      tests: [
        { name: 'count equals 3', check: 'count === 3' },
        { name: 'greeting is "Hello, JS"', check: 'greeting === "Hello, JS"' },
      ],
    },
    quiz: [
      {
        q: 'What does this log?',
        code: `const arr = [1, 2];\narr.push(3);\nconsole.log(arr);`,
        options: ['[1, 2]', '[1, 2, 3]', 'TypeError: Assignment to constant variable', 'undefined'],
        answer: 1,
        explain: '<code>const</code> prevents reassigning <code>arr</code>, but the array itself can still be modified.',
      },
      {
        q: 'Which keyword should be your default choice for new variables?',
        options: ['var', 'let', 'const'],
        answer: 2,
        explain: 'Start with <code>const</code>. Switch to <code>let</code> only when you really need to reassign. It makes code easier to reason about.',
      },
      {
        q: 'What happens here?',
        code: `console.log(x);\nlet x = 5;`,
        options: ['Logs undefined', 'Logs 5', 'Throws a ReferenceError'],
        answer: 2,
        explain: '<code>x</code> is in the "temporal dead zone" until its declaration runs. (With <code>var</code> it would log <code>undefined</code>.)',
      },
    ],
  },

  {
    id: 'types',
    module: 'fundamentals',
    title: 'Types & Coercion',
    summary: 'Primitives, typeof, == vs ===, and truthy/falsy values.',
    content: `
      <p>JavaScript has seven <strong>primitive</strong> types (<code>string</code>, <code>number</code>, <code>bigint</code>, <code>boolean</code>, <code>undefined</code>, <code>null</code>, <code>symbol</code>) plus <strong>objects</strong>, which include arrays and functions.</p>
      <p><code>typeof</code> tells you a value's type, with a couple of famous quirks:</p>
      {{run:0}}
      <h3>Coercion: JavaScript converting types for you</h3>
      <p>When an operator gets mismatched types, JavaScript quietly converts one of them. That's called <em>coercion</em>, and it's behind a lot of "JavaScript is weird" jokes.</p>
      {{run:1}}
      <div class="callout"><p><strong>Rule of thumb:</strong> always use <code>===</code> and <code>!==</code>. They never coerce. The one common exception is <code>value == null</code>, which checks for both <code>null</code> and <code>undefined</code>.</p></div>
      <h3>Truthy & falsy</h3>
      <p>In an <code>if</code>, every value acts as either true or false. There are only 8 <strong>falsy</strong> values: <code>false</code>, <code>0</code>, <code>-0</code>, <code>0n</code>, <code>""</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. <em>Everything</em> else is truthy, including <code>"0"</code>, <code>"false"</code>, <code>[]</code> and <code>{}</code>.</p>
    `,
    examples: [
`console.log(typeof "hi", typeof 42, typeof true, typeof 10n);
console.log(typeof undefined);
console.log(typeof null);        // "object": a bug from 1995 kept for compatibility
console.log(typeof []);          // "object": arrays are objects...
console.log(Array.isArray([]));  // ...so use this to detect them
console.log(typeof function () {});

console.log(0.1 + 0.2);                  // floating point!
console.log(NaN === NaN);                // NaN is never equal to anything
console.log(Number.isNaN(Number("abc")));`,
`console.log("5" + 3);    // "53": + with a string concatenates
console.log("5" - 3);    // 2: - always converts to numbers
console.log("5" * "2");  // 10
console.log(1 == "1");   // true: loose equality converts types
console.log(1 === "1");  // false: strict equality does not
console.log(null == undefined, null === undefined);

const falsy = [false, 0, -0, 0n, "", null, undefined, NaN];
console.log(falsy.map(Boolean));
console.log(["0", "false", [], {}].map(Boolean));`,
    ],
    exercise: {
      prompt: `<p>Write a function <code>describe(value)</code> that works like <code>typeof</code> but fixes its quirks:</p>
               <ul><li>returns <code>"null"</code> for <code>null</code></li>
               <li>returns <code>"array"</code> for arrays</li>
               <li>otherwise returns whatever <code>typeof</code> returns</li></ul>`,
      starter: `function describe(value) {\n  // Your code here\n}\n\nconsole.log(describe(null), describe([1, 2]), describe("hi"));`,
      hint: `Check the special cases first: <code>value === null</code>, then <code>Array.isArray(value)</code>, then fall back to <code>typeof value</code>.`,
      solution: `function describe(value) {\n  if (value === null) return "null";\n  if (Array.isArray(value)) return "array";\n  return typeof value;\n}`,
      tests: [
        { name: 'describe(null) → "null"', check: 'describe(null) === "null"' },
        { name: 'describe([1]) → "array"', check: 'describe([1]) === "array"' },
        { name: 'describe({}) → "object"', check: 'describe({}) === "object"' },
        { name: 'describe("x") → "string"', check: 'describe("x") === "string"' },
        { name: 'describe(3) → "number"', check: 'describe(3) === "number"' },
        { name: 'describe(undefined) → "undefined"', check: 'describe(undefined) === "undefined"' },
      ],
    },
    quiz: [
      {
        q: 'What is <code>"10" + 1</code>?',
        options: ['11', '"101"', 'NaN', 'TypeError'],
        answer: 1,
        explain: 'If either side of <code>+</code> is a string, it concatenates. (<code>"10" - 1</code> would be <code>9</code>.)',
      },
      {
        q: 'Which of these values is falsy?',
        options: ['"0"', '[]', '0', '"false"'],
        answer: 2,
        explain: 'The number <code>0</code> is falsy. Non-empty strings (even <code>"0"</code>) and all objects/arrays are truthy.',
      },
      {
        q: 'What does <code>typeof null</code> return?',
        options: ['"null"', '"undefined"', '"object"'],
        answer: 2,
        explain: 'A long-standing bug that can never be fixed without breaking the web. Check for null with <code>value === null</code>.',
      },
    ],
  },

  {
    id: 'control-flow',
    module: 'fundamentals',
    title: 'Control Flow & Loops',
    summary: 'if/else, ternaries, loops, and the ?? and ?. operators.',
    content: `
      <p>Control flow decides <em>which</em> code runs and <em>how many times</em>.</p>
      {{run:0}}
      <h3>for…of vs for…in</h3>
      <p><code>for…of</code> gives you the <strong>values</strong> of an array (or string, Map, Set…). <code>for…in</code> gives you the <strong>keys</strong> of an object. On arrays it gives you index <em>strings</em>, which is rarely what you want.</p>
      <h3>Smarter defaults: ?? and ?.</h3>
      <p><code>||</code> falls back on <em>any</em> falsy value, including <code>0</code> and <code>""</code>. The nullish coalescing operator <code>??</code> only falls back on <code>null</code>/<code>undefined</code>. Optional chaining <code>?.</code> stops and returns <code>undefined</code> instead of crashing on a missing object.</p>
      {{run:1}}
    `,
    examples: [
`const temp = 22;

if (temp > 30) console.log("Hot");
else if (temp > 15) console.log("Nice");
else console.log("Cold");

const label = temp > 20 ? "warm" : "cool"; // ternary: condition ? a : b
console.log(label);

for (let i = 1; i <= 3; i++) console.log("for loop", i);

let n = 3;
while (n > 0) { console.log("while", n); n--; }

for (const fruit of ["apple", "kiwi"]) console.log("for...of", fruit);
for (const key in { a: 1, b: 2 }) console.log("for...in", key);`,
`const settings = { volume: 0, theme: null };

console.log(settings.volume || 50);  // 50: oops, 0 is falsy!
console.log(settings.volume ?? 50);  // 0: ?? only replaces null/undefined
console.log(settings.theme ?? "light");

console.log(settings.user?.name);    // undefined instead of a crash
// console.log(settings.user.name);  // ❌ TypeError`,
    ],
    exercise: {
      prompt: `<p>Classic FizzBuzz, returning an array. Write <code>fizzBuzz(n)</code> that returns an array of the numbers <code>1</code> to <code>n</code>, except:</p>
               <ul><li>multiples of 3 become <code>"Fizz"</code></li>
               <li>multiples of 5 become <code>"Buzz"</code></li>
               <li>multiples of both become <code>"FizzBuzz"</code></li></ul>`,
      starter: `function fizzBuzz(n) {\n  const result = [];\n  // Your code here\n  return result;\n}\n\nconsole.log(fizzBuzz(15));`,
      hint: `Loop from 1 to n. Check the "both" case (<code>i % 15 === 0</code>) <em>first</em>, or it will be caught by the Fizz check.`,
      solution: `function fizzBuzz(n) {\n  const result = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) result.push("FizzBuzz");\n    else if (i % 3 === 0) result.push("Fizz");\n    else if (i % 5 === 0) result.push("Buzz");\n    else result.push(i);\n  }\n  return result;\n}`,
      tests: [
        { name: 'fizzBuzz(5) → [1, 2, "Fizz", 4, "Buzz"]', check: '__eq(fizzBuzz(5), [1, 2, "Fizz", 4, "Buzz"])' },
        { name: '15th item is "FizzBuzz"', check: 'fizzBuzz(15)[14] === "FizzBuzz"' },
        { name: 'returns n items', check: 'fizzBuzz(30).length === 30' },
        { name: 'fizzBuzz(0) → []', check: '__eq(fizzBuzz(0), [])' },
      ],
    },
    quiz: [
      {
        q: 'What is <code>0 || "default"</code>?',
        options: ['0', '"default"', 'true'],
        answer: 1,
        explain: '<code>||</code> returns the right side when the left is falsy, and <code>0</code> is falsy.',
      },
      {
        q: 'What is <code>0 ?? "default"</code>?',
        options: ['0', '"default"', 'null'],
        answer: 0,
        explain: '<code>??</code> only falls back when the left side is <code>null</code> or <code>undefined</code>.',
      },
      {
        q: 'What does this log?',
        code: `for (const x in ["a", "b"]) console.log(x);`,
        options: ['"a" then "b"', '"0" then "1"', 'Nothing'],
        answer: 1,
        explain: '<code>for…in</code> iterates <em>keys</em>, which for arrays are the index strings. Use <code>for…of</code> for values.',
      },
    ],
  },

  {
    id: 'functions',
    module: 'fundamentals',
    title: 'Functions',
    summary: 'Declarations, arrow functions, defaults, rest params, higher-order functions.',
    content: `
      <p>Functions are reusable blocks of code, and in JavaScript they're also <strong>values</strong>. You can store them in variables, pass them to other functions and return them from functions.</p>
      {{run:0}}
      <h3>Declarations are hoisted</h3>
      <p>A <code>function name() {}</code> declaration can be called <em>before</em> the line it's written on. Function expressions assigned to <code>const</code> can't. Their name is in the temporal dead zone until that line runs.</p>
      <h3>Higher-order functions</h3>
      <p>A function that takes or returns another function is called <em>higher-order</em>. This is the foundation of <code>map</code>, <code>filter</code>, event handlers, and much more.</p>
      {{run:1}}
      <div class="callout"><p><strong>Arrow gotcha:</strong> to return an object literal from an arrow function, wrap it in parentheses: <code>() =&gt; ({ ok: true })</code>. Without them, the braces are treated as a function body.</p></div>
    `,
    examples: [
`function add(a, b) { return a + b; }              // declaration
const multiply = function (a, b) { return a * b; }; // expression
const square = x => x * x;                         // arrow, implicit return
const greet = (name = "friend") => "Hi, " + name;  // default parameter
const sum = (...nums) => nums.reduce((t, n) => t + n, 0); // rest parameter

console.log(add(2, 3), multiply(2, 3), square(4));
console.log(greet(), greet("Ada"));
console.log(sum(1, 2, 3, 4));
console.log(hoisted()); // works: declarations are hoisted

function hoisted() { return "I was called before my definition"; }`,
`// Takes a function
function repeat(times, action) {
  for (let i = 0; i < times; i++) action(i);
}
repeat(3, i => console.log("Call #" + i));

// Returns a function
const makeMultiplier = factor => n => n * factor;
const double = makeMultiplier(2);
const triple = makeMultiplier(3);
console.log(double(21), triple(5));`,
    ],
    exercise: {
      prompt: `<p>Write <code>pipe(...fns)</code>. It takes any number of functions and returns a <strong>new function</strong> that passes its input through each one, left to right.</p>
               <p><code>pipe(x =&gt; x + 1, x =&gt; x * 2)(3)</code> should be <code>8</code>: first 3+1=4, then 4*2=8.</p>`,
      starter: `function pipe(...fns) {\n  // Your code here\n}\n\nconst addThenDouble = pipe(x => x + 1, x => x * 2);\nconsole.log(addThenDouble(3)); // 8`,
      hint: `Return <code>x =&gt; …</code>. Inside, loop over <code>fns</code> and keep replacing the value, or use <code>fns.reduce((value, fn) =&gt; fn(value), x)</code>.`,
      solution: `function pipe(...fns) {\n  return x => fns.reduce((value, fn) => fn(value), x);\n}`,
      tests: [
        { name: 'returns a function', check: 'typeof pipe(x => x) === "function"' },
        { name: 'pipe(+1, *2)(3) → 8', check: 'pipe(x => x + 1, x => x * 2)(3) === 8' },
        { name: 'order matters: pipe(*2, +1)(3) → 7', check: 'pipe(x => x * 2, x => x + 1)(3) === 7' },
        { name: 'pipe()(5) → 5 (no functions = identity)', check: 'pipe()(5) === 5' },
        { name: 'works with strings', check: 'pipe(s => s.trim(), s => s.toUpperCase())("  hi ") === "HI"' },
      ],
    },
    quiz: [
      {
        q: 'What does <code>(() =&gt; { a: 1 })()</code> return?',
        options: ['{ a: 1 }', 'undefined', '1'],
        answer: 1,
        explain: 'The braces are read as a function body containing a label <code>a:</code>, and nothing is returned. Use <code>() =&gt; ({ a: 1 })</code>.',
      },
      {
        q: 'What happens here?',
        code: `console.log(double(2));\nconst double = n => n * 2;`,
        options: ['Logs 4', 'Logs undefined', 'Throws a ReferenceError'],
        answer: 2,
        explain: 'Only function <em>declarations</em> are hoisted with their body. A <code>const</code> is in the temporal dead zone until its line runs.',
      },
      {
        q: 'What does this return?',
        code: `function f(a, b = 2) { return a + b; }\nf(1, undefined);`,
        options: ['NaN', '3', '1'],
        answer: 1,
        explain: 'Passing <code>undefined</code> triggers the default. (Passing <code>null</code> would not: <code>1 + null</code> is <code>1</code>.)',
      },
    ],
  },

  // ───────────────────────────── DATA ─────────────────────────────
  {
    id: 'arrays',
    module: 'data',
    title: 'Arrays & Their Methods',
    summary: 'map, filter, reduce, find, sort, and which methods mutate.',
    content: `
      <p>Array methods let you describe <em>what</em> you want instead of writing loops by hand. The big three:</p>
      <ul>
        <li><code>map(fn)</code>: transform every item and return a new array of the same length</li>
        <li><code>filter(fn)</code>: keep only the items where <code>fn</code> returns truthy</li>
        <li><code>reduce(fn, start)</code>: combine all items into one value (a sum, an object, anything)</li>
      </ul>
      {{run:0}}
      <h3>Mutating vs non-mutating</h3>
      <p>Some methods change the original array: <code>push</code>, <code>pop</code>, <code>shift</code>, <code>unshift</code>, <code>splice</code>, <code>sort</code>, <code>reverse</code>. Others return a new one: <code>map</code>, <code>filter</code>, <code>slice</code>, <code>concat</code>, <code>toSorted</code>, <code>toReversed</code>. Mixing these up causes a lot of bugs.</p>
      {{run:1}}
    `,
    examples: [
`const nums = [5, 1, 10, 3];

console.log(nums.map(n => n * 2));
console.log(nums.filter(n => n > 2));
console.log(nums.reduce((total, n) => total + n, 0));

console.log(nums.find(n => n > 4));      // first match
console.log(nums.findIndex(n => n > 4));
console.log(nums.some(n => n > 9), nums.every(n => n > 0));
console.log(nums.includes(10), nums.indexOf(3));

// Chaining
const result = nums.filter(n => n % 2 === 1).map(n => n * 10);
console.log(result);`,
`const nums = [5, 1, 10, 3];

console.log([...nums].sort());               // [1, 10, 3, 5]: sorts as STRINGS!
console.log([...nums].sort((a, b) => a - b)); // numeric ascending
console.log(nums.toSorted((a, b) => b - a));  // non-mutating version (ES2023)
console.log("original:", nums);

const copy = nums.slice(1, 3);  // non-mutating
nums.splice(1, 2);              // mutating: removes 2 items at index 1
console.log(copy, nums);`,
    ],
    exercise: {
      prompt: `<p>Write <code>totalByCustomer(orders)</code>. It takes an array of <code>{ customer, amount }</code> objects and returns an object mapping each customer to their total spend.</p>`,
      starter: `function totalByCustomer(orders) {\n  // Your code here (try reduce!)\n}\n\nconst orders = [\n  { customer: "ada", amount: 10 },\n  { customer: "bob", amount: 5 },\n  { customer: "ada", amount: 7 },\n];\nconsole.log(totalByCustomer(orders)); // { ada: 17, bob: 5 }`,
      hint: `<code>orders.reduce((totals, order) =&gt; { … return totals; }, {})</code>. Inside, use <code>(totals[order.customer] ?? 0) + order.amount</code>.`,
      solution: `function totalByCustomer(orders) {\n  return orders.reduce((totals, { customer, amount }) => {\n    totals[customer] = (totals[customer] ?? 0) + amount;\n    return totals;\n  }, {});\n}`,
      tests: [
        { name: 'sums per customer', check: '__eq(totalByCustomer([{customer:"ada",amount:10},{customer:"bob",amount:5},{customer:"ada",amount:7}]), {ada:17, bob:5})' },
        { name: 'empty list → {}', check: '__eq(totalByCustomer([]), {})' },
        { name: 'single order', check: '__eq(totalByCustomer([{customer:"cy",amount:3}]), {cy:3})' },
      ],
    },
    quiz: [
      {
        q: 'Which of these <strong>mutates</strong> the original array?',
        options: ['map', 'filter', 'push', 'slice'],
        answer: 2,
        explain: '<code>push</code> adds to the existing array. The others return new arrays.',
      },
      {
        q: 'What does this return?',
        code: `[1, 2, 3].map(n => { n * 2 });`,
        options: ['[2, 4, 6]', '[undefined, undefined, undefined]', '[1, 2, 3]'],
        answer: 1,
        explain: 'With braces, an arrow function needs an explicit <code>return</code>. Either drop the braces or write <code>return n * 2</code>.',
      },
      {
        q: 'What does <code>[3, 20, 100].sort()</code> return?',
        options: ['[3, 20, 100]', '[100, 20, 3]', '[100, 3, 20]'],
        answer: 1,
        explain: 'The default sort compares strings: "100" &lt; "20" &lt; "3". Always pass <code>(a, b) =&gt; a - b</code> for numbers.',
      },
    ],
  },

  {
    id: 'objects',
    module: 'data',
    title: 'Objects & References',
    summary: 'Object literals, methods, iteration, and copy vs reference.',
    content: `
      <p>Objects group related data and behaviour under named keys. Modern syntax has some handy shortcuts:</p>
      {{run:0}}
      <h3>Objects are passed by reference</h3>
      <p>This is one of the most important ideas in JavaScript. A variable holding an object stores a <em>reference</em> to it, not a copy. Assigning it to another variable gives you two names for the <strong>same</strong> object.</p>
      {{run:1}}
      <div class="callout"><p><strong>Remember:</strong> <code>{ ...obj }</code> is a <em>shallow</em> copy. Nested objects are still shared. Use <code>structuredClone(obj)</code> for a deep copy.</p></div>
    `,
    examples: [
`const key = "favoriteColor";
const name = "Ada";

const person = {
  name,                    // shorthand for name: name
  [key]: "green",          // computed key
  "home town": "London",   // keys with spaces need quotes
  greet() { return "Hi, I'm " + this.name; },
};

console.log(person.greet());
console.log(person["home town"], person[key]);
console.log(Object.keys(person));
console.log(Object.entries({ a: 1, b: 2 }));
console.log("name" in person, person.hasOwnProperty("age"));`,
`const a = { count: 1 };
const b = a;           // same object, two names
b.count = 99;
console.log(a.count);  // 99!

const c = { ...a };    // shallow copy
c.count = 1;
console.log(a.count, c.count);

const deep = { inner: { x: 1 } };
const shallow = { ...deep };
shallow.inner.x = 2;          // inner object is shared
console.log(deep.inner.x);    // 2!

const clone = structuredClone(deep); // real deep copy
clone.inner.x = 3;
console.log(deep.inner.x, clone.inner.x);

console.log({ x: 1 } === { x: 1 }); // false: compares identity, not contents`,
    ],
    exercise: {
      prompt: `<p>Write <code>invert(obj)</code>. It returns a <strong>new</strong> object with keys and values swapped, and must not modify the original.</p>
               <p><code>invert({ a: "x", b: "y" })</code> → <code>{ x: "a", y: "b" }</code></p>`,
      starter: `function invert(obj) {\n  // Your code here\n}\n\nconsole.log(invert({ a: "x", b: "y" }));`,
      hint: `<code>Object.entries(obj)</code> gives you <code>[key, value]</code> pairs. Swap each pair, then rebuild with <code>Object.fromEntries</code>.`,
      solution: `function invert(obj) {\n  return Object.fromEntries(\n    Object.entries(obj).map(([key, value]) => [value, key])\n  );\n}`,
      tests: [
        { name: 'swaps keys and values', check: '__eq(invert({ a: "x", b: "y" }), { x: "a", y: "b" })' },
        { name: 'empty object → {}', check: '__eq(invert({}), {})' },
        { name: 'does not mutate the input', check: '(() => { const o = { a: "x" }; invert(o); return __eq(o, { a: "x" }); })()' },
        { name: 'returns a new object', check: '(() => { const o = {}; return invert(o) !== o; })()' },
      ],
    },
    quiz: [
      {
        q: 'What does <code>{ x: 1 } === { x: 1 }</code> evaluate to?',
        options: ['true', 'false'],
        answer: 1,
        explain: 'Objects are compared by identity (are these the same object in memory?), not by their contents.',
      },
      {
        q: 'What is logged?',
        code: `const a = { tags: ["js"] };\nconst b = { ...a };\nb.tags.push("css");\nconsole.log(a.tags);`,
        options: ['["js"]', '["js", "css"]', 'TypeError'],
        answer: 1,
        explain: 'Spread makes a shallow copy. <code>a.tags</code> and <code>b.tags</code> are the same array.',
      },
      {
        q: 'How do you read a key that contains a space, like <code>"first name"</code>?',
        options: ['obj.first name', 'obj["first name"]', 'obj.first_name'],
        answer: 1,
        explain: 'Bracket notation works with any string, including ones held in variables: <code>obj[key]</code>.',
      },
    ],
  },

  {
    id: 'destructuring',
    module: 'data',
    title: 'Destructuring & Spread',
    summary: 'Unpacking values, defaults, rest, and immutable updates.',
    content: `
      <p><strong>Destructuring</strong> pulls values out of objects and arrays into variables in one line. <strong>Spread</strong> (<code>...</code>) does the reverse and expands them into a new object, array or argument list.</p>
      {{run:0}}
      <h3>Spread for copying & merging</h3>
      <p>Spread is the everyday way to update data <em>without mutating it</em>, a pattern used heavily in React and other modern frameworks. When keys collide, the one that comes later wins.</p>
      {{run:1}}
    `,
    examples: [
`const user = { id: 7, name: "Ada", address: { city: "London" } };

const { name, address: { city }, role = "guest" } = user;
console.log(name, city, role);

const { id: userId } = user;   // rename while destructuring
console.log(userId);

const [first, , third, ...rest] = [10, 20, 30, 40, 50];
console.log(first, third, rest);

let x = 1, y = 2;
[x, y] = [y, x];     // swap without a temp variable
console.log(x, y);`,
`const defaults = { theme: "light", fontSize: 14 };
const prefs = { fontSize: 18 };
console.log({ ...defaults, ...prefs }); // later keys win

const nums = [3, 9, 2];
console.log(Math.max(...nums));   // spread into arguments
console.log([0, ...nums, 10]);    // spread into a new array
console.log([..."hey"]);          // strings are iterable

// Destructuring right in the parameter list
function describe({ name, age = "unknown" }) {
  return name + " (" + age + ")";
}
console.log(describe({ name: "Grace" }));`,
    ],
    exercise: {
      prompt: `<p>Write <code>updateUser(user, changes)</code>. It returns a <strong>new</strong> user with <code>changes</code> applied, without mutating the original.</p>
               <p>Nested <code>settings</code> should be <em>merged</em>, not replaced. Updating <code>{ settings: { dark: true } }</code> must keep the user's other settings.</p>`,
      starter: `function updateUser(user, changes) {\n  // Your code here\n}\n\nconst ada = { name: "Ada", settings: { dark: false, lang: "en" } };\nconsole.log(updateUser(ada, { settings: { dark: true } }));\nconsole.log(ada); // should be unchanged`,
      hint: `Spread <code>user</code>, then <code>changes</code>, then override <code>settings</code> with a merge of <code>user.settings</code> and <code>changes.settings</code>. Spreading <code>undefined</code> is safe.`,
      solution: `function updateUser(user, changes) {\n  return {\n    ...user,\n    ...changes,\n    settings: { ...user.settings, ...changes.settings },\n  };\n}`,
      tests: [
        { name: 'applies top-level changes', check: 'updateUser({ name: "a", settings: {} }, { name: "b" }).name === "b"' },
        { name: 'merges nested settings', check: '__eq(updateUser({ name: "a", settings: { dark: false, lang: "en" } }, { settings: { dark: true } }).settings, { dark: true, lang: "en" })' },
        { name: 'keeps settings when none are changed', check: '__eq(updateUser({ name: "a", settings: { lang: "en" } }, { name: "b" }).settings, { lang: "en" })' },
        { name: 'does not mutate the original (or its settings)', check: '(() => { const u = { name: "a", settings: { dark: false } }; updateUser(u, { name: "b", settings: { dark: true } }); return u.name === "a" && u.settings.dark === false; })()' },
      ],
    },
    quiz: [
      {
        q: 'After <code>const { a: b } = { a: 1 };</code>, which variable exists?',
        options: ['a (equal to 1)', 'b (equal to 1)', 'both a and b'],
        answer: 1,
        explain: '<code>a: b</code> means "take property <code>a</code> and store it in a variable named <code>b</code>."',
      },
      {
        q: 'What is <code>{ ...{ a: 1, b: 2 }, a: 3 }</code>?',
        options: ['{ a: 1, b: 2 }', '{ a: 3, b: 2 }', '{ a: 3 }'],
        answer: 1,
        explain: 'Later keys overwrite earlier ones, and <code>b</code> is carried over from the spread.',
      },
      {
        q: 'What is <code>[..."hi"]</code>?',
        options: ['["hi"]', '["h", "i"]', 'TypeError'],
        answer: 1,
        explain: 'Strings are iterable, so spread splits them into characters.',
      },
    ],
  },

  // ───────────────────────────── DEEPER ─────────────────────────────
  {
    id: 'closures',
    module: 'deeper',
    title: 'Scope & Closures',
    summary: 'How functions remember the variables around them.',
    content: `
      <p>A <strong>closure</strong> is a function together with the variables that were in scope where it was <em>created</em>. The function keeps access to those variables even after the outer function has returned.</p>
      <p>That's how you get private state in JavaScript:</p>
      {{run:0}}
      <h3>The classic loop bug</h3>
      <p>With <code>var</code>, every callback closes over the <em>same</em> variable, and it has already reached its final value by the time the callbacks run. <code>let</code> creates a fresh binding for each loop iteration.</p>
      {{run:1}}
      <div class="callout"><p><strong>Where you'll see closures:</strong> event handlers, <code>setTimeout</code> callbacks, React hooks, function factories, memoization, and module patterns. They're everywhere.</p></div>
    `,
    examples: [
`function makeCounter() {
  let count = 0;             // private: nothing outside can touch it
  return {
    increment: () => ++count,
    get: () => count,
  };
}

const c1 = makeCounter();
const c2 = makeCounter();
c1.increment();
c1.increment();
c2.increment();
console.log(c1.get(), c2.get()); // each call made its own "count"
console.log(c1.count);           // undefined: truly private`,
`for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var:", i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let:", j), 0);
}`,
    ],
    exercise: {
      prompt: `<p>Write <code>memoize(fn)</code>. It returns a version of <code>fn</code> (which takes one argument) that caches results: calling it again with the same argument returns the cached value <em>without</em> calling <code>fn</code> again.</p>`,
      starter: `function memoize(fn) {\n  // Your code here\n}\n\nconst slowSquare = n => { console.log("computing", n); return n * n; };\nconst fastSquare = memoize(slowSquare);\nconsole.log(fastSquare(4)); // computing 4, 16\nconsole.log(fastSquare(4)); // 16 (no "computing")`,
      hint: `Create a <code>new Map()</code> <em>outside</em> the returned function so it's shared across calls (that's the closure). Use <code>cache.has(arg)</code> / <code>cache.get(arg)</code> / <code>cache.set(arg, result)</code>.`,
      solution: `function memoize(fn) {\n  const cache = new Map();\n  return arg => {\n    if (!cache.has(arg)) cache.set(arg, fn(arg));\n    return cache.get(arg);\n  };\n}`,
      tests: [
        { name: 'returns correct results', check: 'memoize(n => n * n)(5) === 25' },
        { name: 'caches repeat calls', check: '(() => { let calls = 0; const sq = memoize(n => { calls++; return n * n; }); sq(4); sq(4); sq(4); return calls === 1; })()' },
        { name: 'different args are computed separately', check: '(() => { let calls = 0; const sq = memoize(n => { calls++; return n * n; }); return sq(2) === 4 && sq(3) === 9 && calls === 2; })()' },
        { name: 'separate memoized functions have separate caches', check: '(() => { const a = memoize(n => n + 1); const b = memoize(n => n + 100); return a(1) === 2 && b(1) === 101; })()' },
      ],
    },
    quiz: [
      {
        q: 'What is a closure?',
        options: [
          'A function that has finished running',
          'A function plus the variables it captured from where it was defined',
          'A way to close a browser window',
        ],
        answer: 1,
        explain: 'Functions remember their surrounding scope. That remembered scope is what makes a closure.',
      },
      {
        q: 'What does this log?',
        code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}`,
        options: ['0 1 2', '3 3 3', 'undefined ×3'],
        answer: 1,
        explain: 'There\'s one shared <code>var i</code>. By the time the timeouts run the loop has finished and <code>i</code> is 3. Use <code>let</code> to fix it.',
      },
      {
        q: 'What does this log?',
        code: `function outer() {\n  let secret = "🍪";\n  return () => secret;\n}\nconst peek = outer();\nconsole.log(peek());`,
        options: ['undefined', '"🍪"', 'ReferenceError'],
        answer: 1,
        explain: '<code>outer</code> has returned, but the arrow function still closes over <code>secret</code>.',
      },
    ],
  },

  {
    id: 'this-classes',
    module: 'deeper',
    title: 'this & Classes',
    summary: 'How this is decided, bind/call, and ES classes with private fields.',
    content: `
      <p><code>this</code> is decided by <strong>how a function is called</strong>, not where it's written:</p>
      <ul>
        <li><code>obj.method()</code>: <code>this</code> is <code>obj</code> (the thing left of the dot)</li>
        <li><code>fn()</code> on its own: <code>this</code> is <code>undefined</code> in strict mode</li>
        <li><code>fn.call(x)</code> / <code>fn.bind(x)</code>: <code>this</code> is <code>x</code></li>
        <li><code>new Fn()</code>: <code>this</code> is the brand-new object</li>
        <li><strong>Arrow functions</strong> have no <code>this</code> of their own. They use the <code>this</code> of the surrounding code.</li>
      </ul>
      {{run:0}}
      <h3>Classes</h3>
      <p>Classes are a clean syntax for creating objects that share methods. They support inheritance (<code>extends</code>/<code>super</code>), static methods, getters, and truly private <code>#fields</code>.</p>
      {{run:1}}
    `,
    examples: [
`"use strict";
const dog = {
  name: "Rex",
  bark() { return this.name + " says woof"; },
};
console.log(dog.bark());              // this = dog

const bark = dog.bark;                // detached from dog...
try { bark(); } catch (e) { console.log("Lost this →", e.message); }

console.log(bark.call({ name: "Fido" }));  // choose this explicitly
const bound = dog.bark.bind(dog);          // permanently attach it
console.log(bound());

const timer = {
  seconds: 0,
  start() {
    // Arrow function inherits this from start(), so this.seconds works
    [1, 2, 3].forEach(() => this.seconds++);
    return this.seconds;
  },
};
console.log(timer.start());`,
`class Animal {
  #sound;                              // private field
  constructor(name, sound) {
    this.name = name;
    this.#sound = sound;
  }
  speak() { return this.name + " says " + this.#sound; }
  get description() { return "An animal named " + this.name; }
  static create(name) { return new Animal(name, "..."); }
}

class Dog extends Animal {
  constructor(name) {
    super(name, "woof");               // must call super before using this
  }
  fetch() { return this.name + " fetches!"; }
}

const d = new Dog("Rex");
console.log(d.speak(), d.fetch());
console.log(d.description);
console.log(d instanceof Animal, Animal.create("Blob").speak());
console.log(Object.keys(d));           // #sound isn't visible`,
    ],
    exercise: {
      prompt: `<p>Create a class <code>BankAccount</code>:</p>
               <ul>
                 <li><code>new BankAccount(owner, balance = 0)</code></li>
                 <li><code>deposit(amount)</code>: adds money and returns the new balance</li>
                 <li><code>withdraw(amount)</code>: throws an <code>Error</code> if there isn't enough money, otherwise subtracts and returns the new balance</li>
                 <li>a <code>balance</code> <strong>getter</strong>, backed by a private <code>#balance</code> field so nobody can set it directly</li>
               </ul>`,
      starter: `class BankAccount {\n  // Your code here\n}\n\nconst acct = new BankAccount("Ada", 100);\nacct.deposit(50);\nconsole.log(acct.balance); // 150`,
      hint: `Declare <code>#balance;</code> at the top of the class, set it in the constructor, and add <code>get balance() { return this.#balance; }</code>. In <code>withdraw</code>, <code>throw new Error("Insufficient funds")</code> when <code>amount &gt; this.#balance</code>.`,
      solution: `class BankAccount {\n  #balance;\n  constructor(owner, balance = 0) {\n    this.owner = owner;\n    this.#balance = balance;\n  }\n  get balance() { return this.#balance; }\n  deposit(amount) {\n    this.#balance += amount;\n    return this.#balance;\n  }\n  withdraw(amount) {\n    if (amount > this.#balance) throw new Error("Insufficient funds");\n    this.#balance -= amount;\n    return this.#balance;\n  }\n}`,
      tests: [
        { name: 'balance defaults to 0', check: 'new BankAccount("a").balance === 0' },
        { name: 'deposit returns the new balance', check: 'new BankAccount("a", 10).deposit(5) === 15' },
        { name: 'withdraw subtracts', check: '(() => { const a = new BankAccount("a", 50); a.withdraw(20); return a.balance === 30; })()' },
        { name: 'withdraw throws when funds are short', check: '(() => { try { new BankAccount("a", 5).withdraw(10); return false; } catch (e) { return e instanceof Error; } })()' },
        { name: 'balance cannot be set directly', check: '(() => { const a = new BankAccount("a", 10); try { a.balance = 999; } catch (e) {} return a.balance === 10; })()' },
      ],
    },
    quiz: [
      {
        q: 'Inside an arrow function, what is <code>this</code>?',
        options: ['The object the arrow is stored on', 'Whatever this is in the surrounding code', 'Always undefined'],
        answer: 1,
        explain: 'Arrows don\'t create their own <code>this</code>, which makes them perfect for callbacks inside methods.',
      },
      {
        q: 'In strict mode, what happens?',
        code: `const obj = { n: 1, get() { return this.n; } };\nconst g = obj.get;\ng();`,
        options: ['Returns 1', 'Returns undefined', 'Throws a TypeError'],
        answer: 2,
        explain: 'Called on its own, <code>this</code> is <code>undefined</code>, and reading <code>.n</code> of undefined throws.',
      },
      {
        q: 'In a subclass constructor, when must you call <code>super()</code>?',
        options: ['Before using this', 'At the end', 'It\'s optional'],
        answer: 0,
        explain: 'The parent constructor creates <code>this</code>, so it has to run first or you\'ll get a ReferenceError.',
      },
    ],
  },

  {
    id: 'errors',
    module: 'deeper',
    title: 'Error Handling',
    summary: 'try/catch/finally, throwing, built-in and custom errors.',
    content: `
      <p>Errors are how code says "I can't continue." <code>throw</code> raises one and <code>try…catch</code> handles it. Code in <code>finally</code> runs no matter what, which makes it ideal for cleanup.</p>
      {{run:0}}
      <h3>Built-in error types</h3>
      <ul>
        <li><code>ReferenceError</code>: using a variable that doesn't exist</li>
        <li><code>TypeError</code>: using a value the wrong way, like calling a non-function or reading a property of <code>undefined</code></li>
        <li><code>SyntaxError</code>: code (or JSON!) that can't be parsed</li>
        <li><code>RangeError</code>: a value outside the allowed range</li>
      </ul>
      <h3>Custom errors</h3>
      <p>Extend <code>Error</code> to create your own types. You can then use <code>instanceof</code> to handle specific errors and re-throw the ones you don't understand.</p>
      {{run:1}}
      <div class="callout"><p><strong>Good habits:</strong> always throw <code>Error</code> objects (not strings) so you get a stack trace. Never write an empty <code>catch {}</code> that silently swallows problems.</p></div>
    `,
    examples: [
`function parseAge(input) {
  const age = Number(input);
  if (Number.isNaN(age)) throw new TypeError("Age must be a number, got: " + input);
  if (age < 0) throw new RangeError("Age can't be negative");
  return age;
}

for (const value of ["42", "abc", "-5"]) {
  try {
    console.log("OK:", parseAge(value));
  } catch (err) {
    console.log(err.name + " → " + err.message);
  } finally {
    console.log("  (finished checking " + value + ")");
  }
}`,
`class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

try {
  throw new ValidationError("email", "Email is required");
} catch (err) {
  if (err instanceof ValidationError) {
    console.log("Fix the", err.field, "field:", err.message);
  } else {
    throw err; // don't swallow errors you don't understand
  }
}

try {
  JSON.parse("{bad json}");
} catch (err) {
  console.log(err.name, "-", err.message);
}`,
    ],
    exercise: {
      prompt: `<p>Write <code>safeJsonParse(text)</code>. It never throws. Instead it returns:</p>
               <ul><li><code>{ ok: true, value }</code> when parsing succeeds</li>
               <li><code>{ ok: false, error }</code> when it fails, where <code>error</code> is the error <strong>message string</strong></li></ul>`,
      starter: `function safeJsonParse(text) {\n  // Your code here\n}\n\nconsole.log(safeJsonParse('{"a": 1}'));\nconsole.log(safeJsonParse("nope"));`,
      hint: `Put <code>JSON.parse(text)</code> inside a <code>try</code> and return the success object from there. In <code>catch (err)</code>, return <code>{ ok: false, error: err.message }</code>.`,
      solution: `function safeJsonParse(text) {\n  try {\n    return { ok: true, value: JSON.parse(text) };\n  } catch (err) {\n    return { ok: false, error: err.message };\n  }\n}`,
      tests: [
        { name: 'parses valid JSON', check: '__eq(safeJsonParse(\'{"a":1}\'), { ok: true, value: { a: 1 } })' },
        { name: 'returns ok: false for invalid JSON', check: 'safeJsonParse("nope").ok === false' },
        { name: 'error is a message string', check: 'typeof safeJsonParse("{").error === "string" && safeJsonParse("{").error.length > 0' },
        { name: 'handles valid primitives like "42"', check: '__eq(safeJsonParse("42"), { ok: true, value: 42 })' },
      ],
    },
    quiz: [
      {
        q: 'What does this return?',
        code: `function f() {\n  try { return "try"; }\n  finally { console.log("finally"); }\n}\nf();`,
        options: ['Returns "try" without logging', 'Logs "finally", then returns "try"', 'Throws'],
        answer: 1,
        explain: '<code>finally</code> runs even when the <code>try</code> block returns.',
      },
      {
        q: 'Which error do you get from <code>undefined.name</code>?',
        options: ['ReferenceError', 'TypeError', 'SyntaxError'],
        answer: 1,
        explain: 'You\'re using a value (<code>undefined</code>) the wrong way, which is a TypeError. A ReferenceError is for names that don\'t exist.',
      },
      {
        q: 'Why is <code>throw new Error("x")</code> better than <code>throw "x"</code>?',
        options: ['It\'s faster', 'Error objects carry a stack trace and a name', 'Strings can\'t be caught'],
        answer: 1,
        explain: 'The stack trace tells you where the problem happened, which is invaluable for debugging.',
      },
    ],
  },

  // ───────────────────────────── ASYNC ─────────────────────────────
  {
    id: 'promises',
    module: 'async',
    title: 'Promises & async/await',
    summary: 'Handling values that arrive later, and running things in parallel.',
    content: `
      <p>A <strong>Promise</strong> represents a value that will arrive later, like a network response or a timer. It's <em>pending</em> until it's either <em>fulfilled</em> with a value or <em>rejected</em> with an error.</p>
      <p><code>async</code>/<code>await</code> is syntax on top of promises that lets async code read top-to-bottom like normal code:</p>
      {{run:0}}
      <h3>Errors in async code</h3>
      <p>A rejected promise behaves like a thrown error when you <code>await</code> it, so regular <code>try…catch</code> works.</p>
      {{run:1}}
      <div class="callout"><p><strong>Sequential vs parallel:</strong> two <code>await</code>s in a row wait one after the other. If the tasks don't depend on each other, start them together with <code>Promise.all</code>. It's often much faster.</p></div>
    `,
    examples: [
`const wait = (ms, value) =>
  new Promise(resolve => setTimeout(() => resolve(value), ms));

// Promise chaining with .then
wait(300, "first")
  .then(v => { console.log("then:", v); return wait(300, "second"); })
  .then(v => console.log("then:", v));

// Same idea with async/await
async function main() {
  const a = await wait(200, "A");
  console.log("await:", a);

  const start = Date.now();
  const [b, c] = await Promise.all([wait(400, "B"), wait(400, "C")]);
  console.log("all:", b, c, "in ~" + (Date.now() - start) + "ms (not 800!)");
}
main();`,
`const fail = () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("Network down")), 200));

async function load() {
  try {
    await fail();
    console.log("never runs");
  } catch (err) {
    console.log("Caught:", err.message);
  } finally {
    console.log("cleanup runs either way");
  }
}
load();

Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("nope"))])
  .then(results => console.log("allSettled:", results.map(r => r.status)));

Promise.race([wait(100, "fast"), wait(500, "slow")])
  .then(v => console.log("race winner:", v));

function wait(ms, v) { return new Promise(r => setTimeout(() => r(v), ms)); }`,
    ],
    exercise: {
      prompt: `<p>Write an <code>async</code> function <code>withRetry(task, retries)</code>:</p>
               <ul>
                 <li>Call <code>task()</code> (which returns a promise) and return its result.</li>
                 <li>If it rejects, try again, up to <code>retries</code> <em>extra</em> times.</li>
                 <li>If every attempt fails, throw the <strong>last</strong> error.</li>
               </ul>
               <p>So <code>retries = 2</code> means at most 3 calls in total.</p>`,
      starter: `async function withRetry(task, retries) {\n  // Your code here\n}\n\nlet attempts = 0;\nconst flaky = async () => {\n  attempts++;\n  if (attempts < 3) throw new Error("fail #" + attempts);\n  return "success on attempt " + attempts;\n};\nwithRetry(flaky, 5).then(console.log);`,
      hint: `Loop <code>for (let i = 0; i &lt;= retries; i++)</code>. Inside, <code>try { return await task(); } catch (err) { lastError = err; }</code>. After the loop, <code>throw lastError</code>. (The <code>await</code> matters, because without it the catch won't see the rejection!)`,
      solution: `async function withRetry(task, retries) {\n  let lastError;\n  for (let i = 0; i <= retries; i++) {\n    try {\n      return await task();\n    } catch (err) {\n      lastError = err;\n    }\n  }\n  throw lastError;\n}`,
      tests: [
        { name: 'returns the result when the task succeeds', check: '(await withRetry(async () => 42, 3)) === 42' },
        { name: 'retries until it succeeds', check: 'await (async () => { let n = 0; const r = await withRetry(async () => { if (++n < 3) throw new Error("x"); return "ok"; }, 5); return r === "ok" && n === 3; })()' },
        { name: 'gives up after retries and throws the last error', check: 'await (async () => { let n = 0; try { await withRetry(async () => { n++; throw new Error("fail " + n); }, 2); return false; } catch (e) { return e.message === "fail 3" && n === 3; } })()' },
        { name: 'retries = 0 means exactly one attempt', check: 'await (async () => { let n = 0; try { await withRetry(async () => { n++; throw new Error("x"); }, 0); } catch (e) {} return n === 1; })()' },
      ],
    },
    quiz: [
      {
        q: 'What does an <code>async</code> function always return?',
        options: ['Whatever you return', 'A Promise', 'undefined'],
        answer: 1,
        explain: 'Even <code>async () =&gt; 5</code> returns a Promise that resolves to 5.',
      },
      {
        q: 'If one promise passed to <code>Promise.all</code> rejects, what happens?',
        options: ['It ignores the failure', 'The whole Promise.all rejects', 'It waits forever'],
        answer: 1,
        explain: 'It fails fast. Use <code>Promise.allSettled</code> if you want every result regardless of failures.',
      },
      {
        q: 'What order does this log in?',
        code: `console.log(1);\nPromise.resolve().then(() => console.log(2));\nconsole.log(3);`,
        options: ['1 2 3', '1 3 2', '2 1 3'],
        answer: 1,
        explain: '<code>.then</code> callbacks always run asynchronously, after the current synchronous code has finished.',
      },
    ],
  },

  {
    id: 'event-loop',
    module: 'async',
    title: 'The Event Loop',
    summary: 'Call stack, microtasks, macrotasks, and why order matters.',
    content: `
      <p>JavaScript runs on a <strong>single thread</strong>. It can only do one thing at a time. The <em>event loop</em> is how it juggles async work:</p>
      <ol>
        <li>Run all the synchronous code on the <strong>call stack</strong> until it's empty.</li>
        <li>Run <strong>every</strong> queued <strong>microtask</strong>: promise callbacks, code after <code>await</code>, <code>queueMicrotask</code>. Microtasks queued during this step also run now.</li>
        <li>Run <strong>one</strong> <strong>macrotask</strong> (a <code>setTimeout</code>/<code>setInterval</code> callback, an event, I/O), then go back to step 2.</li>
      </ol>
      {{run:0}}
      <h3>Blocking the thread</h3>
      <p>Because there's one thread, a long synchronous task blocks <em>everything</em>, including timers, clicks and rendering. <code>setTimeout(fn, 0)</code> means "run no sooner than 0ms", not "run now."</p>
      {{run:1}}
      <div class="callout"><p><strong>Watch it live:</strong> the free tool <em>Loupe</em> (latentflip.com/loupe) animates the call stack and queues step by step.</p></div>
    `,
    examples: [
`console.log("1: sync");

setTimeout(() => console.log("5: macrotask (setTimeout)"), 0);

Promise.resolve().then(() => console.log("3: microtask (promise)"));
queueMicrotask(() => console.log("4: microtask (queueMicrotask)"));

console.log("2: sync");`,
`const start = Date.now();

setTimeout(() => {
  console.log("timer fired after", Date.now() - start, "ms (we asked for 0!)");
}, 0);

while (Date.now() - start < 500) {} // block the thread for 500ms

console.log("busy loop finished");`,
    ],
    exercise: {
      prompt: `<p><strong>Predict the output.</strong> In what order will the letters below be logged? Put them in the <code>order</code> array, and try to work it out <em>before</em> running the snippet!</p>
<pre class="code-sample">console.log("A");
setTimeout(() =&gt; console.log("B"), 0);
Promise.resolve()
  .then(() =&gt; console.log("C"))
  .then(() =&gt; console.log("D"));
setTimeout(() =&gt; console.log("E"), 0);
(async () =&gt; {
  console.log("F");
  await null;
  console.log("G");
})();
console.log("H");</pre>`,
      starter: `// Fill in the letters in the order they are logged:\nconst order = [];\n`,
      hint: `Sync code first. The body of an async function runs synchronously up to the first <code>await</code>. Then the microtasks run in the order they were queued, and <code>D</code> is only queued once <code>C</code> has run. Timers run last.`,
      solution: `const order = ["A", "F", "H", "C", "G", "D", "B", "E"];`,
      tests: [
        { name: 'has all 8 letters', check: 'Array.isArray(order) && order.length === 8' },
        { name: 'sync logs come first (A, F, H)', check: '__eq(order.slice(0, 3), ["A", "F", "H"])' },
        { name: 'microtasks next (C, G, D)', check: '__eq(order.slice(3, 6), ["C", "G", "D"])' },
        { name: 'timers last (B, E)', check: '__eq(order.slice(6), ["B", "E"])' },
      ],
    },
    quiz: [
      {
        q: 'Which runs first: a resolved promise\'s <code>.then</code> callback or a <code>setTimeout(fn, 0)</code> callback?',
        options: ['setTimeout', 'The .then callback', 'Random'],
        answer: 1,
        explain: 'Microtasks (promise callbacks) always drain completely before the next macrotask (timer).',
      },
      {
        q: 'Does <code>async</code>/<code>await</code> run your code on another thread?',
        options: ['Yes', 'No'],
        answer: 1,
        explain: 'It all runs on the one main thread. <code>await</code> just pauses the function and lets other work run in the meantime.',
      },
      {
        q: 'A <code>while</code> loop runs for 2 seconds. What happens to a <code>setTimeout(fn, 100)</code> scheduled just before it?',
        options: ['Fires at 100ms, interrupting the loop', 'Fires after the loop finishes', 'Never fires'],
        answer: 1,
        explain: 'Nothing can interrupt synchronous code. The timer callback waits in the queue until the stack is empty.',
      },
    ],
  },
];
