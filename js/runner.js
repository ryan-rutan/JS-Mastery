// Runs user code inside a Web Worker so infinite loops can be stopped
// and user code can't break the page. console.* output is streamed back.
(function () {
  const WORKER_SRC = `
    const send = (type, data) => postMessage({ type, data });

    function fmt(value, depth = 0, seen = new WeakSet(), top = true) {
      if (typeof value === 'string') return top ? value : JSON.stringify(value);
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'bigint') return value + 'n';
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'function') {
        if (/^class\\s/.test(Function.prototype.toString.call(value))) return '[class ' + (value.name || 'anonymous') + ']';
        return '[Function: ' + (value.name || 'anonymous') + ']';
      }
      if (typeof value !== 'object') return String(value);
      if (value instanceof Error) return value.name + ': ' + value.message;
      if (value instanceof Promise) return 'Promise { ... }';
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return String(value);
      if (seen.has(value)) return '[Circular]';
      if (depth > 3) return Array.isArray(value) ? '[Array]' : '[Object]';
      seen.add(value);
      const inner = v => fmt(v, depth + 1, seen, false);
      let out;
      if (Array.isArray(value)) {
        out = '[' + value.map(inner).join(', ') + ']';
      } else if (value instanceof Map) {
        out = 'Map(' + value.size + ') {' + [...value].map(([k, v]) => ' ' + inner(k) + ' => ' + inner(v)).join(',') + (value.size ? ' ' : '') + '}';
      } else if (value instanceof Set) {
        out = 'Set(' + value.size + ') {' + [...value].map(v => ' ' + inner(v)).join(',') + (value.size ? ' ' : '') + '}';
      } else {
        const name = value.constructor && value.constructor !== Object ? value.constructor.name + ' ' : '';
        const keys = Object.keys(value);
        out = name + '{' + keys.map(k => ' ' + (/^[A-Za-z_$][\\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + inner(value[k])).join(',') + (keys.length ? ' ' : '') + '}';
      }
      seen.delete(value);
      return out;
    }

    ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
      console[level] = (...args) => send('log', { level, text: args.map(a => fmt(a)).join(' ') });
    });
    console.table = (d) => send('log', { level: 'log', text: fmt(d) });

    self.addEventListener('unhandledrejection', e => {
      e.preventDefault();
      send('log', { level: 'error', text: 'Uncaught (in promise) ' + fmt(e.reason) });
    });
    self.addEventListener('error', e => {
      e.preventDefault();
      send('log', { level: 'error', text: 'Uncaught ' + (e.error ? fmt(e.error) : e.message) });
    });

    // Deep-equality helper used by exercise tests.
    self.__eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    const AsyncFunction = (async () => {}).constructor;

    self.onmessage = async (e) => {
      const { code, testSrc } = e.data;
      let fn;
      try {
        fn = new AsyncFunction(code + '\\n;' + (testSrc || ''));
      } catch (err) {
        send('log', { level: 'error', text: err.name + ': ' + err.message });
        send('done', { ok: false });
        return;
      }
      let tests;
      try {
        tests = await fn();
      } catch (err) {
        send('log', { level: 'error', text: 'Uncaught ' + fmt(err) });
        send('done', { ok: false });
        return;
      }
      if (!testSrc) { send('done', { ok: true }); return; }
      const results = [];
      for (const [name, check] of tests) {
        try {
          const passed = await check();
          results.push({ name, passed: passed === true });
        } catch (err) {
          results.push({ name, passed: false, error: fmt(err) });
        }
      }
      send('tests', results);
      send('done', { ok: true });
    };
  `;

  let workerUrl = null;
  function getWorkerUrl() {
    if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    return workerUrl;
  }

  // Turns [{name, check}] into source that returns [[name, async () => (check)]].
  function buildTestSrc(tests) {
    if (!tests || !tests.length) return '';
    return 'return [' + tests.map(t =>
      '[' + JSON.stringify(t.name) + ', async () => (' + t.check + ')]'
    ).join(',') + '];';
  }

  /**
   * Runs code. Callbacks: onLog({level,text}), onTests(results), onDone({ok, timedOut}).
   * Returns a stop() function.
   */
  function run(code, { tests, onLog, onTests, onDone, timeout = 4000 } = {}) {
    const worker = new Worker(getWorkerUrl());
    let finished = false;
    let lingerTimer = null;

    const stop = () => { clearTimeout(hardTimer); clearTimeout(lingerTimer); worker.terminate(); };

    // Hard limit: if the code never finishes, assume an infinite loop.
    const hardTimer = setTimeout(() => {
      if (!finished) {
        stop();
        onDone && onDone({ ok: false, timedOut: true });
      }
    }, timeout);

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === 'log') onLog && onLog(data);
      else if (type === 'tests') onTests && onTests(data);
      else if (type === 'done') {
        finished = true;
        clearTimeout(hardTimer);
        onDone && onDone({ ok: data.ok, timedOut: false });
        // Keep the worker alive briefly so pending timers/promises can still log.
        lingerTimer = setTimeout(() => worker.terminate(), 3000);
      }
    };
    worker.onerror = (e) => {
      e.preventDefault();
      onLog && onLog({ level: 'error', text: e.message });
    };

    worker.postMessage({ code, testSrc: buildTestSrc(tests) });
    return stop;
  }

  window.JSRunner = { run };
})();
