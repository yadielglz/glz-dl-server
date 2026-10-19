// Run with GLZ_PLAYWRIGHT_PATH pointing to an installed playwright package.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.GLZ_PLAYWRIGHT_PATH || 'playwright');
const worker = vm.createContext({ TextEncoder });
vm.runInContext(fs.readFileSync(require.resolve('../src/index.js'), 'utf8')
  .replace(/export\s*\{\s*index_default as default\s*\};/, ''), worker);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const mobile of [false, true]) {
      const session = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile });
      const page = await session.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://glz.test/**', route => {
        const url = new URL(route.request().url());
        const prefix = url.searchParams.get('prefix') || '';
        if (url.pathname === '/api/list') return route.fulfill({ json: { folders: [prefix + 'child/'], files: [] } });
        return route.fulfill({ contentType: 'text/html', body: worker.browserPage({ prefix, folders: [prefix + 'child/'], files: [{ key: prefix + 'sample.txt', size: 5 }] }) });
      });
      await page.goto('https://glz.test/?prefix=apps%2F');
      assert.equal(await page.locator(mobile ? '.wm-topbar' : '.xp-menubar').isVisible(), true);
      if (mobile) await page.locator('tr[data-type=folder]').tap();
      else await page.locator('tr[data-type=folder]').dblclick();
      await page.waitForURL('**/?prefix=apps%2Fchild%2F');
      await page.evaluate(() => goUp());
      await page.waitForURL('**/?prefix=apps%2F');
      await page.locator('tr[data-type=folder]').click({ button: 'right' });
      await page.locator('#ctxMenu.show [role=menuitem]').first().click();
      await page.waitForURL('**/?prefix=apps%2Fchild%2F');
      await page.evaluate(() => refreshList());
      assert.equal(await page.evaluate(() => currentSelectedRow), null);
      await page.locator('#xpMain').click({ button: 'right', position: { x: 250, y: 250 } });
      assert.match(await page.locator('#ctxMenu.show').innerText(), /New Folder/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#ctxMenu').isVisible(), false);
      if (mobile) {
        const row = await page.locator('tr[data-type=folder]').boundingBox();
        const cdp = await session.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: row.x + 40, y: row.y + 15 }] });
        await page.waitForTimeout(650);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#ctxMenu').isVisible(), true);
        assert.equal(new URL(page.url()).searchParams.get('prefix'), 'apps/child/');
      } else {
        await page.evaluate(() => toggleUiTheme());
        assert.equal(await page.locator('.wm-topbar').isVisible(), true);
        await page.reload();
        assert.equal(await page.locator('.wm-topbar').isVisible(), true);
      }
      assert.deepEqual(errors, []);
      console.log('PASS Edge ' + (mobile ? 'mobile' : 'desktop') + ': navigation, context menus, refresh, layout and gestures/theme');
      await session.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
