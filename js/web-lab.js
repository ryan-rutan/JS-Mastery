// Live Lab: an editor + a real, sandboxed web page that re-runs the learner's
// code as they type, with a console, a live DOM tree, and step checks that run
// in hidden copies of the page (so checks never disturb what the learner sees).
(function () {
  // Base look for every lab page (the "website" inside the preview).
  const BASE_CSS = `
    *{box-sizing:border-box}
    body{margin:0;padding:22px;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f6f5f1;color:#1f1f1d}
    .card{background:#fff;border:1px solid #e2e0da;border-radius:14px;padding:22px 24px;max-width:520px;margin:0 auto;box-shadow:0 4px 18px rgba(0,0,0,.05)}
    h1{margin:0 0 10px;font-size:28px;letter-spacing:-.01em}
    .lead{color:#6b6a66}
    .muted{color:#6b6a66;font-size:14px}
    button{font:inherit;font-weight:600;padding:8px 16px;border-radius:8px;border:1px solid #1f1f1d;background:#f7df1e;color:#1f1f1d;cursor:pointer}
    button:hover{filter:brightness(1.05)}
    button:active{transform:translateY(1px)}
    button.ghost{background:#fff;border-color:#d6d3cb}
    button.danger{background:#c0392b;border-color:#c0392b;color:#fff}
    input{font:inherit;padding:8px 12px;border:1px solid #d6d3cb;border-radius:8px;width:100%}
    input:focus{outline:2px solid #f7df1e;border-color:#1f1f1d}
    label{display:block;font-size:14px;font-weight:600;margin-bottom:4px}
    hr{border:0;border-top:1px solid #e2e0da;margin:18px 0}
    [data-jsm-toast]{position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#1f1f1d;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);z-index:99999;max-width:90%}
  `;

  // Stops runaway loops: every loop body calls __lp(); if a single task spends
  // more than 2.5s in loops, throw. The timer resets once the task ends.
  const LOOP_GUARD = `
    var __lpStart = 0;
    function __lp() {
      var now = Date.now();
      if (!__lpStart) { __lpStart = now; setTimeout(function () { __lpStart = 0; }, 0); }
      if (now - __lpStart > 2500) { __lpStart = 0; throw new Error("Stopped a loop that ran for over 2.5 seconds. Is it infinite?"); }
    }
  `;

  function previewBridge(run, offset) {
    return `(function () {
      var RUN = ${run}, OFFSET = ${offset};
      function send(type, data) { parent.postMessage({ __jsm: 1, run: RUN, type: type, data: data }, "*"); }
      function fmt(v, d) {
        d = d || 0;
        if (typeof v === "string") return d ? JSON.stringify(v) : v;
        if (v === undefined) return "undefined";
        if (v === null) return "null";
        if (typeof v === "function") return "ƒ " + (v.name || "anonymous") + "()";
        if (v instanceof Element) return "<" + v.tagName.toLowerCase() + (v.id ? "#" + v.id : "") + (v.className && typeof v.className === "string" ? "." + v.className.trim().split(/\\s+/).join(".") : "") + ">";
        if (v instanceof NodeList || v instanceof HTMLCollection) return v.constructor.name + "(" + v.length + ") [" + Array.prototype.map.call(v, function (x) { return fmt(x, d + 1); }).join(", ") + "]";
        if (v instanceof Event) return v.type + " event (" + v.constructor.name + ")";
        if (v instanceof Error) return v.name + ": " + v.message;
        if (typeof v !== "object") return String(v);
        if (d > 2) return Array.isArray(v) ? "[…]" : "{…}";
        try {
          if (Array.isArray(v)) return "[" + v.map(function (x) { return fmt(x, d + 1); }).join(", ") + "]";
          return "{ " + Object.keys(v).map(function (k) { return k + ": " + fmt(v[k], d + 1); }).join(", ") + " }";
        } catch (e) { return String(v); }
      }
      ["log", "info", "warn", "error"].forEach(function (level) {
        console[level] = function () {
          send("log", { level: level, text: Array.prototype.map.call(arguments, function (a) { return fmt(a); }).join(" ") });
        };
      });
      window.addEventListener("error", function (e) {
        var line = e.lineno - OFFSET;
        send("log", { level: "error", text: (e.message || "Error") + (line > 0 ? "  (line " + line + ")" : "") });
      });
      window.addEventListener("unhandledrejection", function (e) {
        send("log", { level: "error", text: "Uncaught (in promise) " + fmt(e.reason) });
      });
      function toast(msg) {
        var t = document.createElement("div");
        t.setAttribute("data-jsm-toast", "");
        t.textContent = String(msg);
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2200);
      }
      window.alert = function (m) { toast(m); send("log", { level: "info", text: "alert: " + m }); };
      window.confirm = function (m) { send("log", { level: "info", text: "confirm: " + m + " → true" }); return true; };
      window.prompt = function (m, d) { send("log", { level: "info", text: "prompt: " + m + " → " + (d || "") }); return d || ""; };
      // Keep the preview alive if a form isn't prevented, and explain why.
      window.addEventListener("submit", function (e) {
        if (!e.defaultPrevented) {
          e.preventDefault();
          send("log", { level: "warn", text: "The form tried to reload the page! (In a real site everything would reset.) Call event.preventDefault() in your submit handler." });
        }
      });

      // Serialize the DOM for the live tree view.
      function ser(node, depth) {
        if (node.nodeType === 3) {
          var t = node.textContent.replace(/\\s+/g, " ").trim();
          return t ? { x: t.length > 60 ? t.slice(0, 57) + "…" : t } : null;
        }
        if (node.nodeType !== 1) return null;
        var tag = node.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || node.hasAttribute("data-jsm-toast")) return null;
        var o = { t: tag };
        if (node.id) o.id = node.id;
        if (typeof node.className === "string" && node.className.trim()) o.c = node.className.trim();
        if (depth < 14) {
          var kids = [];
          for (var i = 0; i < node.childNodes.length && kids.length < 60; i++) {
            var k = ser(node.childNodes[i], depth + 1);
            if (k) kids.push(k);
          }
          if (kids.length) o.k = kids;
        }
        return o;
      }
      var pending = false;
      function sendDom() {
        if (pending) return;
        pending = true;
        setTimeout(function () { pending = false; send("dom", ser(document.body, 0)); }, 120);
      }
      document.addEventListener("DOMContentLoaded", function () {
        sendDom();
        new MutationObserver(sendDom).observe(document.body, {
          subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "id"]
        });
      });
    })();` + LOOP_GUARD;
  }

  function checkBridge(code) {
    return `
      var __errors = [], __reloaded = false, __code = ${JSON.stringify(code).replace(/</g, '\\u003c')};
      ["log", "info", "warn", "error", "debug"].forEach(function (l) { console[l] = function () {}; });
      window.alert = window.confirm = window.prompt = function () {};
      window.addEventListener("error", function (e) { __errors.push(e.message); });
      window.addEventListener("submit", function (e) { if (!e.defaultPrevented) { e.preventDefault(); __reloaded = true; } });
      function $(s) { return document.querySelector(s); }
      function $$(s) { return document.querySelectorAll(s); }
      function __el(t) { var e = typeof t === "string" ? $(t) : t; if (!e) throw new Error("Couldn't find " + t + " on the page"); return e; }
      function click(t) { __el(t).click(); }
      function typeInto(t, text) {
        // No focus() here: focusing inside a hidden check frame would steal focus from the editor.
        var e = __el(t); e.value = text;
        e.dispatchEvent(new Event("input", { bubbles: true }));
        e.dispatchEvent(new Event("change", { bubbles: true }));
      }
      function press(key) {
        var target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true }));
      }
      function submit(t) {
        var f = __el(t);
        if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        if (__reloaded) throw new Error("The form reloaded the page. Did you call event.preventDefault()?");
      }
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    ` + LOOP_GUARD;
  }

  function checkRunner(run, idx, body) {
    return `(async function () {
      var ok = false, err = null;
      if (document.readyState === "loading") await new Promise(function (r) { document.addEventListener("DOMContentLoaded", r); });
      try { ok = await (async function () { ${body}\n })(); }
      catch (e) { err = (e && e.message) || String(e); }
      if (ok !== true && !err && __errors.length) err = __errors[0];
      parent.postMessage({ __jsm: 1, run: ${run}, type: "check", data: { idx: ${idx}, ok: ok === true, err: err } }, "*");
    })();`;
  }

  // Inserts a __lp() call at the start of every braced loop body.
  function protect(code) {
    return code
      .replace(/\b(for|while)\s*\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)\s*\{/g, m => m + '__lp();')
      .replace(/\bdo\s*\{/g, m => m + '__lp();');
  }
  const safeScript = s => s.replace(/<\/script/gi, '<\\/script');

  function buildDoc(lesson, code, mode, run, checkIdx) {
    const top = '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE_CSS + (lesson.css || '') +
      '</style></head><body>\n' + lesson.html + '\n<script>';
    const bridgeFor = offset => mode === 'preview' ? previewBridge(run, offset) : checkBridge(code);
    // Line offset so error line numbers match the learner's editor.
    const draft = top + bridgeFor(0) + '<\/script>\n<script>\n';
    const offset = draft.split('\n').length - 1;
    let doc = top + safeScript(bridgeFor(offset)) + '<\/script>\n<script>\n' + safeScript(protect(code)) + '\n<\/script>';
    if (mode === 'check') doc += '\n<script>' + safeScript(checkRunner(run, checkIdx, lesson.steps[checkIdx].check)) + '<\/script>';
    return doc + '\n</body></html>';
  }

  // One message listener for the whole app, routed to whichever lab is open.
  let active = null;
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.__jsm !== 1 || !active || d.run !== active.run) return;
    active.onMessage(d, e.source);
  });

  let runCounter = 0;

  function render(lesson, ctx) {
    const { el, createEditor, store, lessonProgress, saveProgress } = ctx;
    const p = lessonProgress(lesson.id);
    p.steps = p.steps || {};
    const codeKey = 'jsm-code:' + lesson.id;
    const steps = lesson.steps;
    const firstOpen = () => { const i = steps.findIndex((_, i) => !p.steps[i]); return i === -1 ? steps.length : i; };
    let selected = Math.min(firstOpen(), steps.length - 1);
    let lastResults = {};
    let live = store.get('jsm-live', true);

    const root = el('div', { class: 'web-lesson' });
    root.append(el('div', { class: 'prose intro', html: lesson.intro }));

    // ---------- Left column: steps + editor ----------
    const counter = el('span', { class: 'steps-count' });
    const stepsList = el('ol', { class: 'steps' });
    const completeBanner = el('div', { class: 'banner good', hidden: '' });

    const liveToggle = el('label', { class: 'live-toggle', title: 'Re-run automatically as you type' }, [
      el('input', { type: 'checkbox' }), el('span', { text: 'Live' }),
    ]);
    const liveBox = liveToggle.querySelector('input');
    liveBox.checked = live;
    liveBox.addEventListener('change', () => { live = liveBox.checked; store.set('jsm-live', live); if (live) runNow(); });

    const editorCard = el('div', { class: 'runner web-editor' });
    const edHead = el('div', { class: 'runner-head' }, [
      el('span', { class: 'label', text: 'script.js' }),
      liveToggle,
      el('button', { class: 'btn primary', text: '▶ Run', onclick: () => runNow() }),
      el('button', {
        class: 'btn', text: 'Reset code',
        onclick: () => { editor.setValue(lesson.starter); store.remove(codeKey); runNow(); },
      }),
    ]);
    editorCard.append(edHead);

    let debounce = null;
    const editor = createEditor(editorCard, store.get(codeKey, null) ?? lesson.starter, () => runNow(), value => {
      store.set(codeKey, value);
      if (live) { clearTimeout(debounce); debounce = setTimeout(runNow, 650); }
    });

    const left = el('div', { class: 'bench-left' }, [
      el('div', { class: 'steps-card' }, [
        el('div', { class: 'steps-head' }, [el('strong', { text: 'Your mission' }), counter]),
        stepsList,
      ]),
      completeBanner,
      editorCard,
    ]);

    // ---------- Right column: live page + devtools ----------
    const frame = el('iframe', { class: 'preview-frame', title: 'Live preview', sandbox: 'allow-scripts allow-forms' });
    const consoleBody = el('div', { class: 'console lab-console' });
    const domBody = el('div', { class: 'dom-tree' });
    const tabConsole = el('button', { class: 'tab active', text: 'Console' });
    const tabDom = el('button', { class: 'tab', text: 'DOM tree' });
    const errBadge = el('span', { class: 'badge', hidden: '' });
    tabConsole.append(errBadge);
    function showTab(which) {
      tabConsole.classList.toggle('active', which === 'console');
      tabDom.classList.toggle('active', which === 'dom');
      consoleBody.hidden = which !== 'console';
      domBody.hidden = which !== 'dom';
      store.set('jsm-devtab', which);
    }
    tabConsole.addEventListener('click', () => showTab('console'));
    tabDom.addEventListener('click', () => showTab('dom'));

    const right = el('div', { class: 'bench-right' }, [
      el('div', { class: 'browser' }, [
        el('div', { class: 'browser-bar' }, [
          el('span', { class: 'dots' }, [el('i'), el('i'), el('i')]),
          el('span', { class: 'url', text: 'my-page.html' }),
          el('button', { class: 'link-btn', text: '↻ Reload', title: 'Reload the page with your code', onclick: () => runNow() }),
        ]),
        frame,
      ]),
      el('div', { class: 'devtools' }, [
        el('div', { class: 'tabs' }, [tabConsole, tabDom]),
        consoleBody,
        domBody,
      ]),
    ]);
    showTab(store.get('jsm-devtab', 'console'));

    root.append(el('div', { class: 'bench' }, [left, right]));

    // ---------- Steps ----------
    function renderSteps(justDone) {
      const done = steps.filter((_, i) => p.steps[i]).length;
      counter.textContent = done + ' / ' + steps.length + ' done';
      const open = firstOpen();
      stepsList.innerHTML = '';
      steps.forEach((step, i) => {
        const state = p.steps[i] ? 'done' : i === open ? 'current' : 'locked';
        const li = el('li', { class: 'step ' + state + (i === selected ? ' open' : '') + (justDone && justDone.includes(i) ? ' pop' : '') });
        li.append(el('button', { class: 'step-head', onclick: () => { selected = selected === i ? -1 : i; renderSteps(); } }, [
          el('span', { class: 'step-num', text: p.steps[i] ? '✓' : String(i + 1) }),
          el('span', { class: 'step-title', text: step.title }),
          step.challenge ? el('span', { class: 'chip', text: 'Challenge' }) : null,
        ]));
        if (i === selected) {
          const body = el('div', { class: 'step-body' });
          body.append(el('div', { html: step.instruction }));
          const pre = el('pre', { class: 'code-sample type-this', text: step.code });
          if (step.challenge && !p.steps[i]) {
            body.append(el('details', { class: 'hint' }, [el('summary', { text: 'Stuck? Show me the code' }), pre]));
          } else {
            body.append(el('div', { class: 'type-label', text: '⌨️ Type this in the editor:' }), pre);
          }
          if (step.after && (p.steps[i] || !step.challenge)) body.append(el('p', { class: 'after', html: step.after }));
          if (state === 'current') {
            const r = lastResults[i];
            body.append(el('div', {
              class: 'step-status',
              text: r && r.err ? '⏳ Not yet: ' + r.err : '⏳ Waiting for your code… (the step ticks off automatically)',
            }));
          } else if (state === 'done') {
            body.append(el('div', { class: 'step-status ok', text: '✓ Step complete' }));
          } else {
            body.append(el('div', { class: 'step-status', text: '🔒 Finish the earlier steps first (you can still try it now).' }));
          }
          li.append(body);
        }
        stepsList.append(li);
      });
      const all = done === steps.length;
      completeBanner.hidden = !all;
      completeBanner.textContent = '🏆 Mission complete! Scroll down for a quick quiz, or keep experimenting. The page is all yours.';
    }

    // ---------- Running ----------
    const checkHost = document.getElementById('checkHost') || document.body.appendChild(el('div', { id: 'checkHost', 'aria-hidden': 'true' }));
    let checkFrames = [];
    let checkTimer = null;
    let errorCount = 0;
    let prevDomKeys = null;

    function runNow() {
      clearTimeout(debounce);
      const run = ++runCounter;
      const code = editor.getValue();
      state.run = run;

      // Visible page
      consoleBody.innerHTML = '';
      errorCount = 0;
      errBadge.hidden = true;
      frame.srcdoc = buildDoc(lesson, code, 'preview', run);

      // Hidden checks, one fresh page per remaining step.
      checkFrames.forEach(f => f.remove());
      checkFrames = [];
      clearTimeout(checkTimer);
      const start = firstOpen();
      if (start >= steps.length) return;
      const pendingIdx = new Set();
      const results = {};
      for (let i = start; i < steps.length; i++) {
        const f = el('iframe', { sandbox: 'allow-scripts allow-forms', tabindex: '-1' });
        f.srcdoc = buildDoc(lesson, code, 'check', run, i);
        checkHost.append(f);
        checkFrames.push(f);
        pendingIdx.add(i);
      }
      state.onCheck = (data, source) => {
        results[data.idx] = data;
        pendingIdx.delete(data.idx);
        const f = checkFrames.find(fr => fr.contentWindow === source);
        if (f) f.remove();
        if (!pendingIdx.size) finish(results);
      };
      checkTimer = setTimeout(() => finish(results), 6000);
    }

    function finish(results) {
      clearTimeout(checkTimer);
      checkFrames.forEach(f => f.remove());
      checkFrames = [];
      state.onCheck = null;
      lastResults = results;
      // Steps complete in order: stop at the first one that isn't passing.
      const newlyDone = [];
      for (let i = firstOpen(); i < steps.length; i++) {
        if (results[i] && results[i].ok) { p.steps[i] = true; newlyDone.push(i); }
        else break;
      }
      if (newlyDone.length) {
        saveProgress();
        const next = firstOpen();
        selected = next < steps.length ? next : newlyDone[newlyDone.length - 1];
        celebrate(newlyDone);
      }
      renderSteps(newlyDone);
    }

    function celebrate(idxs) {
      const last = idxs[idxs.length - 1];
      const msg = firstOpen() >= steps.length ? '🏆 Mission complete!' : '✨ Step ' + (last + 1) + ' complete! On to the next one.';
      const t = el('div', { class: 'lab-toast', text: msg });
      document.body.append(t);
      setTimeout(() => t.classList.add('out'), 1800);
      setTimeout(() => t.remove(), 2300);
    }

    function addLog({ level, text }) {
      consoleBody.append(el('div', { class: 'line ' + (level === 'error' ? 'error' : level === 'warn' ? 'warn' : ''), text }));
      consoleBody.scrollTop = consoleBody.scrollHeight;
      if (level === 'error') {
        errorCount++;
        errBadge.hidden = false;
        errBadge.textContent = errorCount;
      }
    }

    function renderDom(tree) {
      const keys = new Set();
      const make = (node, path) => {
        if (node.x !== undefined) {
          const key = path + '|"' + node.x;
          keys.add(key);
          return el('li', { class: 'dn-text' + (prevDomKeys && !prevDomKeys.has(key) ? ' flash' : '') }, el('span', { text: '"' + node.x + '"' }));
        }
        const sig = path + '|' + node.t + '#' + (node.id || '') + '.' + (node.c || '');
        keys.add(sig);
        const li = el('li', { class: prevDomKeys && !prevDomKeys.has(sig) ? 'flash' : '' });
        const open = el('span', { class: 'dn-tag' });
        open.append(el('span', { class: 'dn-name', text: '<' + node.t }));
        if (node.id) open.append(el('span', { class: 'dn-attr', text: ' id' }), el('span', { class: 'dn-val', text: '="' + node.id + '"' }));
        if (node.c) open.append(el('span', { class: 'dn-attr', text: ' class' }), el('span', { class: 'dn-val', text: '="' + node.c + '"' }));
        open.append(el('span', { class: 'dn-name', text: '>' }));
        li.append(open);
        if (node.k) {
          const ul = el('ul');
          node.k.forEach((k, i) => ul.append(make(k, path + '/' + i + node.t)));
          li.append(ul);
        }
        return li;
      };
      domBody.innerHTML = '';
      const ul = el('ul');
      ul.append(make(tree, ''));
      domBody.append(ul);
      prevDomKeys = keys;
    }

    const state = {
      run: 0,
      onCheck: null,
      onMessage(d, source) {
        if (d.type === 'log' && source === frame.contentWindow) addLog(d.data);
        else if (d.type === 'dom' && source === frame.contentWindow) renderDom(d.data);
        else if (d.type === 'check' && state.onCheck) state.onCheck(d.data, source);
      },
    };
    active = state;

    renderSteps();
    // Wait until the page is laid out, then run the learner's saved code.
    requestAnimationFrame(() => runNow());
    return root;
  }

  window.WebLab = { render };
})();
