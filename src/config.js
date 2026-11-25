export const APP_NAME = "Glz Serve";
export const APP_VERSION = "1.48.3";
export const COOKIE_NAME = "glz_session";
export const SESSION_DAYS = 30;

export const RESERVED_WORDS = new Set([
  "login",
  "logout",
  "api",
  "stream",
  "preview",
  "download",
  "public",
  "apks",
  "assets",
  "dl",
  "apk",
  "favicon.ico",
  "robots.txt"
]);

export const MIME_MAP = {
  // Video
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  ogv: "video/ogg",
  ts: "video/mp2t",
  "3gp": "video/3gpp",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  opus: "audio/opus",
  weba: "audio/webm",
  mid: "audio/midi",
  midi: "audio/midi",
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
  // Documents & Text
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  log: "text/plain; charset=utf-8",
  json: "application/json",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  xml: "application/xml",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  tsx: "text/plain; charset=utf-8",
  jsx: "text/plain; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  sh: "text/plain; charset=utf-8",
  bash: "text/plain; charset=utf-8",
  py: "text/plain; charset=utf-8",
  ini: "text/plain; charset=utf-8",
  conf: "text/plain; charset=utf-8",
  cfg: "text/plain; charset=utf-8",
  toml: "text/plain; charset=utf-8",
  sql: "text/plain; charset=utf-8",
  env: "text/plain; charset=utf-8",
  c: "text/plain; charset=utf-8",
  cpp: "text/plain; charset=utf-8",
  h: "text/plain; charset=utf-8",
  java: "text/plain; charset=utf-8",
  go: "text/plain; charset=utf-8",
  rs: "text/plain; charset=utf-8",
  rb: "text/plain; charset=utf-8",
  php: "text/plain; charset=utf-8",
  // Archives & Binaries
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  "tar.gz": "application/gzip",
  iso: "application/x-iso9660-image",
  bin: "application/octet-stream",
  dmg: "application/x-apple-diskimage",
  apk: "application/vnd.android.package-archive",
  exe: "application/x-msdownload",
  msi: "application/x-msi",
  deb: "application/vnd.debian.binary-package",
  rpm: "application/x-rpm"
};

export const EXT_CATEGORY_MAP = {
  mp4: "video", m4v: "video", webm: "video", mkv: "video", mov: "video", avi: "video", wmv: "video", flv: "video", ogv: "video", ts: "video", "3gp": "video",
  mp3: "audio", wav: "audio", ogg: "audio", oga: "audio", flac: "audio", aac: "audio", m4a: "audio", opus: "audio", weba: "audio", mid: "audio", midi: "audio",
  png: "img", jpg: "img", jpeg: "img", gif: "img", webp: "img", svg: "img", bmp: "img", ico: "img", avif: "img", tiff: "img", tif: "img",
  pdf: "pdf",
  txt: "doc", log: "doc", json: "doc", md: "doc", csv: "xls", xml: "doc", html: "doc", htm: "doc", css: "doc", js: "doc", mjs: "doc",
  tsx: "doc", jsx: "doc", yaml: "doc", yml: "doc", sh: "doc", bash: "doc", py: "doc", ini: "doc", conf: "doc", cfg: "doc", toml: "doc",
  sql: "doc", env: "doc", c: "doc", cpp: "doc", h: "doc", java: "doc", go: "doc", rs: "doc", rb: "doc", php: "doc",
  doc: "doc", docx: "doc", xls: "xls", xlsx: "xls", ppt: "doc", pptx: "doc",
  zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip", "tar.gz": "zip",
  iso: "iso", bin: "iso", img: "iso", dmg: "iso",
  apk: "apk", exe: "exe", msi: "exe"
};

export function getExtension(filename) {
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".tar.gz")) return "tar.gz";
  const m = /\.([a-z0-9]+)$/i.exec(lower);
  return m ? m[1].toLowerCase() : "";
}

export function getMimeType(filename) {
  const ext = getExtension(filename);
  return MIME_MAP[ext] || "application/octet-stream";
}

export function getPreviewType(filename) {
  const ext = getExtension(filename);
  const mime = MIME_MAP[ext] || "";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (ext === "pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml") {
    return "text";
  }
  return null;
}

export function escText(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escAttr(s) {
  return escText(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function humanSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function humanDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function safeDecodePath(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function encodeKeyPath(key) {
  return String(key || "").split("/").map(encodeURIComponent).join("/");
}

export function validateSegmentName(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) return null;
  if (trimmed === "." || trimmed === "..") return null;
  if (/[/\\\x00-\x1f\x7f]/.test(trimmed)) return null;
  return trimmed;
}

export function validateSlug(slug) {
  if (typeof slug !== "string") return null;
  const clean = slug.trim();
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(clean)) return null;
  if (RESERVED_WORDS.has(clean.toLowerCase())) return null;
  if (clean.startsWith("_rl")) return null;
  return clean;
}

export function normalizePrefix(prefix) {
  if (!prefix || typeof prefix !== "string") return "";
  let p = prefix.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (p && !p.endsWith("/")) p += "/";
  return p;
}
