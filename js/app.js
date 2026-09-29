(function () {
  const MODULES = window.MODULES;
  const LESSONS = window.LESSONS;
  const app = document.getElementById('app');

  // ---------- Storage (fails safely in private mode) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    },
  };

  // progress = { [lessonId]: { exercise: bool, quiz: { [qIndex]: chosenIndex } } }
  let progress = store.get('jsm-progress', {});
  const saveProgress = () => { store.set('jsm-progress', progress); renderSidebar(); };
  const lessonProgress = id => (progress[id] = progress[id] || { exercise: false, quiz: {} });

  function lessonStatus(lesson) {
    const p = progress[lesson.id];
    if (!p) return 'todo';
    const quizDone = lesson.quiz.every((q, i) => p.quiz[i] === q.answer);
    if (p.exercise && quizDone) return 'done';
    if (p.exercise || Object.keys(p.quiz).length) return 'half';
    return 'todo';
  }

  // ---------- Helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.append(c);
    return node;
  }
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  // ---------- Editor ----------
  function createEditor(parent, code, onRun, onChange) {
    const wrap = el('div', { class: 'editor-wrap' });
    parent.append(wrap);

    if (window.CodeMirror) {
      const cm = CodeMirror(wrap, {
        value: code,
        mode: 'javascript',
        lineNumbers: true,
        tabSize: 2,
        indentUnit: 2,
        viewportMargin: Infinity,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
          'Cmd-Enter': () => onRun(),
          'Ctrl-Enter': () => onRun(),
          Tab: c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  '),
        },
      });
      if (onChange) cm.on('change', () => onChange(cm.getValue()));
      // Refresh once the element is laid out so line heights are measured correctly.
      requestAnimationFrame(() => cm.refresh());
      return { getValue: () => cm.getValue(), setValue: v => cm.setValue(v) };
    }

    // Fallback if the CDN is unreachable: a plain textarea.
    const ta = el('textarea', { spellcheck: 'false', rows: Math.max(6, code.split('\n').length + 1) });
    ta.value = code;
    ta.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onRun(); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: end } = ta;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
    });
    if (onChange) ta.addEventListener('input', () => onChange(ta.value));
    wrap.append(ta);
    return { getValue: () => ta.value, setValue: v => { ta.value = v; } };
  }

  // ---------- Runner widget (editor + console) ----------
  // opts: { code, label, storageKey, exercise, onPass }
  function makeRunner(opts) {
    const original = opts.code;
    const saved = opts.storageKey ? store.get(opts.storageKey, null) : null;
    let stopCurrent = null;

    const box = el('div', { class: 'runner' });
    const head = el('div', { class: 'runner-head' });
    const consoleEl = el('div', { class: 'console', 'aria-live': 'polite' });
    const banner = el('div', { class: 'banner', hidden: '' });

    const line = (text, cls = '') => {
      consoleEl.append(el('div', { class: 'line ' + cls, text }));
      consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    function execute(withTests) {
      if (stopCurrent) stopCurrent();
      consoleEl.innerHTML = '';
      banner.hidden = true;
      runBtn.disabled = true;
      if (checkBtn) checkBtn.disabled = true;

      stopCurrent = JSRunner.run(editor.getValue(), {
        tests: withTests ? opts.exercise.tests : null,
        onLog: ({ level, text }) => line(text, level === 'error' ? 'error' : level === 'warn' ? 'warn' : ''),
        onTests: results => {
          line('── Tests ──', 'meta');
          results.forEach(r => line((r.passed ? '✓ ' : '✗ ') + r.name + (r.error ? '  (' + r.error + ')' : ''), r.passed ? 'pass' : 'fail'));
          const passed = results.filter(r => r.passed).length;
          const all = passed === results.length;
          banner.hidden = false;
          banner.className = 'banner ' + (all ? 'good' : 'bad');
          banner.textContent = all
            ? '🎉 All ' + results.length + ' tests passed! Exercise complete.'
            : passed + ' of ' + results.length + ' tests passing. Keep going!';
          if (all && opts.onPass) opts.onPass();
        },
        onDone: ({ ok, timedOut }) => {
          runBtn.disabled = false;
          if (checkBtn) checkBtn.disabled = false;
          if (timedOut) line('⏱ Stopped after 4 seconds. Is there an infinite loop?', 'error');
          else if (withTests && !ok) {
            banner.hidden = false;
            banner.className = 'banner bad';
            banner.textContent = 'Your code threw an error before the tests could run. Check the output above.';
          }
        },
      });
    }

    head.append(el('span', { class: 'label', text: opts.label || 'Try it' }));
    head.append(el('span', { class: 'kbd', text: isMac ? '⌘ + Enter' : 'Ctrl + Enter' }));
    const runBtn = el('button', { class: 'btn' + (opts.exercise ? '' : ' primary'), text: '▶ Run', onclick: () => execute(false) });
    const checkBtn = opts.exercise ? el('button', { class: 'btn primary', text: '✓ Check', onclick: () => execute(true) }) : null;
    const resetBtn = el('button', {
      class: 'btn', text: 'Reset', title: 'Restore the original code',
      onclick: () => { editor.setValue(original); if (opts.storageKey) store.remove(opts.storageKey); consoleEl.innerHTML = ''; banner.hidden = true; },
    });
    head.append(runBtn);
    if (checkBtn) head.append(checkBtn);
    head.append(resetBtn);
    if (opts.exercise) {
      head.append(el('button', {
        class: 'btn', text: 'Solution',
        onclick: () => { editor.setValue(opts.exercise.solution); },
      }));
    }

    box.append(head);
    const editor = createEditor(box, saved ?? original, () => execute(!!opts.exercise),
      opts.storageKey ? v => store.set(opts.storageKey, v) : null);
    box.append(consoleEl);

    const frag = el('div');
    frag.append(box, banner);
    return frag;
  }

  // ---------- Quiz ----------
  function makeQuiz(lesson) {
    const wrap = el('div');
    const p = lessonProgress(lesson.id);

    lesson.quiz.forEach((item, qi) => {
      const card = el('div', { class: 'quiz-q' });
      card.append(el('p', { class: 'q', html: (qi + 1) + '. ' + item.q }));
      if (item.code) card.append(el('pre', { class: 'code-sample', text: item.code }));
      const optionsEl = el('div', { class: 'options' });
      const feedback = el('div');
      card.append(optionsEl, feedback);

      function show(chosen) {
        [...optionsEl.children].forEach((btn, i) => {
          btn.disabled = true;
          if (i === item.answer) btn.classList.add('correct');
          else if (i === chosen) btn.classList.add('wrong');
        });
        const right = chosen === item.answer;
        feedback.innerHTML = '';
        feedback.append(el('div', { class: 'explain', html: (right ? '✅ <strong>Correct.</strong> ' : '❌ <strong>Not quite.</strong> ') + item.explain }));
        if (!right) {
          feedback.append(el('button', {
            class: 'link-btn', text: 'Try again', style: 'margin-top:6px',
            onclick: () => {
              delete p.quiz[qi]; saveProgress();
              [...optionsEl.children].forEach(b => { b.disabled = false; b.classList.remove('correct', 'wrong'); });
              feedback.innerHTML = '';
            },
          }));
        }
      }

      item.options.forEach((opt, oi) => {
        optionsEl.append(el('button', {
          class: 'option', text: opt,
          onclick: () => { p.quiz[qi] = oi; saveProgress(); show(oi); },
        }));
      });

      if (p.quiz[qi] !== undefined) show(p.quiz[qi]);
      wrap.append(card);
    });
    return wrap;
  }

  // ---------- Sidebar ----------
  function renderSidebar(activeId) {
    if (activeId !== undefined) renderSidebar.active = activeId;
    const current = renderSidebar.active;
    const nav = document.getElementById('lessonNav');
    nav.innerHTML = '';
    let n = 0;
    for (const mod of MODULES) {
      const section = el('div', { class: 'nav-module' }, el('h4', { text: mod.title }));
      for (const lesson of LESSONS.filter(l => l.module === mod.id)) {
        n++;
        const status = lessonStatus(lesson);
        section.append(el('a', {
          class: 'nav-link' + (lesson.id === current ? ' active' : ''),
          href: '#/lesson/' + lesson.id,
        }, [
          el('span', { class: 'nav-dot ' + status, text: status === 'done' ? '✓' : String(n) }),
          el('span', { text: lesson.title }),
        ]));
      }
      nav.append(section);
    }
    const done = LESSONS.filter(l => lessonStatus(l) === 'done').length;
    const pct = Math.round((done / LESSONS.length) * 100);
    document.getElementById('progressText').textContent = done + ' / ' + LESSONS.length + ' lessons';
    document.getElementById('progressFill').style.width = pct + '%';
  }

  // ---------- Pages ----------
  function renderHome() {
    renderSidebar(null);
    const next = LESSONS.find(l => lessonStatus(l) !== 'done');
    const started = LESSONS.some(l => lessonStatus(l) !== 'todo');

    const hero = el('section', { class: 'hero' }, [
      el('h1', { text: 'Learn JavaScript by writing it.' }),
      el('p', { text: 'Short lessons, live code you can edit and run right here, hands-on exercises with automatic tests, and quick quizzes to check your understanding. Your progress is saved in this browser.' }),
      el('div', { class: 'btn-row' }, [
        next
          ? el('a', { class: 'btn primary', href: '#/lesson/' + next.id, text: (started ? 'Continue: ' : 'Start: ') + next.title + ' →' })
          : el('span', { class: 'btn primary', text: '🏆 Course complete!' }),
        el('a', { class: 'btn', href: '#/playground', text: 'Open playground' }),
      ]),
    ]);
    app.append(hero);

    let n = 0;
    for (const mod of MODULES) {
      const grid = el('div', { class: 'card-grid' });
      for (const lesson of LESSONS.filter(l => l.module === mod.id)) {
        n++;
        const status = lessonStatus(lesson);
        const statusText = { done: '✓ Complete', half: '● In progress', todo: 'Not started' }[status];
        grid.append(el('a', { class: 'lesson-card', href: '#/lesson/' + lesson.id }, [
          el('div', { class: 'num', text: 'Lesson ' + n }),
          el('h3', { text: lesson.title }),
          el('p', { text: lesson.summary }),
          el('div', { class: 'status ' + status, text: statusText }),
        ]));
      }
      app.append(el('section', { class: 'module-block' }, [
        el('h2', { text: mod.title }),
        el('p', { text: mod.blurb }),
        grid,
      ]));
    }
  }

  function renderLesson(id) {
    const index = LESSONS.findIndex(l => l.id === id);
    if (index === -1) return renderNotFound();
    const lesson = LESSONS[index];
    const mod = MODULES.find(m => m.id === lesson.module);
    renderSidebar(lesson.id);
    document.title = lesson.title + ' · JS Mastery';

    const article = el('article', { class: 'lesson' });
    article.append(el('div', { class: 'crumb', text: mod.title + ' · Lesson ' + (index + 1) + ' of ' + LESSONS.length }));
    article.append(el('h1', { text: lesson.title }));

    // Content, with {{run:N}} placeholders swapped for live runners.
    const prose = el('div', { class: 'prose' });
    const parts = lesson.content.split(/\{\{run:(\d+)\}\}/);
    parts.forEach((part, i) => {
      if (i % 2 === 0) { if (part.trim()) prose.append(el('div', { html: part })); }
      else {
        const exIndex = Number(part);
        prose.append(makeRunner({ code: lesson.examples[exIndex], label: 'Example: edit me and run' }));
      }
    });
    article.append(prose);

    // Exercise
    const ex = lesson.exercise;
    article.append(el('h2', {}, [el('span', { class: 'section-tag', text: 'Your turn' }), el('br'), document.createTextNode('Exercise')]));
    const exWrap = el('div', { class: 'exercise' });
    const task = el('div', { class: 'task', html: ex.prompt });
    task.append(el('details', { class: 'hint' }, [el('summary', { text: 'Need a hint?' }), el('div', { html: ex.hint })]));
    exWrap.append(task);
    exWrap.append(makeRunner({
      code: ex.starter,
      label: 'Exercise',
      storageKey: 'jsm-code:' + lesson.id,
      exercise: ex,
      onPass: () => { lessonProgress(lesson.id).exercise = true; saveProgress(); },
    }));
    if (lessonProgress(lesson.id).exercise) {
      exWrap.append(el('div', { class: 'banner good', text: '✓ You\'ve already completed this exercise.' }));
    }
    article.append(exWrap);

    // Quiz
    article.append(el('h2', {}, [el('span', { class: 'section-tag', text: 'Check yourself' }), el('br'), document.createTextNode('Quiz')]));
    article.append(makeQuiz(lesson));

    // Prev / next
    const prev = LESSONS[index - 1];
    const next = LESSONS[index + 1];
    article.append(el('div', { class: 'lesson-footer' }, [
      prev ? el('a', { class: 'btn', href: '#/lesson/' + prev.id, text: '← ' + prev.title }) : el('span'),
      next ? el('a', { class: 'btn primary', href: '#/lesson/' + next.id, text: next.title + ' →' })
           : el('a', { class: 'btn primary', href: '#/', text: 'Back to all lessons' }),
    ]));

    app.append(article);
  }

  function renderPlayground() {
    renderSidebar(null);
    document.title = 'Playground · JS Mastery';
    app.append(el('div', { class: 'lesson' }, [
      el('h1', { text: 'Playground' }),
      el('p', { class: 'prose', html: 'A scratchpad for experimenting. Anything you write is saved automatically in this browser. Code runs in an isolated worker, so there is no DOM (<code>document</code>), but <code>console.log</code>, timers, promises and everything in the language itself work.' }),
      makeRunner({
        code: '// Write any JavaScript here and press Run\nconst greet = name => "Hello, " + name + "!";\nconsole.log(greet("world"));\n',
        label: 'Playground',
        storageKey: 'jsm-playground',
      }),
    ]));
  }

  function renderNotFound() {
    renderSidebar(null);
    app.append(el('div', { class: 'lesson' }, [
      el('h1', { text: 'Page not found' }),
      el('a', { class: 'btn', href: '#/', text: '← Back to lessons' }),
    ]));
  }

  // ---------- Router ----------
  function route() {
    app.innerHTML = '';
    document.title = 'JS Mastery';
    document.getElementById('sidebar').classList.remove('open');
    const hash = location.hash.replace(/^#\/?/, '');
    const [page, param] = hash.split('/');

    document.querySelectorAll('.top-links a').forEach(a => {
      const target = a.getAttribute('href').replace(/^#\/?/, '');
      a.classList.toggle('active', target === page || (target === '' && (page === '' || page === 'lesson')));
    });

    if (!page) renderHome();
    else if (page === 'lesson' && param) renderLesson(param);
    else if (page === 'playground') renderPlayground();
    else renderNotFound();
    window.scrollTo(0, 0);
  }

  // ---------- Global controls ----------
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    store.set('jsm-theme', root.dataset.theme);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all progress and saved exercise code? This cannot be undone.')) return;
    try {
      Object.keys(localStorage).filter(k => k.startsWith('jsm-') && k !== 'jsm-theme').forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    progress = {};
    route();
  });

  window.addEventListener('hashchange', route);
  route();
})();
