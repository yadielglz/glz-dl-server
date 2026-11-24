// Run with GLZ_PLAYWRIGHT_PATH pointing to an installed playwright package.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.GLZ_PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const { browserPage } = await import('../src/pages/explorer.js');
  const { APP_CSS } = await import('../src/assets/styles.js');
  const { APP_JS } = await import('../src/assets/client.js');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const mobile of [false, true]) {
      const session = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
        hasTouch: mobile,
      });
      const page = await session.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('https://glz.test/**', (route) => {
        const url = new URL(route.request().url());
        const prefix = url.searchParams.get('prefix') || '';
        if (url.pathname === '/assets/app.css') return route.fulfill({ contentType: 'text/css', body: APP_CSS });
        if (url.pathname === '/assets/app.js') return route.fulfill({ contentType: 'application/javascript', body: APP_JS });
        if (url.pathname === '/api/list') {
          return route.fulfill({ json: { prefix, folders: [prefix + 'child/'], files: [{ key: prefix + 'sample.txt', size: 5 }] } });
        }
        return route.fulfill({
          contentType: 'text/html',
          body: browserPage({ prefix, folders: [prefix + 'child/'], files: [{ key: prefix + 'sample.txt', size: 5 }] }),
        });
      });

      await page.goto('https://glz.test/?prefix=apps%2F');
      assert.equal(await page.locator(mobile ? '.mobile-menu-btn' : '.sidebar').isVisible(), true);
      if (mobile) await page.locator('[data-type=folder]').tap();
      else await page.locator('[data-type=folder]').dblclick();
      await page.waitForURL('**/?prefix=apps%2Fchild%2F');
      await page.evaluate(() => window.__glz.goUp());
      await page.waitForURL('**/?prefix=apps%2F');
      await page.evaluate(() => window.__glz.setViewMode('grid'));
      assert.equal(await page.locator('#fileGrid').isVisible(), true);
      await page.evaluate(() => window.__glz.setViewMode('list'));
      assert.equal(await page.locator('#fileTable').isVisible(), true);
      assert.deepEqual(errors, []);
      console.log('PASS Edge ' + (mobile ? 'mobile' : 'desktop') + ': SPA navigation, grid/list view, layout');
      await session.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
