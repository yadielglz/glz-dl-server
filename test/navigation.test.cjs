const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../src/index.js'), 'utf8')
  .replace(/export\s*\{\s*index_default as default\s*\};/, '');
const worker = vm.createContext({ TextEncoder });
vm.runInContext(source, worker);
const pageScript = (prefix = '') => worker.browserPage({ prefix, folders: [prefix + 'child/'], files: [] })
  .match(/<script>([\s\S]*?)<\/script>/)[1];

test('rendered explorer JavaScript parses, including special characters in keys', () => {
  for (const prefix of ['', 'apps/tools/', 'a\'" & #/日本語/', '</script>/']) {
    new vm.Script(pageScript(prefix));
  }
});

test('Up navigates exactly one level and keeps folder names URL encoded', () => {
  for (const [prefix, parent] of [['', null], ['apps/', ''], ['apps/tools/', 'apps/'], ['a & #/tools/', 'a & #/']]) {
    const script = pageScript(prefix).match(/function goUp\(\) \{[\s\S]*?\n\}/)[0];
    const context = { PREFIX: prefix, window: { location: { href: 'unchanged' } } };
    vm.runInNewContext(script + '; goUp();', context);
    assert.equal(context.window.location.href, parent === null ? 'unchanged' : '/?prefix=' + encodeURIComponent(parent));
  }
});

function touchHarness() {
  const handlers = {};
  const timers = new Map();
  const actions = [];
  const row = { dataset: { type: 'folder', path: 'apps/child/' } };
  const context = {
    document: { getElementById: () => ({ style: {} }) },
    listContainer: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    setTimeout: (fn) => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    closeCtxMenu: () => {},
    selectRow: () => actions.push('select'),
    openCtxMenu: () => actions.push('context'),
    openFolder: (path) => actions.push(path),
    onFileDblClick: () => actions.push('file'),
  };
  const script = pageScript();
  vm.runInNewContext(script.slice(script.indexOf('let touchTimer'), script.indexOf('async function refreshList')), context);
  const event = (x = 0, y = 0) => ({ touches: [{ clientX: x, clientY: y }], target: { closest: () => row } });
  return { handlers, timers, actions, event };
}

test('short touch opens folder once and cancels the hold timer', () => {
  const h = touchHarness();
  h.handlers.touchstart(h.event());
  h.handlers.touchend({ preventDefault() {} });
  assert.deepEqual(h.actions, ['select', 'apps/child/']);
  assert.equal(h.timers.size, 0);
});

test('long press opens context menu without opening folder on release', () => {
  const h = touchHarness();
  h.handlers.touchstart(h.event());
  [...h.timers.values()][0]();
  h.handlers.touchend({ preventDefault() {} });
  assert.deepEqual(h.actions, ['select', 'context']);
  assert.equal(h.timers.size, 0);
});

test('scrolling, cancellation and multi-touch cancel pending activation', () => {
  for (const cancel of ['move', 'cancel', 'multi']) {
    const h = touchHarness();
    h.handlers.touchstart(h.event());
    if (cancel === 'move') h.handlers.touchmove(h.event(20, 0));
    if (cancel === 'cancel') h.handlers.touchcancel();
    if (cancel === 'multi') h.handlers.touchstart({ touches: [{}, {}] });
    h.handlers.touchend({ preventDefault() {} });
    assert.deepEqual(h.actions, []);
    assert.equal(h.timers.size, 0);
  }
});
