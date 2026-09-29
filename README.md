# JS Mastery

An interactive site for learning JavaScript by writing it: short lessons, live editable examples, auto-tested exercises and quizzes.

**Live site:** https://ryan-rutan.github.io/JS-Mastery/

## Course

| Module | Lessons |
| --- | --- |
| Fundamentals | Variables · Types & Coercion · Control Flow · Functions |
| Working with Data | Arrays · Objects & References · Destructuring & Spread |
| Going Deeper | Scope & Closures · `this` & Classes · Error Handling |
| Async JavaScript | Promises & async/await · The Event Loop |

## Features

- **Live code runner.** Examples and exercises run in a Web Worker, so an infinite loop is stopped after 4 seconds instead of freezing the page.
- **Exercises with tests.** Press **Check** (or ⌘/Ctrl + Enter) to run the tests against your code.
- **Quizzes** with explanations.
- **Progress tracking** and saved exercise code, stored in your browser's `localStorage`.
- **Playground** for free-form experimenting.
- Light/dark theme and a mobile-friendly layout.

## Running locally

It's plain HTML, CSS and JavaScript, so there's no build step and nothing to install. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly also mostly works, but some browsers restrict Web Workers on `file://`.)

## Adding a lesson

All content lives in [`js/lessons.js`](js/lessons.js). Add an object to `LESSONS` with:

- `content`: HTML. `{{run:N}}` inserts a live editor loaded with `examples[N]`.
- `examples`: an array of code strings.
- `exercise`: `prompt`, `starter`, `hint`, `solution`, and `tests` (each `check` is a JS expression that must evaluate to `true`; `await` and the deep-equality helper `__eq(a, b)` are available).
- `quiz`: questions with `options`, the `answer` index, and an `explain`ation.

## Project structure

```
index.html      page shell
css/style.css   styles and light/dark theme
js/lessons.js   all course content
js/runner.js    sandboxed code runner (Web Worker)
js/app.js       routing, editors, exercises, quizzes, progress
```
