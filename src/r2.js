import { AwsClient } from "./aws4.js";
import { getMimeType } from "./config.js";

export function r2Client(env) {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto"
  });
}

export async function listFolder(env, prefix = "") {
  let cursor;
  let pages = 0;
  const allObjects = [];
  const allDelimited = new Set();
  do {
    const listing = await env.BUCKET.list({
      prefix,
      delimiter: "/",
      cursor,
      limit: 1000
    });
    for (const p of listing.delimitedPrefixes || []) {
      allDelimited.add(p);
    }
    for (const o of listing.objects || []) {
      if (!o.key.endsWith("/.keep")) {
        allObjects.push({
          key: o.key,
          size: o.size,
          uploaded: o.uploaded ? o.uploaded.toISOString() : null,
          httpEtag: o.httpEtag
        });
      }
    }
    cursor = listing.truncated ? listing.cursor : undefined;
    pages++;
  } while (cursor && pages < 10);

  const folders = Array.from(allDelimited).sort();
  const files = allObjects.sort((a, b) => a.key.localeCompare(b.key));
  return { prefix, folders, files };
}

export async function listAllKeysUnderPrefix(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const res = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    keys.push(...(res.objects || []).map((o) => o.key));
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function listAllFolders(env) {
  const folderSet = new Set([""]);
  let cursor;
  let pages = 0;
  do {
    const res = await env.BUCKET.list({ cursor, limit: 1000 });
    for (const o of res.objects || []) {
      const parts = o.key.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc += parts[i] + "/";
        folderSet.add(acc);
      }
    }
    cursor = res.truncated ? res.cursor : undefined;
    pages++;
  } while (cursor && pages < 10);
  return Array.from(folderSet).sort();
}

export async function searchObjects(env, query, { prefix = "", limit = 200 } = {}) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { query: "", folders: [], files: [], truncated: false };
  const matchedFiles = [];
  const matchedFolders = new Set();
  let cursor;
  let pages = 0;
  let hitLimit = false;

  do {
    const res = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    for (const o of res.objects || []) {
      const parts = o.key.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc += parts[i] + "/";
        if (parts[i].toLowerCase().includes(q)) {
          matchedFolders.add(acc);
        }
      }
      if (!o.key.endsWith("/.keep")) {
        const name = parts[parts.length - 1] || o.key;
        if (name.toLowerCase().includes(q) || o.key.toLowerCase().includes(q)) {
          matchedFiles.push({
            key: o.key,
            size: o.size,
            uploaded: o.uploaded ? o.uploaded.toISOString() : null,
            httpEtag: o.httpEtag
          });
          if (matchedFiles.length >= limit) {
            hitLimit = true;
            break;
          }
        }
      }
    }
    cursor = !hitLimit && res.truncated ? res.cursor : undefined;
    pages++;
  } while (cursor && pages < 10);

  return {
    query,
    folders: Array.from(matchedFolders).sort().slice(0, 100),
    files: matchedFiles.sort((a, b) => a.key.localeCompare(b.key)),
    truncated: hitLimit || Boolean(cursor)
  };
}

export async function copyObject(client, env, oldKey, newKey) {
  const encode = (k) => k.split("/").map(encodeURIComponent).join("/");
  const destUrl = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${encode(newKey)}`;
  const copySource = `/${env.R2_BUCKET_NAME}/${encode(oldKey)}`;
  const res = await client.fetch(destUrl, {
    method: "PUT",
    headers: { "x-amz-copy-source": copySource }
  });
  return res.ok;
}

export async function runWithConcurrency(items, limit, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function batchDelete(env, keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    await env.BUCKET.delete(keys.slice(i, i + 1000));
  }
}

export async function moveItems(env, items, targetPrefix) {
  const dest = targetPrefix && !targetPrefix.endsWith("/") ? `${targetPrefix}/` : targetPrefix || "";
  const client = r2Client(env);
  const ops = [];

  for (const item of items) {
    if (!item || !item.type) continue;
    if (item.type === "file" && item.key) {
      const name = item.key.split("/").pop();
      const newKey = dest + name;
      if (newKey !== item.key) {
        ops.push({ oldKey: item.key, newKey });
      }
    } else if (item.type === "folder" && item.path) {
      const oldPrefix = item.path.endsWith("/") ? item.path : `${item.path}/`;
      if (dest === oldPrefix || dest.startsWith(oldPrefix)) {
        throw new Error(`Cannot move folder "${oldPrefix}" into itself.`);
      }
      const folderName = oldPrefix.replace(/\/$/, "").split("/").pop();
      const newPrefix = `${dest}${folderName}/`;
      if (newPrefix === oldPrefix) continue;
      const keys = await listAllKeysUnderPrefix(env, oldPrefix);
      for (const oldKey of keys) {
        ops.push({ oldKey, newKey: newPrefix + oldKey.slice(oldPrefix.length) });
      }
    }
  }

  if (!ops.length) return { moved: 0 };

  const failed = [];
  await runWithConcurrency(ops, 8, async ({ oldKey, newKey }) => {
    const ok = await copyObject(client, env, oldKey, newKey);
    if (!ok) failed.push(oldKey);
  });

  if (failed.length) {
    throw new Error(`Failed to copy ${failed.length} of ${ops.length} object(s).`);
  }

  await batchDelete(env, ops.map((o) => o.oldKey));
  return { moved: ops.length };
}

export function buildR2Headers(meta, filename, { inline = false, isPublic = false } = {}) {
  const headers = new Headers();
  if (typeof meta.writeHttpMetadata === "function") {
    meta.writeHttpMetadata(headers);
  }
  if (meta.httpEtag) headers.set("ETag", meta.httpEtag);
  if (meta.uploaded) headers.set("Last-Modified", meta.uploaded.toUTCString());
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  const isApk = filename.toLowerCase().endsWith(".apk");
  const disposition = inline ? "inline" : "attachment";
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  if (isApk) {
    headers.set("Content-Type", "application/vnd.android.package-archive");
  } else {
    const existingType = (headers.get("Content-Type") || "").toLowerCase();
    if (!existingType || existingType === "application/octet-stream" || existingType === "binary/octet-stream") {
      headers.set("Content-Type", getMimeType(filename));
    }
  }
  headers.set("Cache-Control", `${isPublic ? "public" : "private"}, max-age=300, must-revalidate`);
  return headers;
}

export async function serveR2Object(request, env, key, { inline = false, isPublic = false } = {}) {
  const isHead = request.method === "HEAD";
  const rangeHeader = request.headers.get("Range");
  const filename = key.split("/").pop() || "file";

  if (isHead) {
    const head = await env.BUCKET.head(key);
    if (!head) return new Response("Not found", { status: 404 });
    const headers = buildR2Headers(head, filename, { inline, isPublic });
    headers.set("Content-Length", String(head.size));
    return new Response(null, { status: 200, headers });
  }

  let object;
  try {
    object = await env.BUCKET.get(key, {
      range: rangeHeader ? request.headers : undefined,
      onlyIf: rangeHeader ? undefined : request.headers
    });
  } catch (err) {
    if (rangeHeader) {
      const head = await env.BUCKET.head(key);
      if (!head) return new Response("Not found", { status: 404 });
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${head.size}`, "Accept-Ranges": "bytes" }
      });
    }
    throw err;
  }

  if (!object) return new Response("Not found", { status: 404 });

  const headers = buildR2Headers(object, filename, { inline, isPublic });
  if (!("body" in object) || !object.body) {
    const hasNotModifiedCond = request.headers.has("If-None-Match") || request.headers.has("If-Modified-Since");
    const hasPrecond = request.headers.has("If-Match") || request.headers.has("If-Unmodified-Since");
    const condStatus = !hasNotModifiedCond && hasPrecond ? 412 : 304;
    return new Response(null, { status: condStatus, headers });
  }

  if (object.range && object.size > 0) {
    let offset;
    let length;
    if ("suffix" in object.range && object.range.suffix !== undefined) {
      length = Math.min(object.range.suffix, object.size);
      offset = object.size - length;
    } else {
      offset = object.range.offset ?? 0;
      length = object.range.length ?? object.size - offset;
    }
    if (offset < 0 || offset >= object.size || length <= 0) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${object.size}`, "Accept-Ranges": "bytes" }
      });
    }
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}
