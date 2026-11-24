import {
  APP_VERSION,
  RESERVED_WORDS,
  normalizePrefix,
  safeDecodePath,
  validateSegmentName
} from "./config.js";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  clearSessionCookie,
  isAuthed,
  isShareUnlocked,
  makeSessionCookie,
  makeShareUnlockCookie,
  recordLoginFailure,
  safeEqual,
  verifySameOrigin,
  verifySharePassword
} from "./auth.js";
import {
  batchDelete,
  copyObject,
  listAllFolders,
  listAllKeysUnderPrefix,
  listFolder,
  moveItems,
  r2Client,
  runWithConcurrency,
  searchObjects,
  serveR2Object
} from "./r2.js";
import {
  createShareLink,
  listShareLinks,
  recordLinkDownload,
  revokeShareLink
} from "./links.js";
import { APP_CSS, LOGIN_CSS, SHARE_CSS } from "./assets/styles.js";
import { APP_JS } from "./assets/client.js";
import { browserPage } from "./pages/explorer.js";
import { loginPage, sharePasswordPage } from "./pages/login.js";
import { publicSharePage } from "./pages/share.js";

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

const STATIC_ASSETS = {
  "/assets/app.css": { body: APP_CSS, type: "text/css; charset=utf-8", tag: `"v${APP_VERSION}-app-css"` },
  "/assets/app.js": { body: APP_JS, type: "application/javascript; charset=utf-8", tag: `"v${APP_VERSION}-app-js"` },
  "/assets/login.css": { body: LOGIN_CSS, type: "text/css; charset=utf-8", tag: `"v${APP_VERSION}-login-css"` },
  "/assets/share.css": { body: SHARE_CSS, type: "text/css; charset=utf-8", tag: `"v${APP_VERSION}-share-css"` }
};

function serveAsset(request, url) {
  const asset = STATIC_ASSETS[url.pathname];
  if (!asset) return null;
  const isVersioned = url.searchParams.get("v") === APP_VERSION;
  const headers = {
    "Content-Type": asset.type,
    ETag: asset.tag,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": isVersioned ? "public, max-age=31536000, immutable" : "public, max-age=300, must-revalidate"
  };
  if (request.headers.get("If-None-Match") === asset.tag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === "HEAD" ? null : asset.body, { status: 200, headers });
}

function shouldCountDownload(request) {
  if (request.method !== "GET") return false;
  const range = request.headers.get("Range");
  if (!range) return true;
  return /^bytes=0-/.test(range.trim());
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Cacheable Static Assets
    if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/assets/")) {
      const assetRes = serveAsset(request, url);
      if (assetRes) return assetRes;
      return new Response("Not found", { status: 404 });
    }

    // 2. Authentication
    if (path === "/login" && request.method === "GET") {
      return html(loginPage());
    }
    if (path === "/login" && request.method === "POST") {
      const rl = await checkLoginRateLimit(request, env);
      if (rl.blocked) {
        return html(
          loginPage(`Too many failed attempts. Please try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).`),
          429,
          { "Retry-After": String(rl.retryAfter) }
        );
      }
      const form = await request.formData();
      const password = String(form.get("password") || "");
      if (safeEqual(password, env.AUTH_PASSWORD)) {
        await clearLoginFailures(request, env);
        const cookie = await makeSessionCookie(env.COOKIE_SECRET);
        return new Response(null, {
          status: 302,
          headers: { Location: "/", "Set-Cookie": cookie }
        });
      }
      await recordLoginFailure(request, env);
      return html(loginPage("Wrong password. Please try again."), 401);
    }
    if (path === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login", "Set-Cookie": clearSessionCookie() }
      });
    }

    // 3. Share Link Password Unlock
    const unlockMatch = request.method === "POST" && path.match(/^\/([A-Za-z0-9_-]{3,32})\/unlock$/);
    if (unlockMatch && !RESERVED_WORDS.has(unlockMatch[1].toLowerCase())) {
      const code = unlockMatch[1];
      const raw = await env.LINKS.get(code);
      if (!raw) return new Response("Shared link has expired or does not exist.", { status: 404 });
      const data = JSON.parse(raw);
      const fileName = (data.key || "file").split("/").pop() || "file";
      const form = await request.formData();
      const password = String(form.get("password") || "");
      if (data.passwordHash && (await verifySharePassword(password, data.passwordHash))) {
        const cookie = await makeShareUnlockCookie(code, env.COOKIE_SECRET);
        return new Response(null, {
          status: 302,
          headers: { Location: `/${code}${data.direct ? "?page=1" : ""}`, "Set-Cookie": cookie }
        });
      }
      return html(sharePasswordPage({ code, fileName, error: "Incorrect password. Please try again." }), 401);
    }

    // 4. Public Short Links
    const shortLinkMatch =
      (request.method === "GET" || request.method === "HEAD") &&
      path.match(/^\/(?:dl\/|apk\/)?([A-Za-z0-9_-]{3,32})(?:\.([a-zA-Z0-9]+)|\/([^\/]+))?$/);
    if (
      shortLinkMatch &&
      !RESERVED_WORDS.has(shortLinkMatch[1].toLowerCase()) &&
      !shortLinkMatch[1].startsWith("_rl")
    ) {
      const code = shortLinkMatch[1];
      const pathExt = (shortLinkMatch[2] || "").toLowerCase();
      const pathSubfile = (shortLinkMatch[3] || "").toLowerCase();
      const raw = await env.LINKS.get(code);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const key = data.key;
          const fileName = key.split("/").pop() || "file";

          if (data.maxDownloads && (data.downloads || 0) >= data.maxDownloads) {
            return new Response("This shared link has reached its maximum download limit.", { status: 410 });
          }

          if (data.passwordHash) {
            const unlocked = await isShareUnlocked(request, code, env.COOKIE_SECRET);
            if (!unlocked) {
              const accept = (request.headers.get("Accept") || "").toLowerCase();
              const wantsHtml = accept.includes("text/html") || accept.includes("application/xhtml+xml");
              if (wantsHtml && request.method === "GET") {
                return html(sharePasswordPage({ code, fileName }), 200, { Vary: "Cookie, Accept" });
              }
              return new Response("Password required to access this link.", { status: 401 });
            }
          }

          const isApk = key.toLowerCase().endsWith(".apk") || pathExt === "apk" || pathSubfile.endsWith(".apk");
          const userAgent = (request.headers.get("User-Agent") || "").toLowerCase();
          const accept = (request.headers.get("Accept") || "").toLowerCase();
          const isBrowserHtml = accept.includes("text/html") || accept.includes("application/xhtml+xml");
          const isDownloaderClient =
            userAgent.includes("glz-tv") ||
            userAgent.includes("okhttp") ||
            userAgent.includes("dalvik") ||
            userAgent.includes("downloader") ||
            userAgent.includes("curl") ||
            userAgent.includes("wget") ||
            userAgent.includes("aria2") ||
            userAgent.includes("python-requests");
          const isExplicitDownload =
            url.searchParams.get("dl") === "1" ||
            url.searchParams.get("download") === "1" ||
            url.searchParams.get("direct") === "1";
          const isExplicitStream = url.searchParams.get("stream") === "1" || url.searchParams.get("raw") === "1";
          const isExplicitPage = url.searchParams.get("page") === "1" || url.searchParams.get("preview") === "1";
          const isPathDirect =
            path.startsWith("/dl/") || path.startsWith("/apk/") || pathExt === "apk" || Boolean(shortLinkMatch[3]);

          const trackDl = () => {
            if (!shouldCountDownload(request)) return;
            const promise = recordLinkDownload(env, code, data);
            if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(promise);
          };

          if (isExplicitDownload) {
            const res = await serveR2Object(request, env, key, { inline: false, isPublic: !data.passwordHash });
            if (res.status === 200 || res.status === 206) trackDl();
            return res;
          }
          if (isExplicitStream) {
            return serveR2Object(request, env, key, { inline: true, isPublic: !data.passwordHash });
          }

          const serveDirect =
            isPathDirect ||
            (!isExplicitPage && (data.direct === true || isDownloaderClient || (!isBrowserHtml && isApk)));
          if (serveDirect) {
            const res = await serveR2Object(request, env, key, { inline: false, isPublic: !data.passwordHash });
            if (res.status === 200 || res.status === 206) trackDl();
            const headers = new Headers(res.headers);
            headers.set("Vary", "Accept, User-Agent");
            return new Response(res.body, { status: res.status, headers });
          }

          if (request.method === "HEAD") {
            const head2 = await env.BUCKET.head(key);
            if (!head2) return new Response("File not found", { status: 404 });
            return new Response(null, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                Vary: "Accept, User-Agent"
              }
            });
          }

          const head = await env.BUCKET.head(key);
          if (!head) {
            return new Response("The requested shared file was deleted or does not exist in storage.", { status: 404 });
          }

          return html(
            publicSharePage({
              code,
              key,
              size: head.size,
              uploaded: head.uploaded ? head.uploaded.toISOString() : null,
              expiresAt: data.expiresAt || null,
              direct: Boolean(data.direct),
              origin: url.origin,
              downloads: data.downloads || 0,
              maxDownloads: data.maxDownloads || null
            }),
            200,
            { Vary: "Accept, User-Agent" }
          );
        } catch (err) {
          return new Response("Invalid short link data: " + err.message, { status: 500 });
        }
      }
      return new Response("Shared link has expired or does not exist.", { status: 404 });
    }

    // 5. Public Static Prefixes (/public/*, /apks/*)
    if ((request.method === "GET" || request.method === "HEAD") && (path.startsWith("/public/") || path.startsWith("/apks/"))) {
      const rawSubpath = safeDecodePath(path.slice(1));
      if (rawSubpath === null) return new Response("Bad Request", { status: 400 });
      let head = await env.BUCKET.head(rawSubpath);
      let targetKey = rawSubpath;
      if (!head && path.startsWith("/public/")) {
        const trimmed = safeDecodePath(path.slice("/public/".length));
        if (trimmed !== null) {
          const altHead = await env.BUCKET.head(trimmed);
          if (altHead) {
            head = altHead;
            targetKey = trimmed;
          }
        }
      }
      if (head) {
        return serveR2Object(request, env, targetKey, { inline: false, isPublic: true });
      }
      return new Response("File not found in public storage.", { status: 404 });
    }

    // 6. Auth Gate
    if (!(await isAuthed(request, env.COOKIE_SECRET))) {
      if (path.startsWith("/api/")) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response(null, { status: 302, headers: { Location: "/login" } });
    }

    // CSRF Origin guard for mutating API routes
    if (path.startsWith("/api/") && !verifySameOrigin(request)) {
      return new Response("Cross-origin request blocked", { status: 403 });
    }

    // 7. Explorer Page & Authenticated Media/Downloads
    if (path === "/" && request.method === "GET") {
      const prefix = normalizePrefix(url.searchParams.get("prefix") || "");
      const { folders, files } = await listFolder(env, prefix);
      return html(browserPage({ prefix, folders, files }));
    }

    if ((path.startsWith("/stream/") || path.startsWith("/preview/")) && (request.method === "GET" || request.method === "HEAD")) {
      const prefixToRemove = path.startsWith("/stream/") ? "/stream/" : "/preview/";
      const key = safeDecodePath(path.slice(prefixToRemove.length));
      if (key === null) return new Response("Bad Request", { status: 400 });
      return serveR2Object(request, env, key, { inline: true, isPublic: false });
    }

    if (path.startsWith("/download/") && (request.method === "GET" || request.method === "HEAD")) {
      const key = safeDecodePath(path.slice("/download/".length));
      if (key === null) return new Response("Bad Request", { status: 400 });
      return serveR2Object(request, env, key, { inline: false, isPublic: false });
    }

    // 8. Authenticated API Routes
    if (path === "/api/list" && request.method === "GET") {
      const prefix = normalizePrefix(url.searchParams.get("prefix") || "");
      return json(await listFolder(env, prefix));
    }

    if (path === "/api/folders" && request.method === "GET") {
      const folders = await listAllFolders(env);
      return json({ folders });
    }

    if (path === "/api/search" && request.method === "GET") {
      const q = url.searchParams.get("q") || "";
      const prefix = normalizePrefix(url.searchParams.get("prefix") || "");
      return json(await searchObjects(env, q, { prefix }));
    }

    if (path === "/api/mkdir" && request.method === "POST") {
      const { prefix = "", name } = await request.json();
      const cleanName = validateSegmentName(name);
      if (!cleanName) return new Response("Invalid folder name", { status: 400 });
      const key = `${normalizePrefix(prefix)}${cleanName}/.keep`;
      await env.BUCKET.put(key, new Uint8Array(0), {
        httpMetadata: { contentType: "text/plain" }
      });
      return json({ ok: true, key });
    }

    if (path === "/api/upload-url" && request.method === "POST") {
      const { key, contentType } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
      if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
        return new Response("Direct presigned upload not configured", { status: 501 });
      }
      const client = r2Client(env);
      const endpoint = new URL(
        `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`
      );
      endpoint.searchParams.set("X-Amz-Expires", "900");
      const signedRequest = await client.sign(
        new Request(endpoint, {
          method: "PUT",
          headers: contentType ? { "Content-Type": contentType } : {}
        }),
        { aws: { signQuery: true, service: "s3" } }
      );
      return json({ url: signedRequest.url });
    }

    if (path === "/api/upload-direct" && request.method === "PUT") {
      const key = url.searchParams.get("key");
      if (!key) return new Response("Missing key", { status: 400 });
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const body = request.headers.has("Content-Length") ? request.body : await request.arrayBuffer();
      await env.BUCKET.put(key, body, { httpMetadata: { contentType } });
      return json({ ok: true, key });
    }

    // R2 Multipart Uploads
    if (path === "/api/multipart/create" && request.method === "POST") {
      const { key, contentType } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
      const upload = await env.BUCKET.createMultipartUpload(key, {
        httpMetadata: { contentType: contentType || "application/octet-stream" }
      });
      return json({ key: upload.key, uploadId: upload.uploadId });
    }

    if (path === "/api/multipart/part" && request.method === "PUT") {
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      const partNumber = Number(url.searchParams.get("partNumber"));
      if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
        return new Response("Missing or invalid multipart parameters", { status: 400 });
      }
      const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
      const body = request.headers.has("Content-Length") ? request.body : await request.arrayBuffer();
      const uploadedPart = await upload.uploadPart(partNumber, body);
      return json({ partNumber: uploadedPart.partNumber, etag: uploadedPart.etag });
    }

    if (path === "/api/multipart/complete" && request.method === "POST") {
      const { key, uploadId, parts } = await request.json();
      if (!key || !uploadId || !Array.isArray(parts) || !parts.length) {
        return new Response("Missing multipart completion data", { status: 400 });
      }
      const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
      const obj = await upload.complete(parts);
      return json({ ok: true, key: obj.key, etag: obj.httpEtag });
    }

    if (path === "/api/multipart/abort" && request.method === "POST") {
      const { key, uploadId } = await request.json();
      if (!key || !uploadId) return new Response("Missing key/uploadId", { status: 400 });
      try {
        await env.BUCKET.resumeMultipartUpload(key, uploadId).abort();
      } catch {}
      return new Response(null, { status: 204 });
    }

    // File & Folder Mutations
    if (path === "/api/delete" && request.method === "POST") {
      const { key } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
      await env.BUCKET.delete(key);
      return new Response(null, { status: 204 });
    }

    if (path === "/api/bulk-delete" && request.method === "POST") {
      const { items } = await request.json();
      if (!Array.isArray(items) || !items.length) {
        return new Response("Missing items", { status: 400 });
      }
      const keysToDelete = new Set();
      for (const item of items) {
        if (item.type === "file" && item.key) {
          keysToDelete.add(item.key);
        } else if (item.type === "folder" && item.path) {
          const keys = await listAllKeysUnderPrefix(env, normalizePrefix(item.path));
          keys.forEach((k) => keysToDelete.add(k));
        }
      }
      const list = Array.from(keysToDelete);
      if (list.length) await batchDelete(env, list);
      return json({ deleted: list.length });
    }

    if (path === "/api/rename" && request.method === "POST") {
      const { oldKey, newKey } = await request.json();
      if (!oldKey || !newKey) return new Response("Missing oldKey/newKey", { status: 400 });
      const newSeg = validateSegmentName(newKey.split("/").pop());
      if (!newSeg) return new Response("Invalid filename", { status: 400 });
      if (oldKey === newKey) return new Response(null, { status: 204 });
      const ok = await copyObject(r2Client(env), env, oldKey, newKey);
      if (!ok) return new Response("Rename (copy step) failed", { status: 502 });
      await env.BUCKET.delete(oldKey);
      return new Response(null, { status: 204 });
    }

    if (path === "/api/delete-folder" && request.method === "POST") {
      const { prefix } = await request.json();
      if (!prefix) return new Response("Missing prefix", { status: 400 });
      const keys = await listAllKeysUnderPrefix(env, normalizePrefix(prefix));
      await batchDelete(env, keys);
      return json({ deleted: keys.length });
    }

    if (path === "/api/rename-folder" && request.method === "POST") {
      const { oldPrefix, newPrefix } = await request.json();
      if (!oldPrefix || !newPrefix) return new Response("Missing oldPrefix/newPrefix", { status: 400 });
      const cleanOld = normalizePrefix(oldPrefix);
      const cleanNew = normalizePrefix(newPrefix);
      const newSeg = validateSegmentName(cleanNew.replace(/\/$/, "").split("/").pop());
      if (!newSeg) return new Response("Invalid folder name", { status: 400 });
      if (cleanOld === cleanNew) return new Response(null, { status: 204 });
      const keys = await listAllKeysUnderPrefix(env, cleanOld);
      const client = r2Client(env);
      const failed = [];
      await runWithConcurrency(keys, 8, async (oldKey) => {
        const newKey = cleanNew + oldKey.slice(cleanOld.length);
        const ok = await copyObject(client, env, oldKey, newKey);
        if (!ok) failed.push(oldKey);
      });
      if (failed.length) {
        return new Response(`Failed to move ${failed.length} of ${keys.length} item(s)`, { status: 502 });
      }
      await batchDelete(env, keys);
      return json({ moved: keys.length });
    }

    if (path === "/api/move" && request.method === "POST") {
      const { items, targetPrefix = "" } = await request.json();
      if (!Array.isArray(items) || !items.length) {
        return new Response("Missing items", { status: 400 });
      }
      try {
        const res = await moveItems(env, items, normalizePrefix(targetPrefix));
        return json(res);
      } catch (err) {
        return new Response(err.message || "Move failed", { status: 400 });
      }
    }

    // Share Links API
    if (path === "/api/share-link" && request.method === "POST") {
      try {
        const body = await request.json();
        const result = await createShareLink(env, url.origin, body);
        return json(result);
      } catch (err) {
        return new Response(err.message || "Could not create share link", { status: 400 });
      }
    }

    if (path === "/api/share-links" && request.method === "GET") {
      const links = await listShareLinks(env, url.origin);
      return json({ links });
    }

    if (path === "/api/share-links/revoke" && request.method === "POST") {
      const { code } = await request.json();
      if (!code) return new Response("Missing code", { status: 400 });
      await revokeShareLink(env, code);
      return new Response(null, { status: 204 });
    }

    return new Response("Not found", { status: 404 });
  }
};
