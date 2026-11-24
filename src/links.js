import { validateSlug } from "./config.js";
import { hashSharePassword } from "./auth.js";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function randomCode(len = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function buildMetadata(linkData) {
  // Keep KV metadata compact (must serialize under 1024 bytes)
  const key = String(linkData.key || "");
  return {
    key: key.length > 300 ? key.slice(0, 300) : key,
    direct: Boolean(linkData.direct),
    isApk: Boolean(linkData.isApk),
    hasPassword: Boolean(linkData.passwordHash),
    maxDownloads: linkData.maxDownloads || null,
    downloads: linkData.downloads || 0,
    expiresAt: linkData.expiresAt || null,
    createdAt: linkData.createdAt || Date.now()
  };
}

export async function createShareLink(env, origin, { key, days, direct, slug, password, maxDownloads }) {
  if (!key) throw new Error("Missing key");
  const numDays = Number(days);
  const isPermanent = days === 0 || days === "0" || days === "permanent" || days === null || days === "";
  const ttlDays = isPermanent ? 0 : numDays > 0 ? numDays : 7;
  const ttlSeconds = isPermanent ? null : Math.max(60, Math.round(ttlDays * 24 * 60 * 60));

  let code;
  if (slug && String(slug).trim()) {
    const cleanSlug = validateSlug(String(slug));
    if (!cleanSlug) {
      throw new Error("Custom alias must be 3-32 characters (letters, numbers, - or _) and not reserved.");
    }
    const existing = await env.LINKS.get(cleanSlug);
    if (existing) {
      throw new Error(`Alias "/${cleanSlug}" is already in use.`);
    }
    code = cleanSlug;
  } else {
    code = randomCode();
    while (await env.LINKS.get(code)) {
      code = randomCode();
    }
  }

  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  const isApk = key.toLowerCase().endsWith(".apk");
  const isDirect = direct !== undefined ? Boolean(direct) : isApk;
  const parsedMax = Number(maxDownloads);
  const maxDl = Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : null;
  const passwordHash = password && String(password).length > 0 ? await hashSharePassword(String(password)) : null;

  const linkData = {
    key,
    expiresAt,
    direct: isDirect,
    isApk,
    passwordHash,
    maxDownloads: maxDl,
    downloads: 0,
    createdAt: Date.now()
  };

  const putOptions = { metadata: buildMetadata(linkData) };
  if (ttlSeconds) putOptions.expirationTtl = ttlSeconds;
  await env.LINKS.put(code, JSON.stringify(linkData), putOptions);

  const filename = key.split("/").pop() || "file";
  const shareUrl = `${origin}/${code}${isDirect ? "?page=1" : ""}`;
  const directUrl = `${origin}/${code}${isApk ? ".apk" : "?dl=1"}`;
  const rawDirectUrl = `${origin}/${code}`;

  return {
    url: isDirect ? directUrl : shareUrl,
    code,
    shareUrl,
    directUrl,
    rawDirectUrl,
    expiresAt,
    direct: isDirect,
    isApk,
    hasPassword: Boolean(passwordHash),
    maxDownloads: maxDl,
    downloads: 0,
    filename
  };
}

export async function listShareLinks(env, origin) {
  if (!env.LINKS || typeof env.LINKS.list !== "function") {
    return [];
  }
  const items = [];
  let cursor;
  let pages = 0;

  do {
    const res = await env.LINKS.list({ cursor, limit: 1000 });
    for (const entry of res.keys || []) {
      if (entry.name.startsWith("_rl:")) continue;
      let meta = entry.metadata;
      if (!meta) {
        // Legacy link created before metadata support
        try {
          const raw = await env.LINKS.get(entry.name);
          if (raw) {
            const parsed = JSON.parse(raw);
            meta = buildMetadata(parsed);
          }
        } catch {}
      }
      if (!meta || !meta.key) continue;
      const isApk = Boolean(meta.isApk || String(meta.key).toLowerCase().endsWith(".apk"));
      const isDirect = Boolean(meta.direct);
      const code = entry.name;
      const filename = String(meta.key).split("/").pop() || "file";
      items.push({
        code,
        key: meta.key,
        filename,
        direct: isDirect,
        isApk,
        hasPassword: Boolean(meta.hasPassword),
        maxDownloads: meta.maxDownloads || null,
        downloads: meta.downloads || 0,
        expiresAt: meta.expiresAt || (entry.expiration ? entry.expiration * 1000 : null),
        createdAt: meta.createdAt || null,
        shareUrl: `${origin}/${code}${isDirect ? "?page=1" : ""}`,
        directUrl: `${origin}/${code}${isApk ? ".apk" : "?dl=1"}`
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
    pages++;
  } while (cursor && pages < 5);

  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function revokeShareLink(env, code) {
  if (!code || code.startsWith("_rl:")) return false;
  await env.LINKS.delete(code);
  return true;
}

export async function recordLinkDownload(env, code, data) {
  try {
    const updated = {
      ...data,
      downloads: (data.downloads || 0) + 1
    };
    if (updated.maxDownloads && updated.downloads >= updated.maxDownloads) {
      await env.LINKS.delete(code);
      return;
    }
    const putOptions = { metadata: buildMetadata(updated) };
    if (updated.expiresAt) {
      const remainingSec = Math.floor((updated.expiresAt - Date.now()) / 1000);
      if (remainingSec < 60) {
        // Too close to expiration for KV put; skip updating counter
        return;
      }
      putOptions.expiration = Math.floor(updated.expiresAt / 1000);
    }
    await env.LINKS.put(code, JSON.stringify(updated), putOptions);
  } catch {
    // Gracefully tolerate KV 1-write-per-second rate limits on hot links
  }
}
