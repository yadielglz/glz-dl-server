Run dependency-free regression checks with `npm test`.

For browser checks, install Playwright separately and run `node test/browser.cjs` with Microsoft Edge installed. Set `GLZ_PLAYWRIGHT_PATH` to the installed Playwright package directory if it is outside this project. The browser suite uses local request interception and fixture data; it does not access production R2 or KV.

Run `npx wrangler deploy --dry-run --outdir .wrangler/validation` to validate the Worker bundle and bindings without deploying.
