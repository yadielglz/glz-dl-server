import { COOKIE_NAME, SESSION_DAYS } from "./config.js";

const encoder = new TextEncoder();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LOGIN_ATTEMPTS = 6;
const memoryRateMap = new Map();

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeSessionCookie(secret) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const key = await hmacKey(secret);
  const sig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  const value = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export async function isAuthed(request, secret) {
  if (!secret) return false;
  const value = getCookie(request, COOKIE_NAME);
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;
  const key = await hmacKey(secret);
  const expectedSig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  if (expectedSig.length !== sig.length) return false;
  return safeEqual(expectedSig, sig);
}

// ---------------- Share Link Password Helpers ----------------
export async function hashSharePassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toHex(saltBytes);
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${password}`));
  return `${salt}:${toHex(digest)}`;
}

export async function verifySharePassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${password}`));
  return safeEqual(toHex(digest), expectedHex);
}

export async function makeShareUnlockCookie(code, secret) {
  const expires = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const payload = `${code}.${expires}`;
  const key = await hmacKey(secret || "glz-share-fallback");
  const sig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `glz_unlock_${code}=${expires}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${12 * 60 * 60}`;
}

export async function isShareUnlocked(request, code, secret) {
  const value = getCookie(request, `glz_unlock_${code}`);
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  const key = await hmacKey(secret || "glz-share-fallback");
  const expectedSig = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${code}.${expires}`)));
  return safeEqual(expectedSig, sig);
}

// ---------------- Login Brute-Force Rate Limiting ----------------
async function clientRateKey(request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    "unknown";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`rl:${ip}`));
  return `_rl:${toHex(digest).slice(0, 24)}`;
}

export async function checkLoginRateLimit(request, env) {
  const key = await clientRateKey(request);
  const now = Date.now();
  const mem = memoryRateMap.get(key);
  if (mem && mem.resetAt > now && mem.count >= MAX_LOGIN_ATTEMPTS) {
    return { blocked: true, retryAfter: Math.max(1, Math.ceil((mem.resetAt - now) / 1000)) };
  }
  if (env && env.LINKS && typeof env.LINKS.get === "function") {
    try {
      const raw = await env.LINKS.get(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.resetAt > now && parsed.count >= MAX_LOGIN_ATTEMPTS) {
          memoryRateMap.set(key, parsed);
          return { blocked: true, retryAfter: Math.max(1, Math.ceil((parsed.resetAt - now) / 1000)) };
        }
      }
    } catch {}
  }
  return { blocked: false, retryAfter: 0 };
}

export async function recordLoginFailure(request, env) {
  const key = await clientRateKey(request);
  const now = Date.now();
  let state = memoryRateMap.get(key);
  if (!state || state.resetAt <= now) {
    state = { count: 0, resetAt: now + RATE_WINDOW_MS };
    if (env && env.LINKS && typeof env.LINKS.get === "function") {
      try {
        const raw = await env.LINKS.get(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.resetAt > now) state = parsed;
        }
      } catch {}
    }
  }
  state.count += 1;
  memoryRateMap.set(key, state);
  if (env && env.LINKS && typeof env.LINKS.put === "function") {
    try {
      const ttl = Math.max(60, Math.ceil((state.resetAt - now) / 1000));
      await env.LINKS.put(key, JSON.stringify(state), { expirationTtl: ttl });
    } catch {}
  }
  return state;
}

export async function clearLoginFailures(request, env) {
  const key = await clientRateKey(request);
  memoryRateMap.delete(key);
  if (env && env.LINKS && typeof env.LINKS.delete === "function") {
    try {
      await env.LINKS.delete(key);
    } catch {}
  }
}

// ---------------- Same-Origin CSRF Guard ----------------
export function verifySameOrigin(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const targetOrigin = new URL(request.url).origin;
  const secFetchSite = (request.headers.get("Sec-Fetch-Site") || "").toLowerCase();
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("Origin");
  if (origin) {
    return origin === targetOrigin;
  }

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).origin === targetOrigin;
    } catch {
      return false;
    }
  }

  return true;
}
