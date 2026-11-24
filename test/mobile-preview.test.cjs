const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function createMockEnv({ links = {}, linkMeta = {}, objects = {} } = {}) {
  const multiparts = new Map();
  return {
    COOKIE_SECRET: 'test-secret',
    AUTH_PASSWORD: 'pw',
    LINKS: {
      async get(code) {
        return Object.prototype.hasOwnProperty.call(links, code) ? links[code] : null;
      },
      async put(code, val, opts = {}) {
        links[code] = val;
        if (opts.metadata) linkMeta[code] = opts.metadata;
      },
      async delete(code) {
        delete links[code];
        delete linkMeta[code];
      },
      async list() {
        return {
          keys: Object.keys(links).map((name) => ({ name, metadata: linkMeta[name] })),
          list_complete: true,
        };
      },
    },
    BUCKET: {
      async head(key) {
        const obj = objects[key];
        if (!obj) return null;
        return {
          key,
          size: obj.body.length,
          httpEtag: obj.etag || '"etag-1"',
          uploaded: obj.uploaded || new Date('2026-10-01T00:00:00Z'),
          writeHttpMetadata(h) {
            if (obj.contentType) h.set('Content-Type', obj.contentType);
          },
        };
      },
      async get(key, opts = {}) {
        const obj = objects[key];
        if (!obj) return null;
        const meta = {
          key,
          size: obj.body.length,
          httpEtag: obj.etag || '"etag-1"',
          uploaded: obj.uploaded || new Date('2026-10-01T00:00:00Z'),
          writeHttpMetadata(h) {
            if (obj.contentType) h.set('Content-Type', obj.contentType);
          },
        };
        if (opts.onlyIf && typeof opts.onlyIf.get === 'function') {
          const inm = opts.onlyIf.get('If-None-Match');
          if (inm && inm === meta.httpEtag) return meta;
        }
        if (opts.range && typeof opts.range.get === 'function') {
          const rh = opts.range.get('Range') || '';
          const suffixMatch = /^bytes=-(\d+)$/.exec(rh);
          const stdMatch = /^bytes=(\d+)-(\d*)$/.exec(rh);
          if (suffixMatch) {
            const suffix = Number(suffixMatch[1]);
            return { ...meta, body: obj.body.slice(Math.max(0, obj.body.length - suffix)), range: { suffix } };
          }
          if (stdMatch) {
            const start = Number(stdMatch[1]);
            const end = stdMatch[2] ? Math.min(Number(stdMatch[2]), obj.body.length - 1) : obj.body.length - 1;
            if (start >= obj.body.length || end < start) throw new Error('Range Not Satisfiable');
            return { ...meta, body: obj.body.slice(start, end + 1), range: { offset: start, length: end - start + 1 } };
          }
        }
        return { ...meta, body: obj.body };
      },
      async put(key, body, opts = {}) {
        const buf = body instanceof Uint8Array
          ? Buffer.from(body)
          : Buffer.from(await new Response(body).arrayBuffer());
        objects[key] = { body: buf, contentType: opts.httpMetadata && opts.httpMetadata.contentType, etag: '"put-1"' };
        return { key, size: buf.length, httpEtag: '"put-1"' };
      },
      async delete(keys) {
        for (const k of Array.isArray(keys) ? keys : [keys]) delete objects[k];
      },
      async list({ prefix = '', delimiter } = {}) {
        const matched = Object.keys(objects).filter((k) => k.startsWith(prefix)).sort();
        const delimitedPrefixes = new Set();
        const out = [];
        for (const k of matched) {
          const rest = k.slice(prefix.length);
          if (delimiter && rest.includes(delimiter)) {
            delimitedPrefixes.add(prefix + rest.slice(0, rest.indexOf(delimiter) + 1));
          } else {
            out.push({ key: k, size: objects[k].body.length, uploaded: objects[k].uploaded || new Date('2026-10-01T00:00:00Z'), httpEtag: '"1"' });
          }
        }
        return { objects: out, delimitedPrefixes: [...delimitedPrefixes], truncated: false };
      },
      async createMultipartUpload(key, opts = {}) {
        const uploadId = 'mp-' + (multiparts.size + 1);
        multiparts.set(uploadId, { key, opts, parts: new Map(), aborted: false });
        return { key, uploadId };
      },
      resumeMultipartUpload(key, uploadId) {
        return {
          async uploadPart(partNumber, body) {
            const rec = multiparts.get(uploadId);
            const buf = Buffer.from(await new Response(body).arrayBuffer());
            rec.parts.set(partNumber, buf);
            return { partNumber, etag: `"p${partNumber}"` };
          },
          async complete(parts) {
            const rec = multiparts.get(uploadId);
            const ordered = parts.sort((a, b) => a.partNumber - b.partNumber).map((p) => rec.parts.get(p.partNumber));
            const combined = Buffer.concat(ordered);
            objects[key] = { body: combined, contentType: rec.opts.httpMetadata && rec.opts.httpMetadata.contentType, etag: '"mp-done"' };
            multiparts.delete(uploadId);
            return { key, httpEtag: '"mp-done"' };
          },
          async abort() {
            multiparts.delete(uploadId);
          },
        };
      },
    },
  };
}

const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

test('cacheable static assets return versioned immutable Cache-Control and 304 on ETag match', async () => {
  const { default: worker } = await import('../src/index.js');
  const { APP_VERSION } = await import('../src/config.js');
  const env = createMockEnv();

  const res = await worker.fetch(new Request(`https://dl.glztech.com/assets/app.css?v=${APP_VERSION}`), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Cache-Control'), /immutable/);
  const etag = res.headers.get('ETag');
  assert.ok(etag);

  const cached = await worker.fetch(
    new Request(`https://dl.glztech.com/assets/app.css?v=${APP_VERSION}`, { headers: { 'If-None-Match': etag } }),
    env
  );
  assert.equal(cached.status, 304);
});

test('Android & iOS mobile browsers receive HTML preview page for shared links instead of forced download', async () => {
  const { default: worker } = await import('../src/index.js');
  const env = createMockEnv({
    links: {
      pdf123: JSON.stringify({ key: 'docs/manual.pdf', direct: false }),
      vid123: JSON.stringify({ key: 'clips/demo.mp4', direct: false }),
      img123: JSON.stringify({ key: 'photos/pic.jpg', direct: false }),
    },
    objects: {
      'docs/manual.pdf': { body: Buffer.from('%PDF-1.4 sample'), contentType: 'application/pdf' },
      'clips/demo.mp4': { body: Buffer.from('0000ftypmp42'), contentType: 'video/mp4' },
      'photos/pic.jpg': { body: Buffer.from('jpegbytes'), contentType: 'image/jpeg' },
    },
  });

  for (const ua of [ANDROID_CHROME_UA, IOS_SAFARI_UA]) {
    for (const code of ['pdf123', 'vid123', 'img123']) {
      const req = new Request(`https://dl.glztech.com/${code}`, {
        headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml' },
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('Content-Type') || '', /text\/html/);
      assert.equal(res.headers.get('Content-Disposition'), null);
      const body = await res.text();
      if (code === 'pdf123') {
        assert.equal(body.includes('<iframe src="/pdf123?stream=1'), false);
        assert.ok(body.includes('sharePdfMount'));
        assert.ok(body.includes('renderInlinePdf'));
      }
    }
  }
});

test('?stream=1 always serves inline even on Android mobile and direct:true links', async () => {
  const { default: worker } = await import('../src/index.js');
  const env = createMockEnv({
    links: { dirpdf: JSON.stringify({ key: 'docs/report.pdf', direct: true }) },
    objects: { 'docs/report.pdf': { body: Buffer.from('%PDF-1.4 content'), contentType: 'application/octet-stream' } },
  });
  const res = await worker.fetch(
    new Request('https://dl.glztech.com/dirpdf?stream=1', { headers: { 'User-Agent': ANDROID_CHROME_UA, Accept: '*/*' } }),
    env
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Disposition') || '', /^inline;/);
  assert.equal(res.headers.get('Content-Type'), 'application/pdf');
});

test('GLZTV, OkHttp, Dalvik, Downloader, curl, and direct APK paths still force attachment download', async () => {
  const { default: worker } = await import('../src/index.js');
  const env = createMockEnv({
    links: { app123: JSON.stringify({ key: 'apps/glztv.apk', direct: false }) },
    objects: { 'apps/glztv.apk': { body: Buffer.from('PK\x03\x04apk'), contentType: 'application/octet-stream' } },
  });
  for (const ua of ['GLZ-TV/2.1', 'okhttp/4.12.0', 'Dalvik/2.1.0 (Linux; U; Android 11)', 'Downloader/1.4', 'curl/8.5.0']) {
    const res = await worker.fetch(new Request('https://dl.glztech.com/app123', { headers: { 'User-Agent': ua, Accept: '*/*' } }), env);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Disposition') || '', /^attachment;/);
  }
  for (const p of ['/app123.apk', '/dl/app123', '/apk/app123', '/app123?dl=1']) {
    const res = await worker.fetch(new Request(`https://dl.glztech.com${p}`, { headers: { 'User-Agent': ANDROID_CHROME_UA, Accept: 'text/html' } }), env);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Disposition') || '', /^attachment;/);
  }
});

test('share links manager: custom alias, password protection, maxDownloads, list, and revoke', async () => {
  const { default: worker } = await import('../src/index.js');
  const { makeSessionCookie } = await import('../src/auth.js');
  const env = createMockEnv({
    objects: { 'docs/secret.txt': { body: Buffer.from('classified'), contentType: 'text/plain' } },
  });
  const cookie = (await makeSessionCookie(env.COOKIE_SECRET)).split(';')[0];

  // Create custom slug with password and maxDownloads = 1
  const createRes = await worker.fetch(
    new Request('https://dl.glztech.com/api/share-link', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'https://dl.glztech.com' },
      body: JSON.stringify({ key: 'docs/secret.txt', days: 7, direct: false, slug: 'my-secret', password: 'open-sesame', maxDownloads: 1 }),
    }),
    env
  );
  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.equal(created.code, 'my-secret');
  assert.equal(created.hasPassword, true);
  assert.equal(created.maxDownloads, 1);

  // List share links returns metadata
  const listRes = await worker.fetch(new Request('https://dl.glztech.com/api/share-links', { headers: { Cookie: cookie } }), env);
  const listed = await listRes.json();
  assert.equal(listed.links.length, 1);
  assert.equal(listed.links[0].code, 'my-secret');
  assert.equal(listed.links[0].hasPassword, true);

  // Accessing without unlock cookie shows password gate
  const lockedRes = await worker.fetch(
    new Request('https://dl.glztech.com/my-secret', { headers: { Accept: 'text/html' } }),
    env
  );
  assert.equal(lockedRes.status, 200);
  const lockedHtml = await lockedRes.text();
  assert.ok(lockedHtml.includes('This shared file is password protected'));

  // Unlock with correct password
  const fd = new FormData();
  fd.set('password', 'open-sesame');
  const unlockRes = await worker.fetch(new Request('https://dl.glztech.com/my-secret/unlock', { method: 'POST', body: fd }), env);
  assert.equal(unlockRes.status, 302);
  const unlockCookie = (unlockRes.headers.get('Set-Cookie') || '').split(';')[0];
  assert.ok(unlockCookie.startsWith('glz_unlock_my-secret='));

  // Download once succeeds and consumes the 1-download limit
  const waitPromises = [];
  const dlRes = await worker.fetch(
    new Request('https://dl.glztech.com/my-secret?dl=1', { headers: { Cookie: unlockCookie } }),
    env,
    { waitUntil: (p) => waitPromises.push(p) }
  );
  assert.equal(dlRes.status, 200);
  assert.equal(await dlRes.text(), 'classified');
  await Promise.all(waitPromises);

  // Second attempt should be 404 (auto-deleted upon hitting maxDownloads)
  const secondRes = await worker.fetch(new Request('https://dl.glztech.com/my-secret?dl=1', { headers: { Cookie: unlockCookie } }), env);
  assert.equal(secondRes.status, 404);
});

test('R2 multipart upload, global search, folders list, and bulk delete work end-to-end', async () => {
  const { default: worker } = await import('../src/index.js');
  const { makeSessionCookie } = await import('../src/auth.js');
  const env = createMockEnv({
    objects: {
      'media/clips/intro.mp4': { body: Buffer.from('mp4'), contentType: 'video/mp4' },
      'docs/readme.md': { body: Buffer.from('# hi'), contentType: 'text/markdown' },
    },
  });
  const cookie = (await makeSessionCookie(env.COOKIE_SECRET)).split(';')[0];
  const headers = { Cookie: cookie, Origin: 'https://dl.glztech.com' };

  // Multipart upload lifecycle
  const cRes = await worker.fetch(new Request('https://dl.glztech.com/api/multipart/create', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'big/movie.bin', contentType: 'application/octet-stream' }),
  }), env);
  const { uploadId } = await cRes.json();

  const p1 = await (await worker.fetch(new Request(`https://dl.glztech.com/api/multipart/part?key=big%2Fmovie.bin&uploadId=${uploadId}&partNumber=1`, {
    method: 'PUT',
    headers,
    body: 'hello-',
  }), env)).json();
  const p2 = await (await worker.fetch(new Request(`https://dl.glztech.com/api/multipart/part?key=big%2Fmovie.bin&uploadId=${uploadId}&partNumber=2`, {
    method: 'PUT',
    headers,
    body: 'world',
  }), env)).json();

  const doneRes = await worker.fetch(new Request('https://dl.glztech.com/api/multipart/complete', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'big/movie.bin', uploadId, parts: [p1, p2] }),
  }), env);
  assert.equal(doneRes.status, 200);

  // Global search finds nested file
  const searchRes = await worker.fetch(new Request('https://dl.glztech.com/api/search?q=movie', { headers }), env);
  const searchData = await searchRes.json();
  assert.deepEqual(searchData.files.map((f) => f.key), ['big/movie.bin']);

  // Folders list discovers all prefixes
  const foldersRes = await worker.fetch(new Request('https://dl.glztech.com/api/folders', { headers }), env);
  const foldersData = await foldersRes.json();
  assert.ok(foldersData.folders.includes('media/clips/'));
  assert.ok(foldersData.folders.includes('big/'));

  // Bulk delete removes mixed folder + file
  const delRes = await worker.fetch(new Request('https://dl.glztech.com/api/bulk-delete', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ type: 'folder', path: 'media/' }, { type: 'file', key: 'big/movie.bin' }] }),
  }), env);
  const delData = await delRes.json();
  assert.equal(delData.deleted, 2);
});

test('CSRF cross-origin POST to /api/* is blocked and login rate limiter blocks brute force', async () => {
  const { default: worker } = await import('../src/index.js');
  const { makeSessionCookie } = await import('../src/auth.js');
  const env = createMockEnv();
  const cookie = (await makeSessionCookie(env.COOKIE_SECRET)).split(';')[0];

  const csrfRes = await worker.fetch(new Request('https://dl.glztech.com/api/mkdir', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', name: 'pwn' }),
  }), env);
  assert.equal(csrfRes.status, 403);

  // 6 failed login attempts trigger 429 on 7th
  for (let i = 0; i < 6; i++) {
    const fd = new FormData();
    fd.set('password', 'wrong');
    const r = await worker.fetch(new Request('https://dl.glztech.com/login', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '198.51.100.42' },
      body: fd,
    }), env);
    assert.equal(r.status, 401);
  }
  const fd7 = new FormData();
  fd7.set('password', 'pw');
  const blocked = await worker.fetch(new Request('https://dl.glztech.com/login', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '198.51.100.42' },
    body: fd7,
  }), env);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('Retry-After'));
});

test('authenticated /stream/ supports HEAD, 304, offset range, suffix range, and 416', async () => {
  const { default: worker } = await import('../src/index.js');
  const { makeSessionCookie } = await import('../src/auth.js');
  const payload = Buffer.from('0123456789abcdefghij');
  const env = createMockEnv({
    objects: { 'folder/video.mp4': { body: payload, contentType: 'application/octet-stream', etag: '"v1"' } },
  });
  const cookieHeader = (await makeSessionCookie(env.COOKIE_SECRET)).split(';')[0];

  const headRes = await worker.fetch(new Request('https://dl.glztech.com/stream/folder/video.mp4', { method: 'HEAD', headers: { Cookie: cookieHeader } }), env);
  assert.equal(headRes.status, 200);
  assert.match(headRes.headers.get('Content-Disposition') || '', /^inline;/);
  assert.equal(headRes.headers.get('Content-Type'), 'video/mp4');

  const notModRes = await worker.fetch(new Request('https://dl.glztech.com/stream/folder/video.mp4', { headers: { Cookie: cookieHeader, 'If-None-Match': '"v1"' } }), env);
  assert.equal(notModRes.status, 304);

  const stdRangeRes = await worker.fetch(new Request('https://dl.glztech.com/stream/folder/video.mp4', { headers: { Cookie: cookieHeader, Range: 'bytes=0-4' } }), env);
  assert.equal(stdRangeRes.status, 206);
  assert.equal(stdRangeRes.headers.get('Content-Range'), 'bytes 0-4/20');
  assert.equal(await stdRangeRes.text(), '01234');

  const suffixRangeRes = await worker.fetch(new Request('https://dl.glztech.com/stream/folder/video.mp4', { headers: { Cookie: cookieHeader, Range: 'bytes=-5' } }), env);
  assert.equal(suffixRangeRes.status, 206);
  assert.equal(suffixRangeRes.headers.get('Content-Range'), 'bytes 15-19/20');
  assert.equal(await suffixRangeRes.text(), 'fghij');

  const invalidRangeRes = await worker.fetch(new Request('https://dl.glztech.com/stream/folder/video.mp4', { headers: { Cookie: cookieHeader, Range: 'bytes=50-60' } }), env);
  assert.equal(invalidRangeRes.status, 416);
});

test('publicSharePage inline scripts parse cleanly for every preview type', async () => {
  const { publicSharePage } = await import('../src/pages/share.js');
  const keys = ['video.mp4', 'audio.mp3', 'photo.png', 'doc.pdf', 'notes.txt', 'app.apk', 'archive.zip'];
  for (const key of keys) {
    const html = publicSharePage({ code: 'AbC1234', key, size: 1024, origin: 'https://dl.glztech.com' });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.length >= 1);
    for (const s of scripts) new vm.Script(s);
  }
});

test('shouldUseInlinePdfRenderer detects Android, iOS, and desktop accurately', async () => {
  const { PDF_PREVIEW_SCRIPT } = await import('../src/assets/pdf-viewer.js');
  const fnSrc = PDF_PREVIEW_SCRIPT.match(/function shouldUseInlinePdfRenderer\(\) \{[\s\S]*?\n\}/)[0];

  const ctx = {
    navigator: { userAgent: ANDROID_CHROME_UA, maxTouchPoints: 5, pdfViewerEnabled: false },
    window: { innerWidth: 390 },
  };
  vm.runInNewContext(fnSrc, ctx);
  assert.equal(ctx.shouldUseInlinePdfRenderer(), true);

  ctx.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0', maxTouchPoints: 0, pdfViewerEnabled: true };
  ctx.window = { innerWidth: 1440 };
  assert.equal(ctx.shouldUseInlinePdfRenderer(), false);

  ctx.navigator = { userAgent: IOS_SAFARI_UA, maxTouchPoints: 5, pdfViewerEnabled: true };
  ctx.window = { innerWidth: 390 };
  assert.equal(ctx.shouldUseInlinePdfRenderer(), true);
});
