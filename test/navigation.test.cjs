const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

test('rendered explorer HTML bootstrap and client JS bundle parse cleanly, including special characters', async () => {
  const { browserPage } = await import('../src/pages/explorer.js');
  const { APP_JS } = await import('../src/assets/client.js');
  const { APP_VERSION } = await import('../src/config.js');

  assert.equal(APP_VERSION, '1.48.3');
  new vm.Script(APP_JS);

  for (const prefix of ['', 'apps/tools/', 'a\'" & #/日本語/', '</script>/']) {
    const html = browserPage({ prefix, folders: [prefix + 'child/'], files: [] });
    const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(inlineScripts.length >= 2);
    for (const s of inlineScripts) {
      new vm.Script(s);
    }
    assert.ok(html.includes(`/assets/app.css?v=${APP_VERSION}`));
    assert.ok(html.includes(`/assets/app.js?v=${APP_VERSION}`));
  }
});

test('goUp navigates exactly one level via SPA navigateTo', async () => {
  const { APP_JS } = await import('../src/assets/client.js');
  const goUpSrc = APP_JS.match(/function goUp\(\) \{[\s\S]*?\n  \}/)[0];

  for (const [prefix, parent] of [['', null], ['apps/', ''], ['apps/tools/', 'apps/'], ['a & #/tools/', 'a & #/']]) {
    let navigated = null;
    const context = { PREFIX: prefix, navigateTo: (p) => { navigated = p; } };
    vm.runInNewContext(goUpSrc + '; goUp();', context);
    assert.equal(navigated, parent);
  }
});

async function touchHarness(itemType = 'folder') {
  const { APP_JS } = await import('../src/assets/client.js');
  const handlers = {};
  const timers = new Map();
  const actions = [];
  const itemEl = itemType === 'folder'
    ? { dataset: { id: 'folder:apps/child/', type: 'folder', path: 'apps/child/', idx: '0' } }
    : { dataset: { id: 'file:apps/archive.zip', type: 'file', key: 'apps/archive.zip', idx: '0' } };

  const context = {
    listContainer: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    setTimeout: (fn) => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    closeCtxMenu: () => {},
    selectedSet: new Set(),
    selectMode: false,
    syncSelectionClasses: () => actions.push('sync'),
    handleRowSelect: () => actions.push('select'),
    openCtxMenu: () => actions.push('context'),
    navigateTo: (path) => actions.push(['folder', path]),
    onFileActivate: (key, isTouch) => actions.push(['file', key, isTouch]),
    toggleSort: () => {},
  };

  const sliceStart = APP_JS.indexOf('let touchTimer = null;');
  const sliceEnd = APP_JS.indexOf('// ---------------- Upgraded Upload Manager');
  vm.runInNewContext(APP_JS.slice(sliceStart, sliceEnd), context);

  const event = (x = 0, y = 0) => ({
    touches: [{ clientX: x, clientY: y }],
    target: {
      closest: (sel) => (sel === '[data-id]' ? itemEl : null),
    },
  });
  return { handlers, timers, actions, event };
}

test('short touch opens folder once and cancels the hold timer', async () => {
  const h = await touchHarness('folder');
  h.handlers.touchstart(h.event());
  h.handlers.touchend({ preventDefault() {} });
  assert.deepEqual(h.actions, [['folder', 'apps/child/']]);
  assert.equal(h.timers.size, 0);
});

test('short touch on file triggers mobile preview activation (isTouch=true)', async () => {
  const h = await touchHarness('file');
  h.handlers.touchstart(h.event());
  h.handlers.touchend({ preventDefault() {} });
  assert.deepEqual(h.actions, [['file', 'apps/archive.zip', true]]);
  assert.equal(h.timers.size, 0);
});

test('long press opens context menu without opening folder on release', async () => {
  const h = await touchHarness('folder');
  h.handlers.touchstart(h.event());
  [...h.timers.values()][0]();
  h.handlers.touchend({ preventDefault() {} });
  assert.deepEqual(h.actions, ['sync', 'context']);
  assert.equal(h.timers.size, 0);
});

test('scrolling, cancellation and multi-touch cancel pending activation', async () => {
  for (const cancel of ['move', 'cancel', 'multi']) {
    const h = await touchHarness('folder');
    h.handlers.touchstart(h.event());
    if (cancel === 'move') h.handlers.touchmove(h.event(20, 0));
    if (cancel === 'cancel') h.handlers.touchcancel();
    if (cancel === 'multi') h.handlers.touchstart({ touches: [{}, {}] });
    h.handlers.touchend({ preventDefault() {} });
    assert.deepEqual(h.actions, []);
    assert.equal(h.timers.size, 0);
  }
});

test('visual branding uses Glz Serve and omits Cloudflare/R2 mentions', async () => {
  const { browserPage } = await import('../src/pages/explorer.js');
  const { loginPage, sharePasswordPage } = await import('../src/pages/login.js');
  const { publicSharePage } = await import('../src/pages/share.js');
  const { APP_JS } = await import('../src/assets/client.js');

  const surfaces = [
    browserPage({ prefix: '', folders: [], files: [] }),
    loginPage(''),
    sharePasswordPage({ code: 'abc123', fileName: 'demo.pdf', error: '' }),
    publicSharePage({ code: 'abc123', key: 'demo.txt', size: 128, origin: 'https://example.com' }),
    APP_JS,
  ];

  for (const content of surfaces) {
    const cleaned = content.replace(/https:\/\/cdnjs\.cloudflare\.com\/[^\s'"]+/g, '');
    assert.ok(cleaned.includes('Glz Serve'), 'expected Glz Serve branding');
    assert.doesNotMatch(cleaned, /cloudflare/i);
    assert.doesNotMatch(cleaned, /\bR2\b/);
    assert.doesNotMatch(cleaned, /glz-dl-server/i);
    assert.doesNotMatch(cleaned, /glz-files/i);
  }
});

