var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var COOKIE_NAME = "glz_session";
var SESSION_DAYS = 30;
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(hmacKey, "hmacKey");
__name2(hmacKey, "hmacKey");
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
__name2(toHex, "toHex");
async function makeSessionCookie(secret) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3;
  const payload = String(expires);
  const key = await hmacKey(secret);
  const sig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const value = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}
__name(makeSessionCookie, "makeSessionCookie");
__name2(makeSessionCookie, "makeSessionCookie");
function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
__name(clearSessionCookie, "clearSessionCookie");
__name2(clearSessionCookie, "clearSessionCookie");
function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
__name(getCookie, "getCookie");
__name2(getCookie, "getCookie");
async function isAuthed(request, secret) {
  if (!secret) return false;
  const value = getCookie(request, COOKIE_NAME);
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;
  const key = await hmacKey(secret);
  const expectedSig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  if (expectedSig.length !== sig.length) return false;
  return safeEqual(expectedSig, sig);
}
__name(isAuthed, "isAuthed");
__name2(isAuthed, "isAuthed");
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(safeEqual, "safeEqual");
__name2(safeEqual, "safeEqual");
function loginPage(error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Log On to Windows - dl.glztech.com</title>
<style>
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; height: 100%;
  font-family: Tahoma, "MS Sans Serif", Verdana, Arial, sans-serif;
  font-size: 11px; color: #000;
  background: #0a246a;
}
.w2k-backdrop {
  height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.w2k-dialog {
  width: 380px; max-width: 100%; background: #d4d0c8; padding: 12px;
  border-top: 2px solid #fff; border-left: 2px solid #fff;
  border-right: 2px solid #404040; border-bottom: 2px solid #404040;
  box-shadow: 1px 1px 0 #808080 inset, 4px 4px 12px rgba(0,0,0,.7);
}
.w2k-header { display: flex; align-items: center; gap: 12px; padding: 4px 4px 10px; }
.w2k-flag {
  width: 36px; height: 36px; flex: none; border-radius: 2px; overflow: hidden;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 1.5px; background: #00297a; transform: skewX(-8deg);
  box-shadow: 0 2px 4px rgba(0,0,0,.5);
}
.w2k-flag i { display: block; }
.w2k-flag i:nth-child(1) { background: #e0402f; }
.w2k-flag i:nth-child(2) { background: #4bab4b; }
.w2k-flag i:nth-child(3) { background: #2e6fd9; }
.w2k-flag i:nth-child(4) { background: #f4c11c; }
.w2k-header-text { line-height: 1.25; }
.w2k-header-text .t1 { font-size: 15px; font-weight: 700; color: #000; }
.w2k-header-text .t2 { font-size: 11px; color: #333; }
.w2k-sep { height: 2px; border-top: 1px solid #808080; border-bottom: 1px solid #fff; margin: 2px 0 12px; }
.w2k-field { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; padding: 0 4px; }
.w2k-field label { width: 92px; flex: none; font-size: 11px; text-align: right; color: #000; }
.w2k-field input[type=text], .w2k-field input[type=password] {
  flex: 1; background: #fff; border-radius: 0;
  border-top: 1px solid #808080; border-left: 1px solid #808080;
  border-right: 1px solid #fff; border-bottom: 1px solid #fff;
  box-shadow: -1px -1px 0 #404040 inset;
  padding: 4px 6px; font-size: 11px; font-family: inherit;
}
.w2k-field input:disabled { color: #555; background: #ece9e2; }
.w2k-field input:focus { outline: 1px dotted #000; outline-offset: -1px; }
.w2k-err { margin: 0 0 10px 104px; color: #a30000; font-size: 11px; font-weight: 700; }
.w2k-buttons { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 4px 2px; }
.w2k-btn {
  min-width: 76px; padding: 4px 10px; font-size: 11px; font-family: inherit; color: #000; cursor: pointer;
  background: #d4d0c8; border-radius: 0;
  border-top: 1px solid #fff; border-left: 1px solid #fff;
  border-right: 1px solid #404040; border-bottom: 1px solid #404040;
}
.w2k-btn:hover { background: #e0dcd4; }
.w2k-btn:active { border-top-color: #404040; border-left-color: #404040; border-right-color: #fff; border-bottom-color: #fff; }
.w2k-btn:focus { outline: 1px dotted #000; outline-offset: -4px; }
.w2k-footer { text-align: center; font-size: 10px; color: #666; padding-top: 10px; }
@media (max-width: 480px) {
  .w2k-backdrop { padding: 0.5rem; }
  .w2k-dialog { width: 100%; padding: 10px; }
  .w2k-field label { width: 75px; font-size: 11px; }
  .w2k-field input[type=text], .w2k-field input[type=password] { padding: 6px 8px; font-size: 13px; }
  .w2k-btn { min-width: 68px; padding: 6px 8px; font-size: 12px; }
  .w2k-err { margin-left: 80px; }
}
</style>
</head>
<body>
<div class="w2k-backdrop">
  <div class="w2k-dialog">
    <div class="w2k-header">
      <div class="w2k-flag"><i></i><i></i><i></i><i></i></div>
      <div class="w2k-header-text">
        <div class="t1">Log On to Windows</div>
        <div class="t2">Windows Server 2003</div>
      </div>
    </div>
    <div class="w2k-sep"></div>
    <form method="POST" action="/login">
      <div class="w2k-field">
        <label for="w2kUser">User name:</label>
        <input type="text" id="w2kUser" value="Administrator" disabled>
      </div>
      <div class="w2k-field">
        <label for="w2kPass">Password:</label>
        <input type="password" id="w2kPass" name="password" autofocus required>
      </div>
      ${error ? `<div class="w2k-err">${error}</div>` : ""}
      <div class="w2k-buttons">
        <input type="submit" class="w2k-btn" value="OK">
        <button type="button" class="w2k-btn" onclick="document.getElementById('w2kPass').value=''">Cancel</button>
        <button type="button" class="w2k-btn" title="Not available" onclick="return false">Shut Down...</button>
      </div>
    </form>
    <div class="w2k-footer">dl.glztech.com &bull; R2 Cloud Storage</div>
  </div>
</div>
</body>
</html>`;
}
__name(loginPage, "loginPage");
__name2(loginPage, "loginPage");
var encoder = new TextEncoder();
var HOST_SERVICES = {
  appstream2: "appstream",
  cloudhsmv2: "cloudhsm",
  email: "ses",
  marketplace: "aws-marketplace",
  mobile: "AWSMobileHubService",
  pinpoint: "mobiletargeting",
  queue: "sqs",
  "git-codecommit": "codecommit",
  "mturk-requester-sandbox": "mturk-requester",
  "personalize-runtime": "personalize"
};
var UNSIGNABLE_HEADERS = /* @__PURE__ */ new Set([
  "authorization",
  "content-type",
  "content-length",
  "user-agent",
  "presigned-expires",
  "expect",
  "x-amzn-trace-id",
  "range",
  "connection"
]);
var AwsClient = class {
  static {
    __name(this, "AwsClient");
  }
  static {
    __name2(this, "AwsClient");
  }
  constructor({ accessKeyId, secretAccessKey, sessionToken, service, region, cache, retries, initRetryMs }) {
    if (accessKeyId == null) throw new TypeError("accessKeyId is a required option");
    if (secretAccessKey == null) throw new TypeError("secretAccessKey is a required option");
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
    this.service = service;
    this.region = region;
    this.cache = cache || /* @__PURE__ */ new Map();
    this.retries = retries != null ? retries : 10;
    this.initRetryMs = initRetryMs || 50;
  }
  async sign(input, init) {
    if (input instanceof Request) {
      const { method, url, headers, body } = input;
      init = Object.assign({ method, url, headers }, init);
      if (init.body == null && headers.has("Content-Type")) {
        init.body = body != null && headers.has("X-Amz-Content-Sha256") ? body : await input.clone().arrayBuffer();
      }
      input = url;
    }
    const signer = new AwsV4Signer(Object.assign({ url: input.toString() }, init, this, init && init.aws));
    const signed = Object.assign({}, init, await signer.sign());
    delete signed.aws;
    try {
      return new Request(signed.url.toString(), signed);
    } catch (e) {
      if (e instanceof TypeError) {
        return new Request(signed.url.toString(), Object.assign({ duplex: "half" }, signed));
      }
      throw e;
    }
  }
  async fetch(input, init) {
    for (let i = 0; i <= this.retries; i++) {
      const fetched = fetch(await this.sign(input, init));
      if (i === this.retries) {
        return fetched;
      }
      const res = await fetched;
      if (res.status < 500 && res.status !== 429) {
        return res;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.random() * this.initRetryMs * Math.pow(2, i)));
    }
    throw new Error("An unknown error occurred, ensure retries is not negative");
  }
};
var AwsV4Signer = class {
  static {
    __name(this, "AwsV4Signer");
  }
  static {
    __name2(this, "AwsV4Signer");
  }
  constructor({ method, url, headers, body, accessKeyId, secretAccessKey, sessionToken, service, region, cache, datetime, signQuery, appendSessionToken, allHeaders, singleEncode }) {
    if (url == null) throw new TypeError("url is a required option");
    if (accessKeyId == null) throw new TypeError("accessKeyId is a required option");
    if (secretAccessKey == null) throw new TypeError("secretAccessKey is a required option");
    this.method = method || (body ? "POST" : "GET");
    this.url = new URL(url);
    this.headers = new Headers(headers || {});
    this.body = body;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
    let guessedService, guessedRegion;
    if (!service || !region) {
      [guessedService, guessedRegion] = guessServiceRegion(this.url, this.headers);
    }
    this.service = service || guessedService || "";
    this.region = region || guessedRegion || "us-east-1";
    this.cache = cache || /* @__PURE__ */ new Map();
    this.datetime = datetime || (/* @__PURE__ */ new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
    this.signQuery = signQuery;
    this.appendSessionToken = appendSessionToken || this.service === "iotdevicegateway";
    this.headers.delete("Host");
    if (this.service === "s3" && !this.signQuery && !this.headers.has("X-Amz-Content-Sha256")) {
      this.headers.set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
    }
    const params = this.signQuery ? this.url.searchParams : this.headers;
    params.set("X-Amz-Date", this.datetime);
    if (this.sessionToken && !this.appendSessionToken) {
      params.set("X-Amz-Security-Token", this.sessionToken);
    }
    this.signableHeaders = ["host", ...this.headers.keys()].filter((header) => allHeaders || !UNSIGNABLE_HEADERS.has(header)).sort();
    this.signedHeaders = this.signableHeaders.join(";");
    this.canonicalHeaders = this.signableHeaders.map((header) => header + ":" + (header === "host" ? this.url.host : (this.headers.get(header) || "").replace(/\s+/g, " "))).join("\n");
    this.credentialString = [this.datetime.slice(0, 8), this.region, this.service, "aws4_request"].join("/");
    if (this.signQuery) {
      if (this.service === "s3" && !params.has("X-Amz-Expires")) {
        params.set("X-Amz-Expires", "86400");
      }
      params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
      params.set("X-Amz-Credential", this.accessKeyId + "/" + this.credentialString);
      params.set("X-Amz-SignedHeaders", this.signedHeaders);
    }
    if (this.service === "s3") {
      try {
        this.encodedPath = decodeURIComponent(this.url.pathname.replace(/\+/g, " "));
      } catch (e) {
        this.encodedPath = this.url.pathname;
      }
    } else {
      this.encodedPath = this.url.pathname.replace(/\/+/g, "/");
    }
    if (!singleEncode) {
      this.encodedPath = encodeURIComponent(this.encodedPath).replace(/%2F/g, "/");
    }
    this.encodedPath = encodeRfc3986(this.encodedPath);
    const seenKeys = /* @__PURE__ */ new Set();
    this.encodedSearch = [...this.url.searchParams].filter(([k]) => {
      if (!k) return false;
      if (this.service === "s3") {
        if (seenKeys.has(k)) return false;
        seenKeys.add(k);
      }
      return true;
    }).map((pair) => pair.map((p) => encodeRfc3986(encodeURIComponent(p)))).sort(([k1, v1], [k2, v2]) => k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0).map((pair) => pair.join("=")).join("&");
  }
  async sign() {
    if (this.signQuery) {
      this.url.searchParams.set("X-Amz-Signature", await this.signature());
      if (this.sessionToken && this.appendSessionToken) {
        this.url.searchParams.set("X-Amz-Security-Token", this.sessionToken);
      }
    } else {
      this.headers.set("Authorization", await this.authHeader());
    }
    return {
      method: this.method,
      url: this.url,
      headers: this.headers,
      body: this.body
    };
  }
  async authHeader() {
    return [
      "AWS4-HMAC-SHA256 Credential=" + this.accessKeyId + "/" + this.credentialString,
      "SignedHeaders=" + this.signedHeaders,
      "Signature=" + await this.signature()
    ].join(", ");
  }
  async signature() {
    const date = this.datetime.slice(0, 8);
    const cacheKey = [this.secretAccessKey, date, this.region, this.service].join();
    let kCredentials = this.cache.get(cacheKey);
    if (!kCredentials) {
      const kDate = await hmac("AWS4" + this.secretAccessKey, date);
      const kRegion = await hmac(kDate, this.region);
      const kService = await hmac(kRegion, this.service);
      kCredentials = await hmac(kService, "aws4_request");
      this.cache.set(cacheKey, kCredentials);
    }
    return buf2hex(await hmac(kCredentials, await this.stringToSign()));
  }
  async stringToSign() {
    return [
      "AWS4-HMAC-SHA256",
      this.datetime,
      this.credentialString,
      buf2hex(await hash(await this.canonicalString()))
    ].join("\n");
  }
  async canonicalString() {
    return [
      this.method.toUpperCase(),
      this.encodedPath,
      this.encodedSearch,
      this.canonicalHeaders + "\n",
      this.signedHeaders,
      await this.hexBodyHash()
    ].join("\n");
  }
  async hexBodyHash() {
    let hashHeader = this.headers.get("X-Amz-Content-Sha256") || (this.service === "s3" && this.signQuery ? "UNSIGNED-PAYLOAD" : null);
    if (hashHeader == null) {
      if (this.body && typeof this.body !== "string" && !("byteLength" in this.body)) {
        throw new Error("body must be a string, ArrayBuffer or ArrayBufferView, unless you include the X-Amz-Content-Sha256 header");
      }
      hashHeader = buf2hex(await hash(this.body || ""));
    }
    return hashHeader;
  }
};
async function hmac(key, string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(string));
}
__name(hmac, "hmac");
__name2(hmac, "hmac");
async function hash(content) {
  return crypto.subtle.digest("SHA-256", typeof content === "string" ? encoder.encode(content) : content);
}
__name(hash, "hash");
__name2(hash, "hash");
var HEX_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
function buf2hex(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  let out = "";
  for (let idx = 0; idx < buffer.length; idx++) {
    const n = buffer[idx];
    out += HEX_CHARS[n >>> 4 & 15];
    out += HEX_CHARS[n & 15];
  }
  return out;
}
__name(buf2hex, "buf2hex");
__name2(buf2hex, "buf2hex");
function encodeRfc3986(urlEncodedStr) {
  return urlEncodedStr.replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
__name(encodeRfc3986, "encodeRfc3986");
__name2(encodeRfc3986, "encodeRfc3986");
function guessServiceRegion(url, headers) {
  const { hostname, pathname } = url;
  if (hostname.endsWith(".on.aws")) {
    const match2 = hostname.match(/^[^.]{1,63}\.lambda-url\.([^.]{1,63})\.on\.aws$/);
    return match2 != null ? ["lambda", match2[1] || ""] : ["", ""];
  }
  if (hostname.endsWith(".r2.cloudflarestorage.com")) {
    return ["s3", "auto"];
  }
  if (hostname.endsWith(".backblazeb2.com")) {
    const match2 = hostname.match(/^(?:[^.]{1,63}\.)?s3\.([^.]{1,63})\.backblazeb2\.com$/);
    return match2 != null ? ["s3", match2[1] || ""] : ["", ""];
  }
  const match = hostname.replace("dualstack.", "").match(/([^.]{1,63})\.(?:([^.]{0,63})\.)?amazonaws\.com(?:\.cn)?$/);
  let service = match && match[1] || "";
  let region = match && match[2];
  if (region === "us-gov") {
    region = "us-gov-west-1";
  } else if (region === "s3" || region === "s3-accelerate") {
    region = "us-east-1";
    service = "s3";
  } else if (service === "iot") {
    if (hostname.startsWith("iot.")) {
      service = "execute-api";
    } else if (hostname.startsWith("data.jobs.iot.")) {
      service = "iot-jobs-data";
    } else {
      service = pathname === "/mqtt" ? "iotdevicegateway" : "iotdata";
    }
  } else if (service === "autoscaling") {
    const targetPrefix = (headers.get("X-Amz-Target") || "").split(".")[0];
    if (targetPrefix === "AnyScaleFrontendService") {
      service = "application-autoscaling";
    } else if (targetPrefix === "AnyScaleScalingPlannerFrontendService") {
      service = "autoscaling-plans";
    }
  } else if (region == null && service.startsWith("s3-")) {
    region = service.slice(3).replace(/^fips-|^external-1/, "");
    service = "s3";
  } else if (service.endsWith("-fips")) {
    service = service.slice(0, -5);
  } else if (region && /-\d$/.test(service) && !/-\d$/.test(region)) {
    [service, region] = [region, service];
  }
  return [HOST_SERVICES[service] || service, region || ""];
}
__name(guessServiceRegion, "guessServiceRegion");
__name2(guessServiceRegion, "guessServiceRegion");
var MIME_MAP = {
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
  yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  sh: "text/plain; charset=utf-8",
  bash: "text/plain; charset=utf-8",
  py: "text/plain; charset=utf-8",
  ini: "text/plain; charset=utf-8",
  conf: "text/plain; charset=utf-8",
  // Archives
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
var EXT_CATEGORY_MAP = {
  // Video
  mp4: "video",
  m4v: "video",
  webm: "video",
  mkv: "video",
  mov: "video",
  avi: "video",
  wmv: "video",
  flv: "video",
  ogv: "video",
  ts: "video",
  "3gp": "video",
  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  oga: "audio",
  flac: "audio",
  aac: "audio",
  m4a: "audio",
  opus: "audio",
  weba: "audio",
  mid: "audio",
  midi: "audio",
  // Images
  png: "img",
  jpg: "img",
  jpeg: "img",
  gif: "img",
  webp: "img",
  svg: "img",
  bmp: "img",
  ico: "img",
  avif: "img",
  tiff: "img",
  tif: "img",
  // PDF
  pdf: "pdf",
  // Code / Text
  txt: "doc",
  log: "doc",
  json: "doc",
  md: "doc",
  csv: "xls",
  xml: "doc",
  html: "doc",
  htm: "doc",
  css: "doc",
  js: "doc",
  tsx: "doc",
  yaml: "doc",
  yml: "doc",
  sh: "doc",
  py: "doc",
  ini: "doc",
  conf: "doc",
  doc: "doc",
  docx: "doc",
  xls: "xls",
  xlsx: "xls",
  ppt: "doc",
  pptx: "doc",
  // Archives
  zip: "zip",
  rar: "zip",
  "7z": "zip",
  tar: "zip",
  gz: "zip",
  "tar.gz": "zip",
  iso: "iso",
  bin: "iso",
  img: "iso",
  dmg: "iso",
  apk: "apk",
  exe: "exe",
  msi: "exe"
};
function getMimeType(filename) {
  const ext = getExtension(filename);
  return MIME_MAP[ext] || "application/octet-stream";
}
__name(getMimeType, "getMimeType");
__name2(getMimeType, "getMimeType");
function getExtension(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz")) return "tar.gz";
  const m = /\.([a-z0-9]+)$/i.exec(lower);
  return m ? m[1].toLowerCase() : "";
}
__name(getExtension, "getExtension");
__name2(getExtension, "getExtension");
function getPreviewType(filename) {
  const ext = getExtension(filename);
  const mime = MIME_MAP[ext] || "";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (ext === "pdf") return "pdf";
  if (mime.startsWith("text/") || ext === "json" || ext === "md" || ext === "log" || ext === "yaml" || ext === "yml" || ext === "sh" || ext === "py" || ext === "js" || ext === "css") {
    return "text";
  }
  return null;
}
__name(getPreviewType, "getPreviewType");
__name2(getPreviewType, "getPreviewType");
function r2Client(env) {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto"
  });
}
__name(r2Client, "r2Client");
__name2(r2Client, "r2Client");
async function listFolder(env, prefix = "") {
  let cursor;
  const allObjects = [];
  const allDelimited = /* @__PURE__ */ new Set();
  const listing = await env.BUCKET.list({
    prefix,
    delimiter: "/",
    limit: 1e3
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
  const folders = Array.from(allDelimited).sort();
  const files = allObjects.sort((a, b) => a.key.localeCompare(b.key));
  return { prefix, folders, files };
}
__name(listFolder, "listFolder");
__name2(listFolder, "listFolder");
async function listAllKeysUnderPrefix(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const res = await env.BUCKET.list({ prefix, cursor, limit: 1e3 });
    keys.push(...res.objects.map((o) => o.key));
    cursor = res.truncated ? res.cursor : void 0;
  } while (cursor);
  return keys;
}
__name(listAllKeysUnderPrefix, "listAllKeysUnderPrefix");
__name2(listAllKeysUnderPrefix, "listAllKeysUnderPrefix");
async function copyObject(client, env, oldKey, newKey) {
  const encode = /* @__PURE__ */ __name2((k) => k.split("/").map(encodeURIComponent).join("/"), "encode");
  const destUrl = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${encode(newKey)}`;
  const copySource = `/${env.R2_BUCKET_NAME}/${encode(oldKey)}`;
  const res = await client.fetch(destUrl, {
    method: "PUT",
    headers: { "x-amz-copy-source": copySource }
  });
  return res.ok;
}
__name(copyObject, "copyObject");
__name2(copyObject, "copyObject");
async function runWithConcurrency(items, limit, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  __name(worker, "worker");
  __name2(worker, "worker");
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
__name(runWithConcurrency, "runWithConcurrency");
__name2(runWithConcurrency, "runWithConcurrency");
async function batchDelete(env, keys) {
  for (let i = 0; i < keys.length; i += 1e3) {
    await env.BUCKET.delete(keys.slice(i, i + 1e3));
  }
}
__name(batchDelete, "batchDelete");
__name2(batchDelete, "batchDelete");
async function serveR2Object(request, env, key, { inline = false } = {}) {
  const isHead = request.method === "HEAD";
  const rangeHeader = request.headers.get("Range");
  const filename = key.split("/").pop() || "file";
  const isApk = filename.toLowerCase().endsWith(".apk");
  if (isHead) {
    const head = await env.BUCKET.head(key);
    if (!head) {
      return new Response("Not found", { status: 404 });
    }
    const headers2 = new Headers();
    head.writeHttpMetadata(headers2);
    headers2.set("etag", head.httpEtag);
    headers2.set("Accept-Ranges", "bytes");
    headers2.set("Content-Length", String(head.size));
    const disposition2 = inline ? "inline" : "attachment";
    const asciiFallback2 = filename.replace(/[^\x20-\x7E]/g, "_");
    headers2.set(
      "Content-Disposition",
      `${disposition2}; filename="${asciiFallback2}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    if (isApk) {
      headers2.set("Content-Type", "application/vnd.android.package-archive");
    } else {
      const existingType = headers2.get("Content-Type");
      if (!existingType || existingType === "application/octet-stream") {
        headers2.set("Content-Type", getMimeType(filename));
      }
    }
    headers2.set("Cache-Control", "public, max-age=300, must-revalidate");
    return new Response(null, { status: 200, headers: headers2 });
  }
  const object = await env.BUCKET.get(key, {
    range: rangeHeader ? request.headers : void 0,
    onlyIf: request.headers
  });
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  const disposition = inline ? "inline" : "attachment";
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  if (isApk) {
    headers.set("Content-Type", "application/vnd.android.package-archive");
  } else {
    const existingType = headers.get("Content-Type");
    if (!existingType || existingType === "application/octet-stream") {
      headers.set("Content-Type", getMimeType(filename));
    }
  }
  if (object.range) {
    headers.set("Content-Length", String(object.range.length));
    headers.set(
      "Content-Range",
      `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`
    );
  } else {
    headers.set("Content-Length", String(object.size));
  }
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  const status = object.range ? 206 : 200;
  return new Response(object.body, {
    status,
    headers
  });
}
__name(serveR2Object, "serveR2Object");
__name2(serveR2Object, "serveR2Object");
var STYLE = `
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; height: 100%;
  font-family: Tahoma, "Segoe UI", "MS Sans Serif", Verdana, Arial, sans-serif;
  font-size: 11px; color: #000;
  background: #3a6ea5 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%233a6ea5'/%3E%3Cpath d='M0 0L4 4ZM4 0L0 4Z' stroke='%23375f92' stroke-width='0.4'/%3E%3C/svg%3E");
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
a { color: #0645c8; text-decoration: none; }
a:hover { text-decoration: underline; }
button { font-family: inherit; font-size: 11px; }

/* ---------------- XP window chrome (Desktop) ---------------- */
.page { display: flex; justify-content: center; padding: 12px; height: 100vh; }
.xp-window {
  width: 100%; height: 100%; max-width: none;
  display: flex; flex-direction: column;
  background: #ece9d8; border-radius: 8px 8px 3px 3px;
  border: 1px solid #0831d9;
  box-shadow: 0 10px 34px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.4) inset;
  overflow: hidden;
  position: relative;
}

.xp-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 3px 3px 3px 6px; height: 28px;
  background: linear-gradient(180deg,#2a6fe0 0%,#1655d0 8%,#0c4bd6 40%,#1d63e8 60%,#3e93f5 88%,#5aa6f7 100%);
  border-bottom: 1px solid #0831d9;
}
.xp-title-left { display: flex; align-items: center; gap: 6px; color: #fff; font-weight: 700; font-size: 12px; text-shadow: 1px 1px 1px rgba(0,0,0,.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-title-icon { font-size: 14px; filter: drop-shadow(1px 1px 0 rgba(0,0,0,.4)); }
.xp-title-btns { display: flex; gap: 2px; flex: none; }
.xp-title-btns button, .xp-title-btns a {
  width: 21px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 3px; border: 1px solid rgba(255,255,255,.5);
  background: linear-gradient(180deg,#4c8ef0,#1c5fe0);
  color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; line-height: 1; text-decoration: none;
}
.xp-title-btns a.xp-close, .xp-title-btns button.xp-close { background: linear-gradient(180deg,#f5a58e,#d5372a); }
.xp-title-btns button:hover, .xp-title-btns a:hover { filter: brightness(1.15); text-decoration: none; }

/* ---------------- Menubar & Menus ---------------- */
.xp-menubar {
  display: flex; gap: 0; padding: 1px 4px;
  background: #ece9d8; border-bottom: 1px solid #c9c4b3; font-size: 11px; color: #000;
  position: relative; z-index: 2100;
}
.xp-menu-wrap { position: relative; }
.xp-menu-btn {
  padding: 3px 7px; border: 1px solid transparent; border-radius: 2px; cursor: default;
  background: transparent; color: #000; font-size: 11px; font-family: inherit; line-height: 1;
}
.xp-menu-btn:hover { background: #316ac5; color: #fff; }
.xp-menu-btn.active {
  background: #fff; color: #000; border: 1px solid #7a7a7a; border-bottom: 1px solid #fff;
  box-shadow: 2px 0 4px rgba(0,0,0,.15);
}
.xp-dropdown-menu {
  position: absolute; top: 100%; left: 0; min-width: 200px;
  background: #ece9d8; border: 1px solid #716f64; box-shadow: 2px 2px 7px rgba(0,0,0,.45);
  padding: 2px; display: none; z-index: 2200; font-size: 11px; color: #000;
}
.xp-dropdown-menu.show { display: block; }
.xp-mi {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 10px 4px 26px; position: relative; cursor: pointer; white-space: nowrap; color: #000;
}
.xp-mi:hover:not(.disabled) { background: #316ac5; color: #fff; }
.xp-mi.disabled { color: #888; cursor: default; }
.xp-mi .ico { position: absolute; left: 6px; top: 50%; transform: translateY(-50%); font-size: 11px; width: 14px; text-align: center; }
.xp-mi .shortcut { margin-left: 20px; font-size: 10px; color: #666; }
.xp-mi:hover:not(.disabled) .shortcut { color: #fff; }
.xp-menu-sep { height: 1px; background: #c9c4b3; margin: 3px 4px; }

/* ---------------- Toolbar ---------------- */
.xp-toolbar {
  display: flex; align-items: center; gap: 4px; flex-wrap: nowrap;
  padding: 3px 6px; background: #ece9d8; border-bottom: 1px solid #c9c4b3;
}
.xp-tbtn {
  display: inline-flex; align-items: center; gap: 4px;
  background: transparent; border: 1px solid transparent; border-radius: 3px;
  padding: 3px 7px; color: #000; cursor: pointer; white-space: nowrap; font-size: 11px;
}
.xp-tbtn:hover:not(:disabled) { background: #e5f0ff; border-color: #9fc2f0; }
.xp-tbtn:active:not(:disabled) { background: #cfe4fb; border-color: #6fa8dc; }
.xp-tbtn:disabled { color: #9a9a8c; cursor: default; }
.xp-tb-sep { width: 1px; align-self: stretch; margin: 2px 2px; background: #c9c4b3; }

/* Filter search input in toolbar */
.xp-search-wrap {
  margin-left: auto; display: flex; align-items: center; gap: 4px;
  background: #fff; border: 1px solid #7f9db9; border-radius: 2px; padding: 1px 4px;
}
.xp-search-icon { color: #666; font-size: 11px; }
.xp-search-input {
  border: none !important; outline: none !important; padding: 2px 2px !important;
  font-size: 11px !important; width: 140px; background: transparent !important;
}
.xp-search-clear {
  background: transparent; border: none; color: #888; cursor: pointer; font-size: 10px; padding: 0 2px; display: none;
}
.xp-search-clear.show { display: block; }
.xp-search-clear:hover { color: #d00; }

.xp-addressbar {
  display: flex; align-items: center; gap: 6px; padding: 4px 6px;
  background: #ece9d8; border-bottom: 1px solid #c9c4b3;
}
.xp-address-label { color: #444; }
.xp-address-box {
  flex: 1; display: flex; align-items: center; gap: 5px; min-width: 0;
  background: #fff; border: 1px solid #7f9db9; border-radius: 2px;
  padding: 3px 6px; font-size: 11px; white-space: nowrap; overflow-x: auto;
}
.xp-address-box .crumbs { display: flex; align-items: center; gap: 3px; white-space: nowrap; }
.xp-address-box .crumbs a { color: #000; }
.xp-address-box .crumbs a:hover { text-decoration: underline; }
.xp-address-box .crumbs span.sep { color: #888; }
.xp-go {
  background: linear-gradient(180deg,#fdfdfd,#e3e3e3); border: 1px solid #8f8f8f; border-radius: 2px;
  padding: 3px 10px; cursor: pointer;
}

.xp-body { display: flex; align-items: stretch; flex: 1; min-height: 0; background: #fff; }

.xp-sidebar {
  width: 220px; flex: none; padding: 8px; overflow-y: auto;
  background: linear-gradient(180deg,#c6d8f5,#a9c6f2 55%,#96baf0);
  border-right: 1px solid #b9c9df;
}
.xp-panel { margin-bottom: 12px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.xp-panel-title {
  background: linear-gradient(180deg,#5c8ee8,#2f66d6); color: #fff; font-weight: 700;
  font-size: 11px; padding: 4px 8px; display: flex; align-items: center; gap: 5px;
}
.xp-panel-body { background: #eef4ff; padding: 8px; font-size: 11px; }

.xp-main { flex: 1; min-width: 0; min-height: 0; padding: 0; display: flex; flex-direction: column; background: #fff; }

#listContainer { flex: 1; min-height: 0; transition: opacity .12s ease; overflow: auto; background: #fff; }
#listContainer.fading { opacity: .4; }

table.file-table { width: 100%; border-collapse: collapse; font-size: 11px; }
table.file-table thead th {
  text-align: left; font-weight: 700; color: #000; background: #ece9d8;
  border-bottom: 1px solid #c9c4b3; border-right: 1px solid #d8d4c4;
  padding: 4px 8px; position: sticky; top: 0; z-index: 1; cursor: pointer; user-select: none;
}
table.file-table thead th:hover { background: #e2ded0; }
table.file-table thead th .sort-arrow { display: inline-block; margin-left: 4px; font-size: 9px; color: #0831d9; }

tbody tr { cursor: pointer; user-select: none; }
tbody tr td { padding: 4px 8px; border-bottom: 1px solid #f1f1f1; white-space: nowrap; }
tbody tr:nth-child(even) { background: #f7faff; }
tbody tr:hover:not(.selected) { background: #e5f0ff; }
tbody tr.selected { background: #316ac5 !important; color: #fff !important; }
tbody tr.selected td { border-bottom-color: #316ac5; }
tbody tr.selected a, tbody tr.selected .size { color: #fff !important; }

td.folder, td.file { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
td.folder::before, td.file::before {
  content: ""; display: inline-block; width: 16px; height: 16px; flex: none;
  background-size: 16px 16px; background-repeat: no-repeat;
}
td.folder::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l1.5 1.8H15v8.2H1z' fill='%23ffce4f' stroke='%23c9932a' stroke-width='0.6'/%3E%3Cpath d='M1 4V3a1 1 0 0 1 1-1h3.2L7 3.6' fill='%23ffe085' stroke='%23c9932a' stroke-width='0.6'/%3E%3C/svg%3E");
}
td.file::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23ffffff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3C/svg%3E");
}
/* extension icons */
td.file.file-ico-apk::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cline x1='4' y1='3' x2='5.5' y2='5' stroke='%233ddc84' stroke-width='1'/%3E%3Cline x1='12' y1='3' x2='10.5' y2='5' stroke='%233ddc84' stroke-width='1'/%3E%3Crect x='3' y='5' width='10' height='7' rx='3' fill='%233ddc84'/%3E%3Crect x='2' y='6' width='1.6' height='4' rx='0.8' fill='%233ddc84'/%3E%3Crect x='12.4' y='6' width='1.6' height='4' rx='0.8' fill='%233ddc84'/%3E%3Ccircle cx='6' cy='8' r='0.8' fill='%23063'/%3E%3Ccircle cx='10' cy='8' r='0.8' fill='%23063'/%3E%3Crect x='4' y='12' width='2' height='2.4' rx='0.8' fill='%233ddc84'/%3E%3Crect x='10' y='12' width='2' height='2.4' rx='0.8' fill='%233ddc84'/%3E%3C/svg%3E");
}
td.file.file-ico-iso::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='6.5' fill='%23c9ccd1' stroke='%237a7f87' stroke-width='0.8'/%3E%3Ccircle cx='8' cy='8' r='2.2' fill='%23fff' stroke='%237a7f87' stroke-width='0.6'/%3E%3Ccircle cx='8' cy='8' r='0.9' fill='%237a7f87'/%3E%3Cpath d='M3 5.5A6.5 6.5 0 0 1 8 1.5' stroke='%23fff' stroke-width='1' fill='none' opacity='.6'/%3E%3C/svg%3E");
}
td.file.file-ico-zip::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3Crect x='6.3' y='4' width='2' height='1.6' fill='%23caa64d'/%3E%3Crect x='6.3' y='7' width='2' height='1.6' fill='%23caa64d'/%3E%3Crect x='6.3' y='10' width='2' height='1.6' fill='%23caa64d'/%3E%3C/svg%3E");
}
td.file.file-ico-pdf::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fdeeee' stroke='%23c23a3a' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23f6c9c9' stroke='%23c23a3a' stroke-width='0.7'/%3E%3Crect x='3.6' y='9' width='8.8' height='3.6' rx='0.6' fill='%23d5342f'/%3E%3Ctext x='8' y='11.7' font-family='Arial' font-size='3.4' font-weight='700' fill='%23fff' text-anchor='middle'%3EPDF%3C/text%3E%3C/svg%3E");
}
td.file.file-ico-img::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3Crect x='4' y='7' width='8' height='6' fill='%23eaf4ff' stroke='%237fa8d9' stroke-width='0.5'/%3E%3Ccircle cx='6.2' cy='8.8' r='0.9' fill='%23f4c11c'/%3E%3Cpath d='M4.3 12.6l2.4-2.6 1.8 1.8 1.6-2 2.2 2.8z' fill='%233f8f4f'/%3E%3C/svg%3E");
}
td.file.file-ico-audio::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M6.5 7.5v4.4a1.6 1.6 0 1 0 1 1.5v-4.4l2.5-.6V9.8' stroke='%237a3fc9' stroke-width='1' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='6.1' cy='12.4' r='1.1' fill='%237a3fc9'/%3E%3C/svg%3E");
}
td.file.file-ico-video::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3Crect x='4' y='7' width='8' height='6' rx='0.8' fill='%23222'/%3E%3Cpath d='M6.7 8.6l3.2 1.8-3.2 1.8z' fill='%23fff'/%3E%3C/svg%3E");
}
td.file.file-ico-exe::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23fff' stroke='%23848484' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23dcdcdc' stroke='%23848484' stroke-width='0.7'/%3E%3Crect x='4.2' y='8' width='7.6' height='4.6' rx='0.6' fill='%232f66d6'/%3E%3Crect x='5.2' y='9' width='5.6' height='1' fill='%23fff' opacity='.85'/%3E%3Crect x='5.2' y='10.6' width='3.6' height='1' fill='%23fff' opacity='.6'/%3E%3C/svg%3E");
}
td.file.file-ico-doc::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23eaf0fb' stroke='%232f5fa8' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23c9d9f2' stroke='%232f5fa8' stroke-width='0.7'/%3E%3Crect x='4.4' y='7.4' width='7.2' height='1' fill='%232f5fa8'/%3E%3Crect x='4.4' y='9.2' width='7.2' height='1' fill='%232f5fa8'/%3E%3Crect x='4.4' y='11' width='4.8' height='1' fill='%232f5fa8'/%3E%3C/svg%3E");
}
td.file.file-ico-xls::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M3 1h6l4 4v10H3z' fill='%23e9f7ee' stroke='%232f8f4f' stroke-width='0.7'/%3E%3Cpath d='M9 1v4h4z' fill='%23c8ead2' stroke='%232f8f4f' stroke-width='0.7'/%3E%3Cpath d='M4.6 8l2.6 4.4M7.2 8l-2.6 4.4' stroke='%232f8f4f' stroke-width='0.9' stroke-linecap='round'/%3E%3Cpath d='M9 8h3M9 10.2h3M9 12.4h2.2' stroke='%232f8f4f' stroke-width='0.9' stroke-linecap='round'/%3E%3C/svg%3E");
}
.size { color: #444; white-space: nowrap; font-variant-numeric: tabular-nums; }
.empty { color: #666; padding: 2.5rem 0; text-align: center; font-size: 11px; }

/* ---------------- Context Menu ---------------- */
.ctx-menu {
  position: fixed; z-index: 3000; min-width: 170px; display: none;
  max-width: calc(100vw - 8px); max-height: calc(100dvh - 8px); overflow-y: auto;
  background: #ece9d8; border: 1px solid #6b6b6b; box-shadow: 2px 2px 7px rgba(0,0,0,.45);
  padding: 2px; font-size: 11px; user-select: none;
}
.ctx-menu.show { display: block; }
.ctx-item { padding: 6px 12px 6px 28px; position: relative; cursor: pointer; white-space: nowrap; color: #000; font-size: 11px; }
.ctx-item:hover, .ctx-item:focus { background: #316ac5; color: #fff; outline: none; }
.ctx-item.bold { font-weight: 700; }
.ctx-item .ico { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; }
.ctx-sep { height: 1px; background: #c9c4b3; margin: 3px 4px; }

/* ---------------- Status Bar ---------------- */
.xp-statusbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 3px 10px; background: #ece9d8; border-top: 1px solid #c9c4b3;
  font-size: 11px; color: #333;
}
.xp-statusbar .cell { padding: 1px 8px; border-left: 1px solid #c9c4b3; }
.xp-statusbar .cell:first-child { border-left: none; flex: 1; }
#clock { font-variant-numeric: tabular-nums; }

/* ---------------- Upload & Widgets ---------------- */
input[type=text], input[type=password] {
  background: #fff; border: 1px solid #7f9db9; color: #000;
  border-radius: 2px; padding: 3px 5px; font-size: 11px; width: 100%;
}
input[type=text]:focus, input[type=password]:focus { outline: 1px dotted #316ac5; }
.row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.row > * { flex: 1; }
.muted { color: #555; font-size: 11px; }

button, input[type=submit] {
  background: linear-gradient(180deg,#fdfdfd,#e3e3e3); border: 1px solid #8f8f8f; border-radius: 3px;
  padding: 4px 10px; font-size: 11px; cursor: pointer; color: #000;
}
button:hover:not(:disabled), input[type=submit]:hover { border-color: #3c7fb1; background: linear-gradient(180deg,#f4faff,#dcedfb); }
button:active:not(:disabled) { background: #cfe4fb; }
button:disabled { color: #999; cursor: default; }
button.primary { background: linear-gradient(180deg,#e5f2ff,#a8d2fc); border-color: #2b72c4; font-weight: 700; }
button.danger { color: #a30000; }
button.iconbtn {
  background: transparent; color: #333; border: 1px solid transparent;
  padding: 2px 5px; font-size: 12px; border-radius: 3px; line-height: 1; cursor: pointer;
}
button.iconbtn:hover:not(:disabled) { background: #e5f0ff; border-color: #9fc2f0; }
button.iconbtn.danger-hover:hover:not(:disabled) { background: #ffe3e3; border-color: #e39b9b; color: #a30000; }

.dropzone {
  border: 1px dashed #7f9db9; border-radius: 4px; padding: 10px 8px; margin-top: 6px;
  text-align: center; color: #444; font-size: 10.5px; background: #fff; cursor: pointer;
}
.dropzone.dragover { border-color: #316ac5; background: #e5f0ff; }
.dropzone .big { font-size: 20px; display: block; margin-bottom: 2px; }

.file-edit-row { display: flex; gap: 5px; align-items: center; margin-bottom: 4px; }
.file-edit-row input[type=text] { flex: 1; }
.file-edit-row .fsize { width: 56px; text-align: right; color: #555; font-size: 10px; white-space: nowrap; }

.progress { height: 12px; background: #fff; border: 1px solid #7f9db9; border-radius: 2px; overflow: hidden; margin-top: 6px; display: none; }
.progress > div {
  height: 100%; width: 0%;
  background: repeating-linear-gradient(90deg,#3f9cff,#3f9cff 8px,#69b3ff 8px,#69b3ff 16px);
  transition: width .1s;
}
.err { color: #a30000; font-size: 10.5px; margin-top: 4px; }

#topLoader {
  position: fixed; top: 0; left: 0; height: 3px; width: 0%;
  background: linear-gradient(90deg,#3980ea,#8ec3ff); z-index: 4000;
  transition: width .3s ease, opacity .3s ease; opacity: 0;
}
#topLoader.show { opacity: 1; width: 70%; }

/* ---------------- Toasts ---------------- */
#toasts { position: fixed; bottom: 14px; right: 14px; z-index: 3500; display: flex; flex-direction: column; gap: 8px; max-width: 300px; }
.toast {
  background: #fffbcf; border: 1px solid #c2a83e; color: #333;
  padding: 8px 10px; border-radius: 4px; font-size: 11px;
  box-shadow: 0 3px 10px rgba(0,0,0,.3);
  animation: toast-in .18s ease;
}
.toast.err { background: #ffe1e1; border-color: #c25454; color: #6a0000; }
@keyframes toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* ---------------- Generic Modal (XP Dialog) ---------------- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;
}
.modal-backdrop.show { display: flex; }
.modal {
  background: #ece9d8; border: 1px solid #0831d9; border-radius: 6px;
  width: 100%; max-width: 420px; box-shadow: 0 14px 40px rgba(0,0,0,.6);
  animation: modal-in .14s ease; overflow: hidden;
}
@keyframes modal-in { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
.modal-titlebar {
  background: linear-gradient(180deg,#2a6fe0 0%,#1655d0 8%,#0c4bd6 40%,#1d63e8 60%,#3e93f5 88%,#5aa6f7 100%);
  color: #fff; font-weight: 700; font-size: 12px; padding: 4px 8px;
  text-shadow: 1px 1px 1px rgba(0,0,0,.5); display: flex; justify-content: space-between; align-items: center;
}
.modal-inner { padding: 12px; font-size: 11px; }
.modal p#modalMsg { margin: 0 0 .75rem; color: #333; font-size: 11px; word-break: break-all; }
.modal .row { margin: 0 0 .9rem; }
.modal .btns { display: flex; gap: 6px; justify-content: flex-end; margin-top: 10px; }
.modal .btns > button { flex: none; min-width: 70px; }

/* ---------------- Tabbed Dialog Styling (Properties & Options) ---------------- */
.xp-tabs { display: flex; gap: 2px; border-bottom: 1px solid #919b9c; margin-bottom: 10px; padding: 0 2px; }
.xp-tab {
  padding: 3px 10px; background: #e0ded0; border: 1px solid #919b9c; border-bottom: none;
  border-radius: 3px 3px 0 0; cursor: pointer; font-size: 11px;
}
.xp-tab.active { background: #ece9d8; border-color: #919b9c; padding-bottom: 4px; margin-bottom: -1px; font-weight: 700; }
.xp-tab-content { border: 1px solid #919b9c; padding: 10px; background: #ece9d8; border-radius: 0 0 3px 3px; }
.prop-row { display: flex; margin-bottom: 6px; align-items: center; }
.prop-label { width: 95px; flex: none; color: #555; }
.prop-val { flex: 1; font-weight: 700; word-break: break-all; color: #000; }
.prop-sep { height: 1px; background: #c9c4b3; margin: 8px 0; }
.badge-apk { background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32; padding: 1px 6px; border-radius: 3px; font-weight: bold; }
.xp-select { border: 1px solid #7f9db9; background: #fff; border-radius: 2px; }

/* ---------------- Windows Media Player & Preview Window ---------------- */
.player-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: none; align-items: center; justify-content: center; z-index: 2500; padding: 1.5rem;
}
.player-backdrop.show { display: flex; }
.player-window {
  width: 100%; max-width: 860px; max-height: 90vh;
  background: #0f1523; border: 2px solid #204db5; border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.2) inset;
  display: flex; flex-direction: column; overflow: hidden;
  animation: modal-in .16s ease;
}
.player-titlebar {
  background: linear-gradient(180deg,#2a6fe0 0%,#1655d0 8%,#0c4bd6 40%,#1d63e8 60%,#3e93f5 88%,#5aa6f7 100%);
  color: #fff; font-weight: 700; font-size: 12px; padding: 4px 8px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #0831d9; flex: none; text-shadow: 1px 1px 1px rgba(0,0,0,.6);
}
.player-title-left { display: flex; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.player-toolbar {
  background: #1c2738; padding: 6px 10px; display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid #2e3e56; flex: none; flex-wrap: wrap;
}
.player-toolbar .btn-wmp {
  background: linear-gradient(180deg,#3b506f,#24344d); border: 1px solid #4f688e;
  color: #e6f0ff; border-radius: 3px; padding: 4px 10px; font-size: 11px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
}
.player-toolbar .btn-wmp:hover { background: linear-gradient(180deg,#4f6b95,#2d4364); border-color: #7093c4; color: #fff; }
.player-toolbar .btn-wmp.btn-download {
  background: linear-gradient(180deg,#2f8f4f,#1b6233); border-color: #49b56e; font-weight: 700;
}
.player-toolbar .btn-wmp.btn-download:hover { background: linear-gradient(180deg,#3ba75f,#24753e); }
.player-meta-badge {
  margin-left: auto; color: #8ba2c7; font-size: 11px; display: flex; align-items: center; gap: 10px;
}
.player-content {
  flex: 1; min-height: 240px; max-height: calc(90vh - 90px);
  background: #000; display: flex; align-items: center; justify-content: center;
  overflow: auto; position: relative;
}
.player-video {
  width: 100%; max-height: calc(90vh - 100px); outline: none; background: #000; display: block;
}
.player-audio-card {
  padding: 30px 20px; text-align: center; color: #fff; width: 100%; max-width: 480px;
}
.player-audio-viz {
  display: flex; justify-content: center; align-items: flex-end; gap: 4px; height: 60px; margin-bottom: 20px;
}
.player-audio-viz span {
  width: 8px; background: linear-gradient(0deg,#00e5ff,#3b82f6,#ec4899); border-radius: 2px;
  animation: viz-bounce 1s infinite ease-in-out alternate;
}
.player-audio-viz span:nth-child(2) { animation-delay: .2s; }
.player-audio-viz span:nth-child(3) { animation-delay: .4s; }
.player-audio-viz span:nth-child(4) { animation-delay: .1s; }
.player-audio-viz span:nth-child(5) { animation-delay: .5s; }
.player-audio-viz span:nth-child(6) { animation-delay: .3s; }
.player-audio-viz span:nth-child(7) { animation-delay: .6s; }
.player-audio-viz span:nth-child(8) { animation-delay: .25s; }
@keyframes viz-bounce { 0% { height: 8px; } 100% { height: 55px; } }
.player-audio-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; word-break: break-all; }
.player-audio-element { width: 100%; outline: none; }
.player-image { max-width: 100%; max-height: calc(90vh - 100px); object-fit: contain; }
.player-pdf { width: 100%; height: calc(90vh - 100px); border: none; background: #fff; }
.player-text {
  width: 100%; height: 100%; padding: 14px; margin: 0; color: #d6deeb; background: #011627;
  font-family: Consolas, "Courier New", monospace; font-size: 12px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-all; overflow: auto; text-align: left;
}
.player-generic {
  padding: 40px 20px; text-align: center; color: #cbd5e1;
}
.player-generic-icon { font-size: 48px; margin-bottom: 12px; display: block; }
.player-generic-name { font-size: 14px; font-weight: 700; margin-bottom: 6px; word-break: break-all; }
.player-generic-size { font-size: 12px; color: #94a3b8; margin-bottom: 20px; }

/* ================================================================
   WINDOWS MOBILE 6.1 (POCKET PC) RESPONSIVE & MOBILE THEME
   ================================================================ */
.wm-topbar, .wm-softkey-bar, .wm-start-menu, .wm-bottom-menu, .wm-dots-circle {
  display: none;
}

`;
var MOBILE_STYLE = `
  html, body {
    background: #000;
    overflow: hidden;
  }
  .page {
    padding: 0 !important;
    height: 100vh;
  }
  .xp-window {
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    height: 100vh !important;
  }

  /* Hide desktop-only controls */
  .xp-titlebar, .xp-menubar, .xp-statusbar, .xp-sidebar {
    display: none !important;
  }

  /* Show WM6 Taskbar */
  .wm-topbar {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    background: linear-gradient(180deg,#1c4475 0%,#13335b 50%,#0c2342 100%);
    border-bottom: 1px solid #2d5b94;
    color: #fff;
    padding: 0 4px;
    flex: none;
    z-index: 1000;
  }
  .wm-start-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(180deg,#3874b8 0%,#1a4982 50%,#10325d 100%);
    border: 1px solid #4a8ad4;
    border-radius: 4px;
    padding: 2px 7px;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,.4);
  }
  .wm-start-btn:active, .wm-start-btn.active {
    background: linear-gradient(180deg,#10325d,#3874b8);
  }
  .wm-flag-icon {
    width: 13px; height: 13px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1px;
  }
  .wm-flag-icon i:nth-child(1) { background: #f25022; }
  .wm-flag-icon i:nth-child(2) { background: #7fba00; }
  .wm-flag-icon i:nth-child(3) { background: #00a4ef; }
  .wm-flag-icon i:nth-child(4) { background: #ffb900; }

  .wm-top-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0,0,0,.8);
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .wm-top-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    color: #cfe2ff;
  }
  .wm-btn-close {
    width: 22px; height: 20px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(180deg,#f36d53,#c82314);
    border: 1px solid #ff917c;
    border-radius: 3px; color: #fff; font-weight: 700; font-size: 11px; cursor: pointer;
  }

  /* Address / Navigation bar in WM6 */
  .xp-addressbar {
    padding: 3px 6px !important;
    background: #e2eaf5 !important;
    border-bottom: 1px solid #b2c5dc !important;
  }
  .xp-address-label { display: none !important; }
  .xp-address-box {
    background: #fff !important;
    border: 1px solid #7c99bc !important;
    border-radius: 3px !important;
    padding: 4px 6px !important;
    font-size: 11.5px !important;
  }
  .xp-go { display: none !important; }

  /* Mobile toolbar */
  .xp-toolbar {
    padding: 3px 6px !important;
    background: #e8eef6 !important;
    display: flex !important;
    justify-content: space-between !important;
  }
  .xp-search-wrap {
    width: 100% !important;
    margin-left: 0 !important;
  }
  .xp-search-input {
    width: 100% !important;
  }
  .xp-tbtn, .xp-tb-sep {
    display: none !important;
  }

  /* Table styling for mobile touch */
  table.file-table thead th {
    padding: 6px 8px !important;
    font-size: 11px !important;
    background: #dbe4ef !important;
  }
  tbody tr td {
    padding: 8px 8px !important;
    font-size: 12px !important;
  }
  td.folder::before, td.file::before {
    width: 20px !important;
    height: 20px !important;
    background-size: 20px 20px !important;
  }

  /* WM6 Bottom Softkey Bar */
  .wm-softkey-bar {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    height: 38px;
    background: linear-gradient(180deg,#244872 0%,#153358 50%,#0c223e 100%);
    border-top: 1px solid #3c6596;
    padding: 0 10px;
    flex: none;
    z-index: 1000;
  }
  .wm-softkey {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    padding: 6px 12px;
    text-shadow: 1px 1px 2px rgba(0,0,0,.8);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .wm-softkey:active {
    color: #7bc4ff;
  }

  /* WM6 Start Menu (Top-Left Dropdown) */
  .wm-start-menu {
    position: fixed;
    top: 32px;
    left: 0;
    width: 230px;
    background: #112845;
    border: 2px solid #2d5b94;
    border-top: none;
    box-shadow: 4px 6px 20px rgba(0,0,0,.7);
    z-index: 3500;
    display: none;
  }
  .wm-start-menu.show { display: block; animation: modal-in .12s ease; }
  .wm-sm-header {
    background: linear-gradient(90deg,#1c4475,#3874b8);
    color: #fff; font-weight: 700; padding: 6px 10px; font-size: 11px;
    display: flex; align-items: center; gap: 6px;
  }
  .wm-sm-item {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; color: #fff; font-size: 12px; cursor: pointer;
    border-bottom: 1px solid #1c395e;
  }
  .wm-sm-item:hover, .wm-sm-item:active {
    background: #235c9c;
  }
  .wm-sm-item .ico { font-size: 14px; width: 18px; text-align: center; }

  /* WM6 Bottom Menu (Popup from Softkey) */
  .wm-bottom-menu {
    position: fixed;
    bottom: 38px;
    right: 0;
    width: 220px;
    background: #ece9d8;
    border: 2px solid #204575;
    border-bottom: none;
    box-shadow: -2px -4px 16px rgba(0,0,0,.6);
    z-index: 3500;
    display: none;
  }
  .wm-bottom-menu.show { display: block; animation: modal-in .12s ease; }
  .wm-bm-item {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; color: #000; font-size: 12px; cursor: pointer;
    border-bottom: 1px solid #c9c4b3;
  }
  .wm-bm-item:hover, .wm-bm-item:active {
    background: #316ac5; color: #fff;
  }
  .wm-bm-item .ico { font-size: 14px; width: 18px; text-align: center; }

  /* Tap and Hold Dots Animation */
  .wm-dots-circle {
    position: fixed;
    width: 38px;
    height: 38px;
    pointer-events: none;
    z-index: 4500;
    transform: translate(-50%, -50%);
  }
  .wm-dots-circle span {
    position: absolute; width: 5px; height: 5px; background: #00c3ff; border-radius: 50%;
    box-shadow: 0 0 4px #00e5ff;
    animation: wm-dot-anim 0.5s forwards ease-in-out;
  }
  .wm-dots-circle span:nth-child(1) { top: 0; left: 16px; }
  .wm-dots-circle span:nth-child(2) { top: 5px; left: 27px; animation-delay: .06s; }
  .wm-dots-circle span:nth-child(3) { top: 16px; left: 32px; animation-delay: .12s; }
  .wm-dots-circle span:nth-child(4) { top: 27px; left: 27px; animation-delay: .18s; }
  .wm-dots-circle span:nth-child(5) { top: 32px; left: 16px; animation-delay: .24s; }
  .wm-dots-circle span:nth-child(6) { top: 27px; left: 5px; animation-delay: .30s; }
  .wm-dots-circle span:nth-child(7) { top: 16px; left: 0; animation-delay: .36s; }
  .wm-dots-circle span:nth-child(8) { top: 5px; left: 5px; animation-delay: .42s; }
  @keyframes wm-dot-anim { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }

  /* Mobile Media Player overrides */
  .player-window {
    max-width: 100% !important;
    max-height: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
  }
  .player-backdrop {
    padding: 0 !important;
  }
  .player-content {
    max-height: calc(100vh - 85px) !important;
  }
`;
function humanSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
__name(humanSize, "humanSize");
__name2(humanSize, "humanSize");
function humanDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString(void 0, { dateStyle: "medium", timeStyle: "short" });
}
__name(humanDate, "humanDate");
__name2(humanDate, "humanDate");
function escText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escText, "escText");
__name2(escText, "escText");
function escAttr(s) {
  return escText(s).replace(/"/g, "&quot;");
}
__name(escAttr, "escAttr");
__name2(escAttr, "escAttr");
function extClass(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  const kind = m ? EXT_CATEGORY_MAP[m[1].toLowerCase()] : void 0;
  return kind ? ` file-ico-${kind}` : "";
}
__name(extClass, "extClass");
__name2(extClass, "extClass");
function renderRows(prefix, folders, files) {
  const folderRows = folders.map((f) => {
    const name = f.slice(prefix.length).replace(/\/$/, "");
    return `<tr data-type="folder" data-path="${escAttr(f)}">
        <td class="folder">${escText(name)}</td>
        <td class="size">\u2014</td>
        <td class="size">\u2014</td>
      </tr>`;
  }).join("");
  const fileRows = files.map((obj) => {
    const name = obj.key.slice(prefix.length);
    const size = obj.size || 0;
    const uploaded = obj.uploaded;
    return `<tr data-type="file" data-key="${escAttr(obj.key)}" data-size="${size}" data-uploaded="${escAttr(uploaded || "")}">
        <td class="file${extClass(name)}">${escText(name)}</td>
        <td class="size">${humanSize(size)}</td>
        <td class="size">${humanDate(uploaded)}</td>
      </tr>`;
  }).join("");
  const rows = folderRows + fileRows;
  return rows ? `<table class="file-table" id="fileTable">
        <thead>
          <tr>
            <th data-sort="name">Name <span id="sort-name" class="sort-arrow">\u25B2</span></th>
            <th data-sort="size" style="width:75px">Size <span id="sort-size" class="sort-arrow"></span></th>
            <th data-sort="date" style="width:125px">Modified <span id="sort-date" class="sort-arrow"></span></th>
          </tr>
        </thead>
        <tbody id="fileTableBody">${rows}</tbody>
      </table>` : `<div class="empty">This folder is empty.</div>`;
}
__name(renderRows, "renderRows");
__name2(renderRows, "renderRows");
function browserPage({ prefix, folders, files }) {
  const parts = prefix ? prefix.replace(/\/$/, "").split("/") : [];
  let crumbHtml = `<a href="/">\u{1F5B3} glztech</a>`;
  let acc = "";
  for (const p of parts) {
    acc += p + "/";
    crumbHtml += `<span class="sep">\\</span><a href="/?prefix=${encodeURIComponent(acc)}">${escText(p)}</a>`;
  }
  const currentFolderTitle = parts.length ? parts[parts.length - 1] : "File Explorer";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>dl.glztech.com \u2014 File Server</title>
<style>${STYLE}</style>
<style id="mobileStyles" media="(max-width: 768px)">${MOBILE_STYLE}</style>
</head>
<body>
<div id="topLoader"></div>

<!-- Windows Mobile 6.1 Top Taskbar -->
<div class="wm-topbar">
  <button class="wm-start-btn" id="wmStartBtn" onclick="toggleWmStartMenu(event)">
    <span class="wm-flag-icon"><i></i><i></i><i></i><i></i></span>
    <span>Start</span>
  </button>
  <div class="wm-top-title">
    <span>\u{1F4C2}</span> ${escText(currentFolderTitle)}
  </div>
  <div class="wm-top-status">
    <span>\u{1F4F6} 3G</span>
    <span id="wmClock">12:00</span>
    <button class="wm-btn-close" onclick="goUp()" title="Up one folder">\u2715</button>
  </div>
</div>

<!-- Windows Mobile 6.1 Start Menu Dropdown -->
<div class="wm-start-menu" id="wmStartMenu">
  <div class="wm-sm-header">
    <span class="wm-flag-icon"><i></i><i></i><i></i><i></i></span>
    <span>Windows Mobile 6.1</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); window.location.href='/'">
    <span class="ico">\u{1F3E0}</span> <span>My Device (Root)</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); goUp()">
    <span class="ico">\u2B06</span> <span>Up One Level</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); focusNewFolderMobile()">
    <span class="ico">\u{1F4C1}</span> <span>New Folder</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); document.getElementById('fileInput').click()">
    <span class="ico">\u{1F4E4}</span> <span>Upload Files</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); refreshList()">
    <span class="ico">\u{1F504}</span> <span>Refresh</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); toggleUiTheme()">
    <span class="ico">\u{1F5A5}\uFE0F</span> <span>Switch UI Mode (XP / WM6)</span>
  </div>
  <div class="wm-sm-item" onclick="closeWmMenus(); window.location.href='/logout'">
    <span class="ico">\u{1F6AA}</span> <span>Log Off</span>
  </div>
</div>

<div class="page">
<div class="xp-window">

  <!-- Desktop Window Titlebar -->
  <div class="xp-titlebar">
    <div class="xp-title-left"><span class="xp-title-icon">\u{1F5C0}</span> dl.glztech.com \u2014 glztech file server</div>
    <div class="xp-title-btns">
      <button title="Toggle Windows Mobile 6.1" onclick="toggleUiTheme()">\u{1F4F1}</button>
      <button title="Minimize">_</button>
      <button title="Maximize">\u25A1</button>
      <a class="xp-close" href="/logout" title="Sign out">\u2715</a>
    </div>
  </div>

  <!-- Interactive Desktop Menubar -->
  <div class="xp-menubar" id="xpMenubar">
    <!-- File Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuFile', event)" onmouseenter="onHoverMenu('menuFile')"><u>F</u>ile</button>
      <div class="xp-dropdown-menu" id="menuFile">
        <div class="xp-mi" onclick="focusNewFolder(); closeDesktopMenus()"><span class="ico">\u{1F4C1}</span> <span>New Folder</span></div>
        <div class="xp-mi" onclick="document.getElementById('fileInput').click(); closeDesktopMenus()"><span class="ico">\u{1F4E4}</span> <span>Upload Files...</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="menuDownload(); closeDesktopMenus()"><span class="ico">\u2B07</span> <span>Download</span></div>
        <div class="xp-mi" onclick="menuPlayPreview(); closeDesktopMenus()"><span class="ico">\u25B6</span> <span>Play / Preview</span> <span class="shortcut">Space</span></div>
        <div class="xp-mi" onclick="menuShare(); closeDesktopMenus()"><span class="ico">\u{1F517}</span> <span>Create Share Link...</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="menuRename(); closeDesktopMenus()"><span class="ico">\u270F\uFE0F</span> <span>Rename</span> <span class="shortcut">F2</span></div>
        <div class="xp-mi" onclick="menuDelete(); closeDesktopMenus()"><span class="ico">\u{1F5D1}\uFE0F</span> <span>Delete</span> <span class="shortcut">Del</span></div>
        <div class="xp-mi" onclick="menuProperties(); closeDesktopMenus()"><span class="ico">\u2139\uFE0F</span> <span>Properties</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="window.location.href='/logout'"><span class="ico">\u{1F6AA}</span> <span>Log Off</span></div>
      </div>
    </div>

    <!-- Edit Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuEdit', event)" onmouseenter="onHoverMenu('menuEdit')"><u>E</u>dit</button>
      <div class="xp-dropdown-menu" id="menuEdit">
        <div class="xp-mi" onclick="menuCopyKey(); closeDesktopMenus()"><span class="ico">\u{1F4CB}</span> <span>Copy File Path</span> <span class="shortcut">Ctrl+C</span></div>
        <div class="xp-mi" onclick="menuShare(); closeDesktopMenus()"><span class="ico">\u{1F517}</span> <span>Copy Share Link</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="menuSelectAll(); closeDesktopMenus()"><span class="ico">\u2611\uFE0F</span> <span>Select All</span> <span class="shortcut">Ctrl+A</span></div>
        <div class="xp-mi" onclick="menuInvertSelect(); closeDesktopMenus()"><span class="ico">\u{1F504}</span> <span>Invert Selection</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="document.getElementById('filterInput').focus(); closeDesktopMenus()"><span class="ico">\u{1F50D}</span> <span>Find in Folder...</span> <span class="shortcut">Ctrl+F</span></div>
      </div>
    </div>

    <!-- View Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuView', event)" onmouseenter="onHoverMenu('menuView')"><u>V</u>iew</button>
      <div class="xp-dropdown-menu" id="menuView">
        <div class="xp-mi" onclick="toggleSidebar(); closeDesktopMenus()"><span class="ico" id="chkSidebar">\u2713</span> <span>Folders Task Panel</span></div>
        <div class="xp-mi" onclick="toggleToolbar(); closeDesktopMenus()"><span class="ico" id="chkToolbar">\u2713</span> <span>Standard Buttons</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="toggleSort('name'); closeDesktopMenus()"><span class="ico">\u{1F524}</span> <span>Arrange by Name</span></div>
        <div class="xp-mi" onclick="toggleSort('size'); closeDesktopMenus()"><span class="ico">\u{1F4CA}</span> <span>Arrange by Size</span></div>
        <div class="xp-mi" onclick="toggleSort('date'); closeDesktopMenus()"><span class="ico">\u{1F4C5}</span> <span>Arrange by Date</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="refreshList(); closeDesktopMenus()"><span class="ico">\u{1F504}</span> <span>Refresh</span> <span class="shortcut">F5</span></div>
      </div>
    </div>

    <!-- Favorites Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuFav', event)" onmouseenter="onHoverMenu('menuFav')">F<u>a</u>vorites</button>
      <div class="xp-dropdown-menu" id="menuFav">
        <div class="xp-mi" onclick="addCurrentToFavorites(); closeDesktopMenus()"><span class="ico">\u2B50</span> <span>Add to Favorites...</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="window.location.href='/'; closeDesktopMenus()"><span class="ico">\u{1F3E0}</span> <span>Root Storage</span></div>
        <div id="dynamicFavorites"></div>
      </div>
    </div>

    <!-- Tools Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuTools', event)" onmouseenter="onHoverMenu('menuTools')"><u>T</u>ools</button>
      <div class="xp-dropdown-menu" id="menuTools">
        <div class="xp-mi" onclick="toggleUiTheme(); closeDesktopMenus()"><span class="ico">\u{1F4F1}</span> <span>Switch to Mobile View</span></div>
        <div class="xp-mi" onclick="showStorageStats(); closeDesktopMenus()"><span class="ico">\u{1F4BE}</span> <span>Storage Information...</span></div>
        <div class="xp-mi" onclick="showMapDriveModal(); closeDesktopMenus()"><span class="ico">\u{1F4C2}</span> <span>Map Network Drive (S3/R2)...</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="showFolderOptions(); closeDesktopMenus()"><span class="ico">\u2699\uFE0F</span> <span>Folder Options...</span></div>
      </div>
    </div>

    <!-- Help Menu -->
    <div class="xp-menu-wrap">
      <button class="xp-menu-btn" onclick="toggleDesktopMenu('menuHelp', event)" onmouseenter="onHoverMenu('menuHelp')"><u>H</u>elp</button>
      <div class="xp-dropdown-menu" id="menuHelp">
        <div class="xp-mi" onclick="showHelpTopics(); closeDesktopMenus()"><span class="ico">\u2753</span> <span>Help Topics</span></div>
        <div class="xp-menu-sep"></div>
        <div class="xp-mi" onclick="showAboutWindows(); closeDesktopMenus()"><span class="ico">\u{1FA9F}</span> <span>About Windows Server...</span></div>
      </div>
    </div>
  </div>

  <!-- Desktop Toolbar & Mobile Search -->
  <div class="xp-toolbar" id="xpToolbar">
    <button class="xp-tbtn" id="btnUp" onclick="goUp()" title="Up one level">\u2B06 Up</button>
    <span class="xp-tb-sep"></span>
    <button class="xp-tbtn" onclick="focusNewFolder()" title="Create a new folder">\u{1F4C1} New Folder</button>
    <button class="xp-tbtn" onclick="document.getElementById('fileInput').click()" title="Upload files">\u{1F4E4} Upload</button>
    <span class="xp-tb-sep"></span>
    <button class="xp-tbtn" onclick="refreshList()" title="Refresh">\u{1F504} Refresh</button>
    
    <!-- Filter search box -->
    <div class="xp-search-wrap" title="Filter files in current folder">
      <span class="xp-search-icon">\u{1F50D}</span>
      <input type="text" id="filterInput" class="xp-search-input" placeholder="Filter files..." oninput="onFilterChange(this.value)">
      <button type="button" id="filterClear" class="xp-search-clear" onclick="clearFilter()">\u2715</button>
    </div>
  </div>

  <!-- Address Bar -->
  <div class="xp-addressbar">
    <span class="xp-address-label">Address</span>
    <div class="xp-address-box"><span class="crumbs" style="display:flex">${crumbHtml}</span></div>
    <button class="xp-go" onclick="refreshList()">Go</button>
  </div>

  <!-- Body -->
  <div class="xp-body">
    <!-- Desktop Left Sidebar -->
    <div class="xp-sidebar" id="xpSidebar">
      <div class="xp-panel">
        <div class="xp-panel-title">\u{1F4C2} Folder Tasks</div>
        <div class="xp-panel-body">
          <div class="row">
            <input type="text" id="newFolder" placeholder="New folder name" onkeydown="if(event.key==='Enter')makeFolder()">
          </div>
          <div class="row">
            <button class="primary" style="width:100%" onclick="makeFolder()">Create folder</button>
          </div>
          <div class="dropzone" id="dropzone" onclick="document.getElementById('fileInput').click()">
            <span class="big">\u2B06\uFE0F</span>
            Drag files here,<br>or click to choose
          </div>
          <input type="file" id="fileInput" multiple style="display:none">
          <div id="selectedFiles"></div>
          <div class="row" id="uploadActions" style="display:none;margin-top:6px;">
            <button class="primary" style="width:100%" onclick="doUpload()">Upload Files</button>
          </div>
          <div class="progress" id="progressWrap"><div id="progressBar"></div></div>
          <div class="muted" id="progressLabel" style="display:none;margin-top:4px;"></div>
          <div class="err" id="uploadErr"></div>
        </div>
      </div>

      <div class="xp-panel">
        <div class="xp-panel-title">\u2139\uFE0F Details</div>
        <div class="xp-panel-body muted" id="statusInfo"></div>
      </div>
    </div>

    <!-- Main File Explorer View -->
    <div class="xp-main" id="xpMain">
      <div id="listContainer">${renderRows(prefix, folders, files)}</div>
    </div>
  </div>

  <!-- Desktop Status Bar -->
  <div class="xp-statusbar">
    <span class="cell" id="statusbarSummary">Ready</span>
    <span class="cell" id="clock"></span>
  </div>

</div>
</div>

<!-- Windows Mobile 6.1 Bottom Softkey Bar -->
<div class="wm-softkey-bar">
  <button class="wm-softkey" onclick="goUp()">
    <span>\u2B06 Up</span>
  </button>
  <button class="wm-softkey" id="wmMenuBtn" onclick="toggleWmBottomMenu(event)">
    <span>Menu \u25B4</span>
  </button>
</div>

<!-- Windows Mobile 6.1 Bottom Softkey Popup Menu -->
<div class="wm-bottom-menu" id="wmBottomMenu">
  <div class="wm-bm-item" onclick="closeWmMenus(); document.getElementById('fileInput').click()">
    <span class="ico">\u{1F4E4}</span> <span>Upload Files</span>
  </div>
  <div class="wm-bm-item" onclick="closeWmMenus(); focusNewFolderMobile()">
    <span class="ico">\u{1F4C1}</span> <span>New Folder</span>
  </div>
  <div class="wm-bm-item" onclick="closeWmMenus(); toggleMobileSearch()">
    <span class="ico">\u{1F50D}</span> <span>Filter / Search</span>
  </div>
  <div class="wm-bm-item" onclick="closeWmMenus(); refreshList()">
    <span class="ico">\u{1F504}</span> <span>Refresh</span>
  </div>
  <div class="wm-bm-item" onclick="closeWmMenus(); toggleUiTheme()">
    <span class="ico">\u{1F5A5}\uFE0F</span> <span>Switch UI Theme</span>
  </div>
  <div class="wm-bm-item" onclick="closeWmMenus(); window.location.href='/logout'">
    <span class="ico">\u{1F6AA}</span> <span>Log Off</span>
  </div>
</div>

<!-- Stylus Tap-and-Hold Dots Indicator -->
<div class="wm-dots-circle" id="wmDotsCircle">
  <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
</div>

<!-- Context Menu -->
<div class="ctx-menu" id="ctxMenu" role="menu" aria-label="File actions"></div>

<!-- Generic Alert / Prompt Modal -->
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal">
    <div class="modal-titlebar" id="modalTitle"></div>
    <div class="modal-inner">
      <p id="modalMsg" style="display:none"></p>
      <div class="row" id="modalInputRow" style="display:none">
        <input type="text" id="modalInput">
      </div>
      <div class="btns">
        <button class="secondary" id="modalCancel">Cancel</button>
        <button id="modalOk">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- Custom Dialog Modal (Properties / About / Folder Options / Storage / Share) -->
<div class="modal-backdrop" id="customDialogBackdrop">
  <div class="modal" id="customDialogWindow" style="max-width:540px;width:95%;">
    <div class="modal-titlebar">
      <span id="customDialogTitle">Properties</span>
      <button class="xp-close" onclick="closeCustomDialog()" style="width:19px;height:18px;font-size:10px;">\u2715</button>
    </div>
    <div class="modal-inner" id="customDialogBody"></div>
  </div>
</div>

<!-- Windows Media Player & Preview Window -->
<div class="player-backdrop" id="playerBackdrop">
  <div class="player-window" id="playerWindow">
    <div class="player-titlebar">
      <div class="player-title-left" id="playerTitle">\u{1F3AC} Windows Media Player</div>
      <div class="xp-title-btns">
        <button class="xp-close" onclick="closePlayer()" title="Close (Esc)">\u2715</button>
      </div>
    </div>
    <div class="player-toolbar">
      <button class="btn-wmp btn-download" id="playerDownloadBtn" onclick="playerDownloadCurrent()" title="Download file to device">
        <span>\u2B07</span> Download File
      </button>
      <button class="btn-wmp" id="playerShareBtn" onclick="playerShareCurrent()" title="Get a public share link">
        <span>\u{1F517}</span> Share Link
      </button>
      <button class="btn-wmp" id="playerNewTabBtn" onclick="playerOpenNewTab()" title="Open raw stream in new tab">
        <span>\u2197</span> Raw Stream
      </button>
      <div class="player-meta-badge" id="playerMetaBadge"></div>
    </div>
    <div class="player-content" id="playerContent"></div>
  </div>
</div>

<!-- Notification Toasts -->
<div id="toasts"></div>

<script>
const PREFIX = ${JSON.stringify(prefix).replace(/<\//g, "<\\/")};
let currentFolders = ${JSON.stringify(folders).replace(/<\//g, "<\\/")};
let currentFiles = ${JSON.stringify(files).replace(/<\//g, "<\\/")};
let selected = []; // upload queue [{ file, name }]
let pendingCount = 0;
let currentSelectedRow = null;
let currentActiveKey = null;
let sortState = { col: 'name', asc: true };
let currentFilterText = '';
let activeDesktopMenu = null;

// Check saved UI theme preference (XP vs Windows Mobile 6.1)
function initTheme() {
  const saved = localStorage.getItem('glz_ui_mode');
  if (saved === 'wm6') {
    document.body.classList.add('mode-wm6');
  } else if (saved === 'xp') {
    document.body.classList.remove('mode-wm6');
  }
  document.getElementById('mobileStyles').media = saved === 'wm6' ? 'all' : '(max-width: 768px)';
}
initTheme();

function toggleUiTheme() {
  const isWm6 = document.body.classList.toggle('mode-wm6');
  document.getElementById('mobileStyles').media = isWm6 ? 'all' : '(max-width: 768px)';
  localStorage.setItem('glz_ui_mode', isWm6 ? 'wm6' : 'xp');
  showToast(isWm6 ? 'Switched to Windows Mobile 6.1 mode.' : 'Switched to Desktop Windows XP mode.');
}

// ---------------- Desktop Menubar Functionality ----------------
function toggleDesktopMenu(menuId, e) {
  if (e) e.stopPropagation();
  closeCtxMenu();
  closeWmMenus();
  const el = document.getElementById(menuId);
  const btn = el.previousElementSibling;
  if (activeDesktopMenu === menuId) {
    closeDesktopMenus();
  } else {
    closeDesktopMenus();
    el.classList.add('show');
    btn.classList.add('active');
    activeDesktopMenu = menuId;
  }
}

function onHoverMenu(menuId) {
  if (activeDesktopMenu && activeDesktopMenu !== menuId) {
    toggleDesktopMenu(menuId);
  }
}

function closeDesktopMenus() {
  document.querySelectorAll('.xp-dropdown-menu').forEach((m) => m.classList.remove('show'));
  document.querySelectorAll('.xp-menu-btn').forEach((b) => b.classList.remove('active'));
  activeDesktopMenu = null;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.xp-menu-wrap')) {
    closeDesktopMenus();
  }
});

// Menubar Commands
function menuDownload() {
  if (currentSelectedRow && currentSelectedRow.dataset.type === 'file') {
    downloadFile(currentSelectedRow.dataset.key);
  } else {
    showToast('Select a file to download.', true);
  }
}

function menuPlayPreview() {
  if (currentSelectedRow && currentSelectedRow.dataset.type === 'file') {
    openPlayer(currentSelectedRow.dataset.key);
  } else {
    showToast('Select a media or document file to preview.', true);
  }
}

function menuShare() {
  if (currentSelectedRow && currentSelectedRow.dataset.type === 'file') {
    shareFile(currentSelectedRow.dataset.key);
  } else {
    showToast('Select a file to create a share link.', true);
  }
}

function menuRename() {
  if (currentSelectedRow) {
    if (currentSelectedRow.dataset.type === 'folder') renameFolder(currentSelectedRow.dataset.path);
    else renameFile(currentSelectedRow.dataset.key);
  } else {
    showToast('Select an item to rename.', true);
  }
}

function menuDelete() {
  if (currentSelectedRow) {
    if (currentSelectedRow.dataset.type === 'folder') delFolder(currentSelectedRow.dataset.path);
    else delFile(currentSelectedRow.dataset.key);
  } else {
    showToast('Select an item to delete.', true);
  }
}

function menuCopyKey() {
  if (currentSelectedRow) {
    const key = currentSelectedRow.dataset.type === 'folder' ? currentSelectedRow.dataset.path : currentSelectedRow.dataset.key;
    navigator.clipboard.writeText(key).then(() => showToast('Path copied to clipboard.')).catch(() => {});
  } else {
    showToast('Select an item first.', true);
  }
}

function menuSelectAll() {
  const firstRow = document.querySelector('tbody tr');
  if (firstRow) selectRow(firstRow);
  showToast('All items ready.');
}

function menuInvertSelect() {
  const rows = Array.from(document.querySelectorAll('tbody tr'));
  if (!rows.length) return;
  const currIdx = rows.indexOf(currentSelectedRow);
  const nextIdx = (currIdx + 1) % rows.length;
  selectRow(rows[nextIdx]);
}

function toggleSidebar() {
  const sb = document.getElementById('xpSidebar');
  const chk = document.getElementById('chkSidebar');
  const isHidden = sb.style.display === 'none';
  sb.style.display = isHidden ? 'block' : 'none';
  if (chk) chk.textContent = isHidden ? '\u2713' : '';
}

function toggleToolbar() {
  const tb = document.getElementById('xpToolbar');
  const chk = document.getElementById('chkToolbar');
  const isHidden = tb.style.display === 'none';
  tb.style.display = isHidden ? 'flex' : 'none';
  if (chk) chk.textContent = isHidden ? '\u2713' : '';
}

function addCurrentToFavorites() {
  const name = PREFIX ? PREFIX.replace(/\\/$/, '').split('/').pop() : 'Root';
  const favs = JSON.parse(localStorage.getItem('glz_favs') || '[]');
  if (!favs.some((f) => f.prefix === PREFIX)) {
    favs.push({ name, prefix: PREFIX });
    localStorage.setItem('glz_favs', JSON.stringify(favs));
    renderFavoritesMenu();
    showToast('Added "' + name + '" to Favorites.');
  } else {
    showToast('Folder is already in Favorites.');
  }
}

function renderFavoritesMenu() {
  const wrap = document.getElementById('dynamicFavorites');
  if (!wrap) return;
  const favs = JSON.parse(localStorage.getItem('glz_favs') || '[]');
  wrap.innerHTML = '';
  favs.forEach((f) => {
    const mi = document.createElement('div');
    mi.className = 'xp-mi';
    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = '\u{1F4C1}';
    const label = document.createElement('span');
    label.textContent = f.name;
    mi.appendChild(ico);
    mi.appendChild(label);
    mi.onclick = () => {
      window.location.href = '/?prefix=' + encodeURIComponent(f.prefix);
      closeDesktopMenus();
    };
    wrap.appendChild(mi);
  });
}
renderFavoritesMenu();

// ---------------- Custom XP Dialogs ----------------
function openCustomDialog(title, contentHtml) {
  document.getElementById('customDialogTitle').textContent = title;
  document.getElementById('customDialogBody').innerHTML = contentHtml;
  document.getElementById('customDialogBackdrop').classList.add('show');
}

function closeCustomDialog() {
  document.getElementById('customDialogBackdrop').classList.remove('show');
}

function menuProperties() {
  if (!currentSelectedRow) {
    showFolderProperties(PREFIX);
    return;
  }
  const type = currentSelectedRow.dataset.type;
  if (type === 'file') {
    const key = currentSelectedRow.dataset.key;
    const name = key.slice(PREFIX.length);
    const size = Number(currentSelectedRow.dataset.size || 0);
    const uploaded = currentSelectedRow.dataset.uploaded;
    const cat = getFileTypeCategory(name);

    openCustomDialog(name + ' Properties',
      '<div class="xp-tabs"><div class="xp-tab active">General</div><div class="xp-tab">R2 Storage</div></div>' +
      '<div class="xp-tab-content">' +
        '<div class="prop-row"><div class="prop-label">File name:</div><div class="prop-val">' + cEscText(name) + '</div></div>' +
        '<div class="prop-row"><div class="prop-label">Type of file:</div><div class="prop-val">' + cat.toUpperCase() + ' File (' + cEscText(key.split('.').pop() || 'file') + ')</div></div>' +
        '<div class="prop-row"><div class="prop-label">Location:</div><div class="prop-val">' + cEscText(key) + '</div></div>' +
        '<div class="prop-sep"></div>' +
        '<div class="prop-row"><div class="prop-label">Size:</div><div class="prop-val">' + humanSizeJs(size) + ' (' + size.toLocaleString() + ' bytes)</div></div>' +
        '<div class="prop-row"><div class="prop-label">Modified:</div><div class="prop-val">' + humanDateJs(uploaded) + '</div></div>' +
        '<div class="prop-sep"></div>' +
        '<div class="prop-row"><div class="prop-label">Attributes:</div><div class="prop-val"><label><input type="checkbox" checked disabled> Archive</label> <label><input type="checkbox" disabled> Hidden</label></div></div>' +
      '</div>' +
      '<div class="btns" style="margin-top:10px;"><button class="primary" onclick="closeCustomDialog()">OK</button></div>'
    );
  } else {
    showFolderProperties(currentSelectedRow.dataset.path);
  }
}

function showFolderProperties(folderPath) {
  const name = folderPath ? folderPath.replace(/\\/$/, '').split('/').pop() : 'Root Directory';
  openCustomDialog(name + ' Properties',
    '<div class="xp-tabs"><div class="xp-tab active">General</div></div>' +
    '<div class="xp-tab-content">' +
      '<div class="prop-row"><div class="prop-label">Folder name:</div><div class="prop-val">' + cEscText(name) + '</div></div>' +
      '<div class="prop-row"><div class="prop-label">Type:</div><div class="prop-val">File Folder</div></div>' +
      '<div class="prop-row"><div class="prop-label">Location:</div><div class="prop-val">' + cEscText(folderPath || '/') + '</div></div>' +
      '<div class="prop-sep"></div>' +
      '<div class="prop-row"><div class="prop-label">Contains:</div><div class="prop-val">' + currentFiles.length + ' Files, ' + currentFolders.length + ' Folders</div></div>' +
      '<div class="prop-row"><div class="prop-label">Size:</div><div class="prop-val">' + humanSizeJs(currentFiles.reduce((a,b)=>a+(b.size||0),0)) + '</div></div>' +
    '</div>' +
    '<div class="btns" style="margin-top:10px;"><button class="primary" onclick="closeCustomDialog()">OK</button></div>'
  );
}

function showAboutWindows() {
  openCustomDialog('About Windows Server',
    '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">' +
      '<div style="font-size:32px;">\u{1FA9F}</div>' +
      '<div>' +
        '<div style="font-size:14px;font-weight:700;">Microsoft Windows Server 2003 / Windows XP</div>' +
        '<div style="color:#555;font-size:10.5px;">Cloudflare Workers & R2 Storage Edition</div>' +
      '</div>' +
    '</div>' +
    '<div class="prop-sep"></div>' +
    '<div style="line-height:1.6;font-size:11px;color:#333;">' +
      '<div><b>Version:</b> 5.2 (Build 3790.srv03_sp2_rtm.dl.glztech.com)</div>' +
      '<div><b>Runtime:</b> Cloudflare Workers V8 Engine</div>' +
      '<div><b>Storage Backend:</b> Cloudflare R2 Global Bucket (<code>glz-files</code>)</div>' +
      '<div><b>KV Cache:</b> Cloudflare KV Links Namespace</div>' +
      '<div style="margin-top:10px;">This product is licensed to:<br><b>Administrator</b><br>glztech Systems</div>' +
    '</div>' +
    '<div class="btns" style="margin-top:14px;"><button class="primary" onclick="closeCustomDialog()">OK</button></div>'
  );
}

function showStorageStats() {
  const totalFolderSize = currentFiles.reduce((a,b)=>a+(b.size||0),0);
  openCustomDialog('Storage Information',
    '<div class="prop-row"><div class="prop-label">Bucket:</div><div class="prop-val"><code>glz-files</code> (Cloudflare R2)</div></div>' +
    '<div class="prop-row"><div class="prop-label">Current Folder:</div><div class="prop-val">' + cEscText(PREFIX || '/') + '</div></div>' +
    '<div class="prop-row"><div class="prop-label">Items Count:</div><div class="prop-val">' + currentFiles.length + ' file(s), ' + currentFolders.length + ' folder(s)</div></div>' +
    '<div class="prop-row"><div class="prop-label">Total Size:</div><div class="prop-val">' + humanSizeJs(totalFolderSize) + ' (' + totalFolderSize.toLocaleString() + ' bytes)</div></div>' +
    '<div class="prop-sep"></div>' +
    '<div class="muted">Cloudflare R2 storage has zero egress fees and distributed low-latency streaming.</div>' +
    '<div class="btns" style="margin-top:12px;"><button class="primary" onclick="closeCustomDialog()">Close</button></div>'
  );
}

function showMapDriveModal() {
  openCustomDialog('Map Network Drive (S3 / R2)',
    '<div style="line-height:1.5;font-size:11px;">' +
      '<div>You can connect directly to this storage bucket using S3 clients such as <b>Cyberduck</b>, <b>rclone</b>, or <b>WinSCP</b>:</div>' +
      '<div style="margin:8px 0;background:#fff;border:1px solid #7f9db9;padding:6px;font-family:monospace;font-size:10.5px;">' +
        'Type: S3 Compatible<br>' +
        'Server: https://&lt;ACCOUNT_ID&gt;.r2.cloudflarestorage.com<br>' +
        'Bucket: glz-files' +
      '</div>' +
    '</div>' +
    '<div class="btns"><button class="primary" onclick="closeCustomDialog()">Done</button></div>'
  );
}

function showFolderOptions() {
  openCustomDialog('Folder Options',
    '<div class="xp-tabs"><div class="xp-tab active">General</div><div class="xp-tab">View</div><div class="xp-tab">File Types</div></div>' +
    '<div class="xp-tab-content">' +
      '<div style="font-weight:700;margin-bottom:6px;">Tasks</div>' +
      '<label><input type="radio" checked name="tasks"> Show common tasks in folders</label><br>' +
      '<label><input type="radio" name="tasks"> Use Windows classic folders</label>' +
      '<div class="prop-sep"></div>' +
      '<div style="font-weight:700;margin-bottom:6px;">Click items as follows</div>' +
      '<label><input type="radio" name="click"> Single-click to open an item</label><br>' +
      '<label><input type="radio" checked name="click"> Double-click to open an item (single-click to select)</label>' +
    '</div>' +
    '<div class="btns" style="margin-top:10px;"><button class="primary" onclick="closeCustomDialog()">OK</button></div>'
  );
}

function showHelpTopics() {
  openCustomDialog('Windows Explorer Help',
    '<div style="line-height:1.6;font-size:11px;">' +
      '<b>Keyboard Shortcuts:</b><br>' +
      '\u2022 <b>Enter:</b> Open folder or play media<br>' +
      '\u2022 <b>Space:</b> Quick Preview Player<br>' +
      '\u2022 <b>Delete:</b> Delete selected item<br>' +
      '\u2022 <b>F2:</b> Rename selected item<br>' +
      '\u2022 <b>Ctrl+F:</b> Filter search in folder<br>' +
      '\u2022 <b>F5:</b> Refresh file listing<br>' +
      '<div class="prop-sep"></div>' +
      '<b>Media Streaming:</b><br>' +
      'Double-clicking on video/audio streams natively with HTTP Range seeking.' +
    '</div>' +
    '<div class="btns" style="margin-top:10px;"><button class="primary" onclick="closeCustomDialog()">Close</button></div>'
  );
}

// Live Clock
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fullTimeStr = timeStr + ':' + String(now.getSeconds()).padStart(2, '0') + '  ' + now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  const deskClock = document.getElementById('clock');
  if (deskClock) deskClock.textContent = fullTimeStr;
  const wmClock = document.getElementById('wmClock');
  if (wmClock) wmClock.textContent = timeStr;
}
updateClock();
setInterval(updateClock, 1000);

function updateStatusInfo(folders, files) {
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const parts = [];
  if (folders.length) parts.push(folders.length + ' folder' + (folders.length === 1 ? '' : 's'));
  parts.push(files.length + ' file' + (files.length === 1 ? '' : 's'));
  if (totalSize) parts.push(humanSizeJs(totalSize));
  
  const text = parts.join(' \xB7 ');
  const infoEl = document.getElementById('statusInfo');
  if (infoEl) infoEl.textContent = text;
  const statEl = document.getElementById('statusbarSummary');
  if (statEl) statEl.textContent = text || 'Ready';
}
updateStatusInfo(currentFolders, currentFiles);

function goUp() {
  const trimmed = PREFIX.endsWith('/') ? PREFIX.slice(0, -1) : PREFIX;
  if (!trimmed) return;
  const idx = trimmed.lastIndexOf('/');
  const parent = idx === -1 ? '' : trimmed.slice(0, idx + 1);
  window.location.href = '/?prefix=' + encodeURIComponent(parent);
}
const btnUp = document.getElementById('btnUp');
if (btnUp) btnUp.disabled = !PREFIX;

function focusNewFolder() {
  const el = document.getElementById('newFolder');
  if (el) {
    el.scrollIntoView({ block: 'center' });
    el.focus();
  }
}

async function focusNewFolderMobile() {
  const name = await showPromptModal('New Folder', 'New Folder');
  if (!name) return;
  const res = await withLoading(fetch('/api/mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: PREFIX, name })
  }));
  if (!res.ok) { await showAlert('Could not create folder', await readError(res)); return; }
  showToast('Folder created.');
  await refreshList();
}

function toggleMobileSearch() {
  const input = document.getElementById('filterInput');
  input.focus();
}

// Windows Mobile 6.1 Menu Handlers
function toggleWmStartMenu(e) {
  e.stopPropagation();
  closeCtxMenu();
  closeDesktopMenus();
  closeWmBottomMenu();
  document.getElementById('wmStartMenu').classList.toggle('show');
}

function toggleWmBottomMenu(e) {
  e.stopPropagation();
  closeCtxMenu();
  closeDesktopMenus();
  closeWmStartMenu();
  document.getElementById('wmBottomMenu').classList.toggle('show');
}

function closeWmStartMenu() {
  const el = document.getElementById('wmStartMenu');
  if (el) el.classList.remove('show');
}

function closeWmBottomMenu() {
  const el = document.getElementById('wmBottomMenu');
  if (el) el.classList.remove('show');
}

function closeWmMenus() {
  closeWmStartMenu();
  closeWmBottomMenu();
}

document.addEventListener('click', () => {
  closeWmMenus();
});

function setLoading(on) {
  pendingCount += on ? 1 : -1;
  document.getElementById('topLoader').classList.toggle('show', pendingCount > 0);
}

async function withLoading(promise) {
  setLoading(true);
  try { return await promise; } finally { setLoading(false); }
}

function showToast(message, isErr) {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .25s';
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

function cEscText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cEscAttr(s) {
  return cEscText(s).replace(/"/g, '&quot;');
}

function humanSizeJs(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function humanDateJs(iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const EXT_ICON_MAP_JS = {
  apk: 'apk', iso: 'iso', img: 'iso', bin: 'iso',
  zip: 'zip', rar: 'zip', '7z': 'zip', tar: 'zip', gz: 'zip',
  pdf: 'pdf',
  jpg: 'img', jpeg: 'img', png: 'img', gif: 'img', webp: 'img', svg: 'img', bmp: 'img',
  mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio', m4a: 'audio',
  mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
  exe: 'exe', msi: 'exe', doc: 'doc', docx: 'doc', xls: 'xls', xlsx: 'xls', csv: 'xls',
};

function extClassJs(name) {
  const m = /\\.([a-z0-9]+)$/i.exec(name);
  const kind = m ? EXT_ICON_MAP_JS[m[1].toLowerCase()] : undefined;
  return kind ? ' file-ico-' + kind : '';
}

function getFileTypeCategory(name) {
  const m = /\\.([a-z0-9]+)$/i.exec(name.toLowerCase());
  if (!m) return 'unknown';
  const ext = m[1];
  if (['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'log', 'json', 'md', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'yaml', 'yml', 'sh', 'py'].includes(ext)) return 'text';
  return 'binary';
}

// ---------------- Row Selection & Click Handling ----------------
function selectRow(tr) {
  if (currentSelectedRow) currentSelectedRow.classList.remove('selected');
  currentSelectedRow = tr;
  tr.classList.add('selected');

  const type = tr.dataset.type;
  if (type === 'file') {
    const key = tr.dataset.key;
    const size = Number(tr.dataset.size || 0);
    const name = key.slice(PREFIX.length);
    const sumEl = document.getElementById('statusbarSummary');
    if (sumEl) sumEl.textContent = name + ' (' + humanSizeJs(size) + ') selected';
  } else if (type === 'folder') {
    const path = tr.dataset.path;
    const name = path.slice(PREFIX.length).replace(/\\/$/, '');
    const sumEl = document.getElementById('statusbarSummary');
    if (sumEl) sumEl.textContent = 'Folder: ' + name;
  }
}

function openFolder(folderPath) {
  window.location.href = '/?prefix=' + encodeURIComponent(folderPath);
}

function onFileDblClick(key) {
  const name = key.slice(PREFIX.length);
  const cat = getFileTypeCategory(name);
  if (['video', 'audio', 'image', 'pdf', 'text'].includes(cat)) {
    openPlayer(key);
  } else {
    downloadFile(key);
  }
}

// ---------------- Filtering / Searching ----------------
function onFilterChange(val) {
  currentFilterText = val.toLowerCase().trim();
  document.getElementById('filterClear').classList.toggle('show', !!currentFilterText);
  applyFilterAndSort();
}

function clearFilter() {
  const input = document.getElementById('filterInput');
  input.value = '';
  onFilterChange('');
  input.focus();
}

// ---------------- Sorting ----------------
function toggleSort(col) {
  if (sortState.col === col) {
    sortState.asc = !sortState.asc;
  } else {
    sortState.col = col;
    sortState.asc = true;
  }
  updateSortIndicators();
  applyFilterAndSort();
}

function updateSortIndicators() {
  ['name', 'size', 'date'].forEach((c) => {
    const el = document.getElementById('sort-' + c);
    if (!el) return;
    if (sortState.col === c) {
      el.textContent = sortState.asc ? '\u25B2' : '\u25BC';
    } else {
      el.textContent = '';
    }
  });
}

function applyFilterAndSort() {
  let filteredFolders = currentFolders;
  let filteredFiles = currentFiles;

  if (currentFilterText) {
    filteredFolders = currentFolders.filter((f) => {
      const name = f.slice(PREFIX.length).replace(/\\/$/, '');
      return name.toLowerCase().includes(currentFilterText);
    });
    filteredFiles = currentFiles.filter((f) => {
      const name = f.key.slice(PREFIX.length);
      return name.toLowerCase().includes(currentFilterText);
    });
  }

  // Sort within folders and files
  const { col, asc } = sortState;
  const factor = asc ? 1 : -1;

  filteredFolders.sort((a, b) => {
    const nameA = a.slice(PREFIX.length);
    const nameB = b.slice(PREFIX.length);
    return nameA.localeCompare(nameB) * factor;
  });

  filteredFiles.sort((a, b) => {
    if (col === 'name') {
      const nameA = a.key.slice(PREFIX.length);
      const nameB = b.key.slice(PREFIX.length);
      return nameA.localeCompare(nameB) * factor;
    } else if (col === 'size') {
      return ((a.size || 0) - (b.size || 0)) * factor;
    } else if (col === 'date') {
      const dateA = a.uploaded ? new Date(a.uploaded).getTime() : 0;
      const dateB = b.uploaded ? new Date(b.uploaded).getTime() : 0;
      return (dateA - dateB) * factor;
    }
    return 0;
  });

  renderRowsClient(filteredFolders, filteredFiles);
  if (currentFilterText) {
    const sumEl = document.getElementById('statusbarSummary');
    if (sumEl) {
      sumEl.textContent = 'Filtered: ' + (filteredFolders.length + filteredFiles.length) + ' of ' + (currentFolders.length + currentFiles.length) + ' items';
    }
  } else {
    updateStatusInfo(currentFolders, currentFiles);
  }
}

function renderRowsClient(folders, files) {
  currentSelectedRow = null;
  const folderRows = folders.map((f) => {
    const name = f.slice(PREFIX.length).replace(/\\/$/, '');
    return '<tr data-type="folder" data-path="' + cEscAttr(f) + '">' +
      '<td class="folder">' + cEscText(name) + '</td>' +
      '<td class="size">\u2014</td><td class="size">\u2014</td>' +
      '</tr>';
  }).join('');

  const fileRows = files.map((obj) => {
    const name = obj.key.slice(PREFIX.length);
    const size = obj.size || 0;
    const uploaded = obj.uploaded || '';
    return '<tr data-type="file" data-key="' + cEscAttr(obj.key) + '" data-size="' + size + '" data-uploaded="' + cEscAttr(uploaded) + '">' +
      '<td class="file' + extClassJs(name) + '">' + cEscText(name) + '</td>' +
      '<td class="size">' + humanSizeJs(size) + '</td>' +
      '<td class="size">' + humanDateJs(uploaded) + '</td>' +
      '</tr>';
  }).join('');

  const rows = folderRows + fileRows;
  const container = document.getElementById('listContainer');
  container.innerHTML = rows
    ? '<table class="file-table" id="fileTable">' +
        '<thead><tr>' +
          '<th data-sort="name">Name <span id="sort-name" class="sort-arrow"></span></th>' +
          '<th data-sort="size" style="width:75px">Size <span id="sort-size" class="sort-arrow"></span></th>' +
          '<th data-sort="date" style="width:125px">Modified <span id="sort-date" class="sort-arrow"></span></th>' +
        '</tr></thead>' +
        '<tbody id="fileTableBody">' + rows + '</tbody>' +
      '</table>'
    : '<div class="empty">This folder is empty.</div>';

  updateSortIndicators();
}

// ---------------- Event Delegation & Tap-and-Hold for Touch ----------------
const listContainer = document.getElementById('listContainer');

listContainer.addEventListener('click', (e) => {
  if (Date.now() < suppressTouchClickUntil) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const th = e.target.closest('thead th');
  if (th && th.dataset.sort) {
    toggleSort(th.dataset.sort);
    return;
  }
  const tr = e.target.closest('tbody tr');
  if (tr) selectRow(tr);
});

listContainer.addEventListener('dblclick', (e) => {
  if (Date.now() < suppressTouchClickUntil) return;
  const tr = e.target.closest('tbody tr');
  if (!tr) return;
  if (tr.dataset.type === 'folder') {
    openFolder(tr.dataset.path);
  } else if (tr.dataset.type === 'file') {
    onFileDblClick(tr.dataset.key);
  }
});

document.getElementById('xpMain').addEventListener('contextmenu', (e) => {
  cancelTouch();
  const tr = e.target.closest('tbody tr');
  if (tr) {
    selectRow(tr);
    openCtxMenu(e, tr.dataset.type, tr.dataset.type === 'folder' ? tr.dataset.path : tr.dataset.key);
  } else {
    openCtxMenu(e, 'main');
  }
});

// Pocket PC Tap-and-Hold (Touch Devices)
let touchTimer = null;
let touchStartPos = { x: 0, y: 0 };
let touchRow = null;
let touchHeld = false;
let suppressTouchClickUntil = 0;
const dotsEl = document.getElementById('wmDotsCircle');

function cancelTouch() {
  clearTimeout(touchTimer);
  touchTimer = null;
  touchRow = null;
  dotsEl.style.display = 'none';
}

listContainer.addEventListener('touchstart', (e) => {
  cancelTouch();
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  const tr = e.target.closest('tbody tr');
  if (!tr) return;
  closeCtxMenu();
  touchRow = tr;
  touchHeld = false;
  suppressTouchClickUntil = Date.now() + 1500;
  touchStartPos = { x: touch.clientX, y: touch.clientY };
  dotsEl.style.left = touch.clientX + 'px';
  dotsEl.style.top = touch.clientY + 'px';
  dotsEl.style.display = 'block';

  touchTimer = setTimeout(() => {
    touchHeld = true;
    suppressTouchClickUntil = Date.now() + 1500;
    dotsEl.style.display = 'none';
    selectRow(tr);
    openCtxMenu(
      { clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} },
      tr.dataset.type,
      tr.dataset.type === 'folder' ? tr.dataset.path : tr.dataset.key
    );
  }, 500);
}, { passive: true });

listContainer.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1) { cancelTouch(); return; }
  const touch = e.touches[0];
  if (Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y) > 10) {
    cancelTouch();
  }
}, { passive: true });

listContainer.addEventListener('touchend', (e) => {
  const tr = touchRow;
  const held = touchHeld;
  cancelTouch();
  touchHeld = false;
  if (tr || held) e.preventDefault();
  if (!tr) return;
  suppressTouchClickUntil = Date.now() + 800;
  if (held) return;
  selectRow(tr);
  if (tr.dataset.type === 'folder') openFolder(tr.dataset.path);
  else onFileDblClick(tr.dataset.key);
}, { passive: false });
listContainer.addEventListener('touchcancel', () => { cancelTouch(); touchHeld = false; });

async function refreshList() {
  const res = await withLoading(fetch('/api/list?prefix=' + encodeURIComponent(PREFIX)));
  if (!res.ok) return;
  const data = await res.json();
  currentFolders = data.folders || [];
  currentFiles = data.files || [];
  applyFilterAndSort();
  showToast('Refreshed.');
}

// ---------------- Upload & Drag & Drop ----------------
document.getElementById('fileInput').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});

const dropzone = document.getElementById('dropzone');
if (dropzone) {
  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); })
  );
  ['dragleave', 'dragend', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); })
  );
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
}

function addFiles(fileList) {
  selected = selected.concat(Array.from(fileList).map((f) => ({ file: f, name: f.name })));
  renderSelected();
  // On mobile, auto-prompt to upload immediately
  if (window.innerWidth <= 768) {
    doUpload();
  }
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderSelected() {
  const wrap = document.getElementById('selectedFiles');
  const actions = document.getElementById('uploadActions');
  if (!wrap) return;
  if (!selected.length) {
    wrap.innerHTML = '';
    if (actions) actions.style.display = 'none';
    return;
  }
  wrap.innerHTML = selected
    .map((s, i) =>
      '<div class="file-edit-row">' +
        '<input type="text" value="' + escapeAttr(s.name) + '" onchange="renameSelected(' + i + ', this.value)">' +
        '<span class="fsize">' + humanSizeJs(s.file.size) + '</span>' +
        '<button class="iconbtn danger-hover" onclick="removeSelected(' + i + ')">\u2715</button>' +
      '</div>'
    )
    .join('');
  if (actions) actions.style.display = 'flex';
}

function renameSelected(i, value) {
  selected[i].name = value.trim() || selected[i].file.name;
}

function removeSelected(i) {
  selected.splice(i, 1);
  renderSelected();
}

async function uploadOne(file, name, onProgress) {
  const key = PREFIX + name;
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType: file.type || 'application/octet-stream' })
  });
  if (!res.ok) throw new Error('Could not get upload URL for ' + name);
  const { url } = await res.json();

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed (' + xhr.status + ') for ' + name)));
    xhr.onerror = () => reject(new Error('Upload failed for ' + name));
    xhr.send(file);
  });
}

async function doUpload() {
  const errEl = document.getElementById('uploadErr');
  if (errEl) errEl.textContent = '';
  if (!selected.length) {
    if (errEl) errEl.textContent = 'Choose at least one file.';
    return;
  }

  const wrap = document.getElementById('progressWrap');
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressLabel');
  if (wrap) wrap.style.display = 'block';
  if (label) label.style.display = 'block';
  setLoading(true);

  for (let i = 0; i < selected.length; i++) {
    const { file, name } = selected[i];
    if (label) label.textContent = 'Uploading ' + (i + 1) + ' of ' + selected.length + ': ' + name;
    try {
      await uploadOne(file, name, (frac) => {
        const overall = (i + frac) / selected.length;
        if (bar) bar.style.width = Math.round(overall * 100) + '%';
      });
    } catch (e) {
      if (errEl) errEl.textContent = e.message;
      setLoading(false);
      showToast('Upload error: ' + e.message, true);
      return;
    }
  }

  const uploadedCount = selected.length;
  setLoading(false);
  if (wrap) wrap.style.display = 'none';
  if (label) label.style.display = 'none';
  if (bar) bar.style.width = '0%';
  selected = [];
  renderSelected();
  showToast(uploadedCount === 1 ? 'File uploaded.' : uploadedCount + ' files uploaded.');
  await refreshList();
}

// ---------------- Generic In-Page Modal ----------------
function openModal(opts) {
  const { title, message = '', withInput = false, inputValue = '', okText = 'OK', showCancel = true, danger = false } = opts;
  return new Promise((resolve) => {
    const backdrop = document.getElementById('modalBackdrop');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMsg');
    const inputRow = document.getElementById('modalInputRow');
    const input = document.getElementById('modalInput');
    const okBtn = document.getElementById('modalOk');
    const cancelBtn = document.getElementById('modalCancel');

    titleEl.textContent = title;
    msgEl.style.display = message ? 'block' : 'none';
    msgEl.textContent = message;
    inputRow.style.display = withInput ? 'block' : 'none';
    input.value = inputValue;
    okBtn.textContent = okText;
    okBtn.className = danger ? 'danger' : '';
    cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

    backdrop.classList.add('show');
    if (withInput) setTimeout(() => { input.focus(); input.select(); }, 0);

    const cleanup = (result) => {
      backdrop.classList.remove('show');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
      resolve(result);
    };

    okBtn.onclick = () => cleanup(withInput ? input.value : true);
    cancelBtn.onclick = () => cleanup(withInput ? null : false);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') cleanup(input.value);
      if (e.key === 'Escape') cleanup(null);
    };
  });
}

function showAlert(title, message) {
  return openModal({ title, message, showCancel: false, okText: 'Close' });
}

function showConfirmModal(title, message) {
  return openModal({ title, message, okText: 'Delete', danger: true });
}

function showPromptModal(title, defaultValue) {
  return openModal({ title, withInput: true, inputValue: defaultValue, okText: 'OK' });
}

async function readError(res) {
  const text = await res.text().catch(() => '');
  return text || ('Server returned ' + res.status);
}

// ---------------- Windows Media Player & Preview Window ----------------
function openPlayer(key) {
  currentActiveKey = key;
  const name = key.split('/').pop();
  const cat = getFileTypeCategory(name);
  const streamUrl = '/stream/' + encodeURIComponent(key);

  const backdrop = document.getElementById('playerBackdrop');
  const titleEl = document.getElementById('playerTitle');
  const contentEl = document.getElementById('playerContent');
  const badgeEl = document.getElementById('playerMetaBadge');

  const icons = { video: '\u{1F3AC}', audio: '\u{1F3B5}', image: '\u{1F5BC}\uFE0F', pdf: '\u{1F4C4}', text: '\u{1F4DD}', binary: '\u{1F4E6}' };
  titleEl.innerHTML = '<span class="xp-title-icon">' + (icons[cat] || '\u{1F3AC}') + '</span> ' + cEscText(name);

  const fileObj = currentFiles.find((f) => f.key === key);
  const sizeText = fileObj ? humanSizeJs(fileObj.size) : '';
  badgeEl.textContent = sizeText ? sizeText + ' \u2022 ' + cat.toUpperCase() : cat.toUpperCase();

  contentEl.innerHTML = '';

  if (cat === 'video') {
    const video = document.createElement('video');
    video.className = 'player-video';
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.src = streamUrl;
    contentEl.appendChild(video);
  } else if (cat === 'audio') {
    const card = document.createElement('div');
    card.className = 'player-audio-card';
    card.innerHTML =
      '<div class="player-audio-viz">' +
        '<span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>' +
      '</div>' +
      '<div class="player-audio-title">' + cEscText(name) + '</div>' +
      '<audio class="player-audio-element" controls autoplay src="' + streamUrl + '"></audio>';
    contentEl.appendChild(card);
  } else if (cat === 'image') {
    const img = document.createElement('img');
    img.className = 'player-image';
    img.src = streamUrl;
    img.alt = name;
    contentEl.appendChild(img);
  } else if (cat === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.className = 'player-pdf';
    iframe.src = streamUrl;
    contentEl.appendChild(iframe);
  } else if (cat === 'text') {
    const pre = document.createElement('pre');
    pre.className = 'player-text';
    pre.textContent = 'Loading text content...';
    contentEl.appendChild(pre);
    fetch(streamUrl)
      .then((r) => r.text())
      .then((t) => { pre.textContent = t; })
      .catch((err) => { pre.textContent = 'Could not load text content: ' + err.message; });
  } else {
    const card = document.createElement('div');
    card.className = 'player-generic';
    const icon = document.createElement('span');
    icon.className = 'player-generic-icon';
    icon.textContent = '\u{1F4E6}';
    const nameEl = document.createElement('div');
    nameEl.className = 'player-generic-name';
    nameEl.textContent = name;
    const sizeEl = document.createElement('div');
    sizeEl.className = 'player-generic-size';
    sizeEl.textContent = sizeText || 'Binary File';
    const dlBtn = document.createElement('button');
    dlBtn.className = 'primary';
    dlBtn.style.cssText = 'font-size:12px;padding:6px 16px;';
    dlBtn.textContent = '\u2B07 Download Now';
    dlBtn.onclick = () => downloadFile(key);
    card.appendChild(icon);
    card.appendChild(nameEl);
    card.appendChild(sizeEl);
    card.appendChild(dlBtn);
    contentEl.appendChild(card);
  }

  backdrop.classList.add('show');
}

function closePlayer() {
  const backdrop = document.getElementById('playerBackdrop');
  const contentEl = document.getElementById('playerContent');
  const video = contentEl.querySelector('video');
  if (video) video.pause();
  const audio = contentEl.querySelector('audio');
  if (audio) audio.pause();
  contentEl.innerHTML = '';
  backdrop.classList.remove('show');
  currentActiveKey = null;
}

function playerDownloadCurrent() {
  if (currentActiveKey) downloadFile(currentActiveKey);
}

function playerShareCurrent() {
  if (currentActiveKey) shareFile(currentActiveKey);
}

function playerOpenNewTab() {
  if (currentActiveKey) window.open('/stream/' + encodeURIComponent(currentActiveKey), '_blank');
}

// ---------------- File Actions ----------------
function downloadFile(key) {
  window.location.href = '/download/' + encodeURIComponent(key);
}

async function shareFile(key) {
  const fileName = key.slice(PREFIX.length);
  const isApk = fileName.toLowerCase().endsWith('.apk');
  const fileObj = currentFiles.find(function(f) { return f.key === key; });
  const sizeText = fileObj ? humanSizeJs(fileObj.size) : '';

  const apkBannerHtml = isApk
    ? '<div style="background:#e8f5e9;border:1px solid #81c784;border-radius:4px;padding:8px 10px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:24px;">\u{1F916}</span>' +
        '<div style="font-size:11px;color:#1b5e20;">' +
          '<b>Android APK Package Detected</b><br>' +
          'Direct download is pre-selected for instant compatibility with <b>GLZTV</b>, Android TV, and Downloader.' +
        '</div>' +
      '</div>'
    : '';

  const html =
    '<div style="font-size:11px;">' +
      apkBannerHtml +
      '<div style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid #d4d0c8;margin-bottom:10px;">' +
        '<span style="font-size:26px;">' + (isApk ? '\u{1F916}' : '\u{1F4E6}') + '</span>' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-weight:bold;font-size:12px;color:#0c4bd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + cEscText(fileName) + '">' + cEscText(fileName) + '</div>' +
          '<div style="color:#666;">' + (sizeText ? sizeText + ' \u2022 ' : '') + (isApk ? 'Android Application Package' : 'Stored File') + '</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:12px;">' +
        '<div style="font-weight:bold;margin-bottom:6px;">Download Mode:</div>' +
        '<label style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;cursor:pointer;">' +
          '<input type="radio" name="shareMode" id="shareModeDirect" value="direct" ' + (isApk ? 'checked' : '') + ' style="margin-top:2px;">' +
          '<div>' +
            '<b>\u26A1 Direct Download (Instant File / APK stream)</b>' +
            '<div style="color:#555;font-size:10.5px;">Directly streams raw file without a landing page. <b>Required for GLZTV app repository & Downloader</b>.</div>' +
          '</div>' +
        '</label>' +
        '<label style="display:flex;align-items:flex-start;gap:6px;cursor:pointer;">' +
          '<input type="radio" name="shareMode" id="shareModePage" value="page" ' + (!isApk ? 'checked' : '') + ' style="margin-top:2px;">' +
          '<div>' +
            '<b>\u{1F310} Interactive Share Page</b>' +
            '<div style="color:#555;font-size:10.5px;">Shows a web landing page with preview and download button.</div>' +
          '</div>' +
        '</label>' +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">' +
        '<label for="shareExpirySelect" style="font-weight:bold;">Expiration:</label>' +
        '<select id="shareExpirySelect" class="xp-select" style="padding:2px 4px;font-size:11px;">' +
          '<option value="7">7 Days</option>' +
          '<option value="30">30 Days</option>' +
          '<option value="90">90 Days</option>' +
          '<option value="0" ' + (isApk ? 'selected' : '') + '>Permanent (Never Expires \u2014 Best for GLZTV)</option>' +
        '</select>' +
      '</div>' +

      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px;">' +
        '<button id="btnGenShare" class="primary" style="padding:4px 14px;font-weight:bold;">\u26A1 Create Share Link</button>' +
      '</div>' +

      '<div id="shareResultContainer" style="display:none;background:#fff;border:1px solid #7f9db9;border-radius:4px;padding:10px;margin-top:10px;">' +
      '</div>' +
    '</div>';

  openCustomDialog('Share / Direct Download: ' + fileName, html);
  document.getElementById('btnGenShare').onclick = () => doCreateShareLink(key);
  setTimeout(function() {
    doCreateShareLink(key);
  }, 50);
}

window.doCreateShareLink = async function(key) {
  const container = document.getElementById('shareResultContainer');
  const btn = document.getElementById('btnGenShare');
  const modeDirect = document.getElementById('shareModeDirect') ? document.getElementById('shareModeDirect').checked : true;
  const expirySelect = document.getElementById('shareExpirySelect');
  const expiryVal = expirySelect ? expirySelect.value : '7';

  if (btn) btn.disabled = true;
  if (container) {
    container.style.display = 'block';
    container.innerHTML = '<div style="text-align:center;padding:12px;color:#666;">Generating download link...</div>';
  }

  try {
    const res = await fetch('/api/share-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: key,
        days: expiryVal === '0' ? 0 : Number(expiryVal),
        direct: modeDirect
      })
    });
    if (!res.ok) {
      const err = await readError(res);
      container.innerHTML = '<div style="color:#d32f2f;padding:8px;">Error: ' + cEscText(err) + '</div>';
      return;
    }
    const data = await res.json();
    const isApk = key.toLowerCase().endsWith('.apk');
    const directUrl = data.directUrl || data.url;
    const sharePageUrl = data.shareUrl || data.url;
    const primaryUrl = modeDirect ? directUrl : sharePageUrl;

    try { await navigator.clipboard.writeText(primaryUrl); } catch (e) {}

    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=' + encodeURIComponent(directUrl);
    const expText = data.expiresAt ? '\u23F3 Expires: ' + new Date(data.expiresAt).toLocaleDateString() : '\u267E\uFE0F Permanent Link (Never expires)';

    container.innerHTML =
      '<div style="font-size:11px;">' +
        '<div style="color:#2e7d32;font-weight:bold;margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
          '<span>\u2705 Link Ready</span> <span style="color:#666;font-weight:normal;">(Copied to clipboard!)</span>' +
        '</div>' +

        '<div style="margin-bottom:8px;">' +
          '<div style="font-weight:bold;color:#0c4bd6;margin-bottom:3px;">' +
            (isApk ? '\u{1F4FA} GLZTV & Downloader Direct APK Link:' : '\u26A1 Direct Download Link:') +
          '</div>' +
          '<div style="display:flex;gap:4px;">' +
            '<input type="text" id="shareDirectInput" readonly value="' + cEscText(directUrl) + '" style="flex:1;font-size:11px;padding:3px 6px;font-family:monospace;background:#f9f9f9;border:1px solid #7f9db9;" onclick="this.select()" />' +
            '<button id="copyDirectLink" class="primary" style="padding:2px 8px;">Copy</button>' +
            '<a href="' + cEscText(directUrl) + '" class="xp-sub-btn" target="_blank" download style="padding:2px 8px;display:inline-flex;align-items:center;">Test</a>' +
          '</div>' +
        '</div>' +

        '<div style="margin-bottom:10px;">' +
          '<div style="font-weight:bold;color:#555;margin-bottom:3px;">\u{1F310} Web Landing Page Link:</div>' +
          '<div style="display:flex;gap:4px;">' +
            '<input type="text" id="shareWebInput" readonly value="' + cEscText(sharePageUrl) + '" style="flex:1;font-size:11px;padding:3px 6px;font-family:monospace;background:#f9f9f9;border:1px solid #7f9db9;" onclick="this.select()" />' +
            '<button id="copyWebLink" style="padding:2px 8px;">Copy</button>' +
          '</div>' +
        '</div>' +

        '<div style="display:flex;gap:12px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed #ccc;">' +
          '<img src="' + cEscText(qrUrl) + '" alt="QR Code" width="90" height="90" style="border:1px solid #7f9db9;background:#fff;padding:2px;border-radius:3px;flex:none;" />' +
          '<div style="font-size:10.5px;color:#444;line-height:1.4;">' +
            '<b>\u{1F4F1} Quick Install QR Code:</b><br>' +
            'Scan with your TV remote app or mobile camera to download directly.<br>' +
            '<div style="color:#888;margin-top:4px;">' + expText + '</div>' +
          '</div>' +
        '</div>' +

        '<div style="margin-top:10px;padding:6px 8px;background:#f0f4f9;border:1px solid #c9d7ea;border-radius:3px;font-size:10px;color:#333;">' +
          '\u{1F4A1} <b>GLZTV App Tip:</b> Paste the Direct APK link into GLZTV or GLZ Hub repository URL. You can also place APKs in the <code>public/</code> folder for direct permanent paths like <code>' + window.location.origin + '/public/your-app.apk</code>.' +
        '</div>' +
      '</div>';
    document.getElementById('copyDirectLink').onclick = () => copyAndToast(directUrl, 'Direct link copied!');
    document.getElementById('copyWebLink').onclick = () => copyAndToast(sharePageUrl, 'Web link copied!');
    showToast('Link created & copied!');
  } catch (err) {
    container.innerHTML = '<div style="color:#d32f2f;padding:8px;">Failed: ' + cEscText(err.message) + '</div>';
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.copyAndToast = function(text, msg) {
  navigator.clipboard.writeText(text).then(function() {
    showToast(msg || 'Copied!');
  }).catch(function() {
    showToast('Failed to copy');
  });
};

async function renameFile(key) {
  const currentName = key.slice(PREFIX.length);
  const newName = await showPromptModal('Rename file', currentName);
  if (!newName || newName === currentName) return;
  const newKey = PREFIX + newName;
  const res = await withLoading(fetch('/api/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldKey: key, newKey })
  }));
  if (!res.ok) { await showAlert('Rename failed', await readError(res)); return; }
  showToast('Renamed to "' + newName + '".');
  await refreshList();
}

async function renameFolder(prefix) {
  const currentName = prefix.slice(PREFIX.length).replace(/\\/$/, '');
  const newName = await showPromptModal('Rename folder', currentName);
  if (!newName || newName === currentName) return;
  const newPrefix = PREFIX + newName.replace(/\\/+$/, '') + '/';
  const res = await withLoading(fetch('/api/rename-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPrefix: prefix, newPrefix })
  }));
  if (!res.ok) { await showAlert('Rename failed', await readError(res)); return; }
  showToast('Folder renamed to "' + newName + '".');
  await refreshList();
}

async function delFolder(prefix) {
  const name = prefix.slice(PREFIX.length).replace(/\\/$/, '');
  const ok = await showConfirmModal('Delete folder', 'Delete "' + name + '" and everything inside it? This cannot be undone.');
  if (!ok) return;
  const res = await withLoading(fetch('/api/delete-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix })
  }));
  if (!res.ok) { await showAlert('Delete failed', await readError(res)); return; }
  const data = await res.json().catch(() => ({}));
  const n = data.deleted || 0;
  showToast('Folder deleted' + (n ? ' (' + n + ' item' + (n === 1 ? '' : 's') + ')' : '') + '.');
  await refreshList();
}

async function delFile(key) {
  const name = key.slice(PREFIX.length);
  const ok = await showConfirmModal('Delete file', 'Delete ' + name + '? This cannot be undone.');
  if (!ok) return;
  const res = await withLoading(fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  }));
  if (!res.ok) { await showAlert('Delete failed', await readError(res)); return; }
  showToast('Deleted.');
  await refreshList();
}

async function makeFolder() {
  const input = document.getElementById('newFolder');
  const name = input ? input.value.trim() : '';
  if (!name) return;
  const res = await withLoading(fetch('/api/mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: PREFIX, name })
  }));
  if (!res.ok) { await showAlert('Could not create folder', await readError(res)); return; }
  if (input) input.value = '';
  showToast('Folder created.');
  await refreshList();
}

// ---------------- Context Menus ----------------
function ctxItemsFor(kind, keyOrPrefix) {
  if (kind === 'file') {
    const name = keyOrPrefix.slice(PREFIX.length);
    const cat = getFileTypeCategory(name);
    const isMedia = ['video', 'audio', 'image', 'pdf', 'text'].includes(cat);
    return [
      ...(isMedia ? [{ label: 'Play / Preview', bold: true, icon: '\u25B6', run: () => openPlayer(keyOrPrefix) }] : []),
      { label: 'Download', bold: !isMedia, icon: '\u2B07', run: () => downloadFile(keyOrPrefix) },
      { label: 'Get share link', icon: '\u{1F517}', run: () => shareFile(keyOrPrefix) },
      { label: 'Rename', icon: '\u270F\uFE0F', run: () => renameFile(keyOrPrefix) },
      { sep: true },
      { label: 'Properties', icon: '\u2139\uFE0F', run: () => menuProperties() },
      { sep: true },
      { label: 'Delete', icon: '\u{1F5D1}', run: () => delFile(keyOrPrefix) },
    ];
  }
  if (kind === 'folder') {
    return [
      { label: 'Open', bold: true, icon: '\u{1F4C2}', run: () => openFolder(keyOrPrefix) },
      { label: 'Rename', icon: '\u270F\uFE0F', run: () => renameFolder(keyOrPrefix) },
      { sep: true },
      { label: 'Properties', icon: '\u2139\uFE0F', run: () => showFolderProperties(keyOrPrefix) },
      { sep: true },
      { label: 'Delete', icon: '\u{1F5D1}', run: () => delFolder(keyOrPrefix) },
    ];
  }
  return [
    { label: 'New Folder', icon: '\u{1F4C1}', run: () => focusNewFolder() },
    { label: 'Upload Files', icon: '\u{1F4E4}', run: () => document.getElementById('fileInput').click() },
    { sep: true },
    { label: 'Folder Properties', icon: '\u2139\uFE0F', run: () => showFolderProperties(PREFIX) },
    { sep: true },
    { label: 'Refresh', icon: '\u{1F504}', run: () => refreshList() },
  ];
}

function openCtxMenu(evt, kind, keyOrPrefix) {
  closeDesktopMenus();
  closeWmMenus();
  if (evt.preventDefault) evt.preventDefault();
  if (evt.stopPropagation) evt.stopPropagation();
  const menu = document.getElementById('ctxMenu');
  const items = ctxItemsFor(kind, keyOrPrefix);
  menu.innerHTML = items
    .map((it, i) => it.sep
      ? '<div class="ctx-sep"></div>'
      : '<div role="menuitem" tabindex="0" class="ctx-item' + (it.bold ? ' bold' : '') + '" data-idx="' + i + '"><span class="ico">' + it.icon + '</span>' + cEscText(it.label) + '</div>')
    .join('');

  Array.from(menu.querySelectorAll('.ctx-item')).forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      closeCtxMenu();
      items[Number(el.dataset.idx)].run();
    };
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    };
  });

  menu.style.left = evt.clientX + 'px';
  menu.style.top = evt.clientY + 'px';
  menu.classList.add('show');

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = Math.max(0, window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = Math.max(0, window.innerHeight - rect.height - 4) + 'px';
}

function closeCtxMenu() {
  const menu = document.getElementById('ctxMenu');
  if (menu) menu.classList.remove('show');
}

document.addEventListener('click', closeCtxMenu);
document.addEventListener('scroll', (e) => {
  if (!document.getElementById('ctxMenu').contains(e.target)) closeCtxMenu();
}, true);
document.addEventListener('pointerdown', (e) => {
  if (!document.getElementById('ctxMenu').contains(e.target)) closeCtxMenu();
});
window.addEventListener('resize', closeCtxMenu);

// ---------------- Keyboard Shortcuts ----------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCtxMenu();
    closeDesktopMenus();
    closeWmMenus();
    closeCustomDialog();
    if (document.getElementById('playerBackdrop').classList.contains('show')) {
      closePlayer();
    }
    return;
  }

  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable || document.getElementById('ctxMenu').classList.contains('show') || document.getElementById('playerBackdrop').classList.contains('show') || document.getElementById('modalBackdrop').classList.contains('show') || document.getElementById('customDialogBackdrop').classList.contains('show')) {
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    document.getElementById('filterInput').focus();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    menuSelectAll();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    menuCopyKey();
    return;
  }

  if (e.key === 'F5') {
    e.preventDefault();
    refreshList();
    return;
  }

  if (!currentSelectedRow) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = listContainer.querySelectorAll('tbody tr');
      const row = e.key === 'ArrowDown' ? rows[0] : rows[rows.length - 1];
      if (row) { e.preventDefault(); selectRow(row); row.scrollIntoView({ block: 'nearest' }); }
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (currentSelectedRow.dataset.type === 'folder') {
      openFolder(currentSelectedRow.dataset.path);
    } else {
      onFileDblClick(currentSelectedRow.dataset.key);
    }
  } else if (e.key === 'Delete') {
    e.preventDefault();
    menuDelete();
  } else if (e.key === 'F2') {
    e.preventDefault();
    menuRename();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (currentSelectedRow.dataset.type === 'file') {
      openPlayer(currentSelectedRow.dataset.key);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = currentSelectedRow.nextElementSibling;
    if (next && next.tagName === 'TR') {
      selectRow(next);
      next.scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = currentSelectedRow.previousElementSibling;
    if (prev && prev.tagName === 'TR') {
      selectRow(prev);
      prev.scrollIntoView({ block: 'nearest' });
    }
  }
});
<\/script>
</body>
</html>`;
}
__name(browserPage, "browserPage");
__name2(browserPage, "browserPage");
function publicSharePage({ code, key, size = 0, uploaded = null, expiresAt = null, direct = false, origin = "" }) {
  const fileName = key.split("/").pop() || "file";
  const previewType = getPreviewType(fileName);
  const mimeType = getMimeType(fileName);
  const isApk = fileName.toLowerCase().endsWith(".apk");
  function humanSize2(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let val = bytes;
    let u = 0;
    while (val >= 1024 && u < units.length - 1) {
      val /= 1024;
      u++;
    }
    return `${val.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
  }
  __name(humanSize2, "humanSize2");
  __name2(humanSize2, "humanSize");
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  __name(escapeHtml, "escapeHtml");
  __name2(escapeHtml, "escapeHtml");
  const safeFileName = escapeHtml(fileName);
  const formattedSize = humanSize2(size);
  const dateStr = uploaded ? new Date(uploaded).toLocaleString() : "Recently";
  let expiryStr = "";
  if (expiresAt) {
    const diffHours = Math.round((expiresAt - Date.now()) / (1e3 * 60 * 60));
    if (diffHours > 24) {
      expiryStr = `Expires in ${Math.round(diffHours / 24)} day(s)`;
    } else if (diffHours > 0) {
      expiryStr = `Expires in ${diffHours} hour(s)`;
    } else {
      expiryStr = "Expiring soon";
    }
  }
  let previewContent = "";
  let metaType = "website";
  let ogTags = "";
  if (previewType === "video") {
    metaType = "video.other";
    ogTags = `<meta property="og:video" content="/${code}?stream=1">
<meta property="og:video:type" content="${mimeType}">`;
    previewContent = `
      <div class="share-player-box share-video-box">
        <video controls playsinline preload="metadata" class="share-video-el">
          <source src="/${code}?stream=1" type="${mimeType}">
          Your browser does not support HTML5 video streaming.
        </video>
      </div>`;
  } else if (previewType === "audio") {
    metaType = "music.song";
    ogTags = `<meta property="og:audio" content="/${code}?stream=1">
<meta property="og:audio:type" content="${mimeType}">`;
    previewContent = `
      <div class="share-player-box share-audio-box">
        <div class="audio-art">\u{1F3B5}</div>
        <div class="audio-title">${safeFileName}</div>
        <div class="audio-sub">${mimeType} \u2022 ${formattedSize}</div>
        <audio controls preload="metadata" class="share-audio-el">
          <source src="/${code}?stream=1" type="${mimeType}">
          Your browser does not support HTML5 audio streaming.
        </audio>
      </div>`;
  } else if (previewType === "image") {
    metaType = "image";
    ogTags = `<meta property="og:image" content="/${code}?stream=1">`;
    previewContent = `
      <div class="share-player-box share-img-box">
        <img src="/${code}?stream=1" alt="${safeFileName}" class="share-img-el" loading="lazy" />
      </div>`;
  } else if (previewType === "pdf") {
    previewContent = `
      <div class="share-player-box share-pdf-box">
        <iframe src="/${code}?stream=1#toolbar=1" class="share-pdf-frame"></iframe>
        <div class="pdf-alt-bar">
          Can't see the document preview? <a href="/${code}?stream=1" target="_blank" rel="noopener">Open in full browser window \u2197</a>
        </div>
      </div>`;
  } else if (previewType === "text") {
    previewContent = `
      <div class="share-player-box share-text-box">
        <div class="text-head">
          <span>\u{1F4DD} Document Preview</span>
          <button id="btnCopyText" class="xp-sub-btn" onclick="copyShareText()">\u{1F4CB} Copy Text</button>
        </div>
        <div id="textLoading" class="text-loading">Loading text preview...</div>
        <pre id="textPre" class="text-pre" style="display:none;"></pre>
      </div>
      <script>
        fetch('/${code}?stream=1')
          .then(r => {
            if (!r.ok) throw new Error('Status ' + r.status);
            return r.text();
          })
          .then(txt => {
            const l = document.getElementById('textLoading');
            if (l) l.style.display = 'none';
            const p = document.getElementById('textPre');
            if (p) {
              p.textContent = txt;
              p.style.display = 'block';
            }
          })
          .catch(err => {
            const l = document.getElementById('textLoading');
            if (l) l.textContent = 'Unable to render direct preview. Please download the file to view.';
          });
        function copyShareText() {
          const p = document.getElementById('textPre');
          if (!p) return;
          navigator.clipboard.writeText(p.textContent).then(() => {
            const b = document.getElementById('btnCopyText');
            if (b) {
              const old = b.textContent;
              b.textContent = '\u2705 Copied!';
              setTimeout(() => { b.textContent = old; }, 2000);
            }
          });
        }
      <\/script>`;
  } else if (isApk) {
    metaType = "application/vnd.android.package-archive";
    const apkDirectUrl = `/${code}.apk`;
    const fullDirectUrl = (origin || "") + apkDirectUrl;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=" + encodeURIComponent(fullDirectUrl);
    previewContent = `
      <div class="share-player-box share-file-box share-apk-card">
        <div class="file-hero-icon" style="font-size:52px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.15));">\u{1F916}</div>
        <div class="file-hero-name">${safeFileName}</div>
        <div class="file-hero-meta"><span class="badge-apk">Android Package (APK)</span> \u2022 ${formattedSize}</div>
        <div class="file-hero-desc">Verified Android package ready for direct installation on <b>GLZTV</b>, Android TV, Fire TV, or mobile devices.</div>

        <div style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="/${code}?dl=1" class="xp-btn-download-primary" download="${safeFileName}">
            \u2B07\uFE0F Download APK (${formattedSize})
          </a>
          <button onclick="copyDirectApkUrl()" id="btnCopyDirectApk" class="xp-sub-btn">
            \u{1F4CB} Copy Direct APK URL
          </button>
        </div>

        <div class="apk-tv-box">
          <div class="apk-tv-header">
            <span>\u{1F4FA}</span> GLZTV & TV Downloader Direct Link
          </div>
          <div class="apk-tv-sub">
            Paste this URL into <b>GLZTV App Repository URL</b> or AFTV <b>Downloader</b> app to install automatically:
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="text" id="apkDirectInput" readonly value="${fullDirectUrl}" class="apk-input" onclick="this.select()" />
            <button onclick="copyApkDirectInput()" id="btnCopyApkInput" class="xp-sub-btn" style="padding:5px 12px;font-weight:bold;">Copy</button>
          </div>

          <div class="apk-tv-qr-row">
            <img src="${qrUrl}" alt="QR Code" width="100" height="100" class="apk-qr-img" />
            <div class="apk-qr-text">
              <b>\u{1F4F1} TV Remote / Mobile Scan:</b><br>
              Scan with your phone or Android TV remote scanner to download this APK instantly without typing.
            </div>
          </div>
        </div>
      </div>
      <script>
      function copyDirectApkUrl() {
        const u = window.location.origin + '/${code}.apk';
        navigator.clipboard.writeText(u).then(() => {
          const b = document.getElementById('btnCopyDirectApk');
          if (b) { const old = b.textContent; b.textContent = '\u2705 Copied Direct Link!'; setTimeout(() => { b.textContent = old; }, 2000); }
        });
      }
      function copyApkDirectInput() {
        const inp = document.getElementById('apkDirectInput');
        if (inp) {
          inp.select();
          navigator.clipboard.writeText(inp.value).then(() => {
            const b = document.getElementById('btnCopyApkInput');
            if (b) { const old = b.textContent; b.textContent = '\u2705 Copied!'; setTimeout(() => { b.textContent = old; }, 2000); }
          });
        }
      }
      <\/script>`;
  } else {
    previewContent = `
      <div class="share-player-box share-file-box">
        <div class="file-hero-icon">\u{1F4BE}</div>
        <div class="file-hero-name">${safeFileName}</div>
        <div class="file-hero-meta">${mimeType} \u2022 ${formattedSize}</div>
        <div class="file-hero-desc">Click below to download this file directly to your computer or device.</div>
        <div style="margin-top:16px;">
          <a href="/${code}?dl=1" class="xp-btn-download-primary" download>
            \u2B07\uFE0F Download File (${formattedSize})
          </a>
        </div>
      </div>`;
  }
  const expiryBadgeHtml = expiryStr ? '<span class="badge-expiry">\u23F3 ' + expiryStr + "</span>" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeFileName} - Shared File</title>
<meta name="description" content="Download or view ${safeFileName} (${formattedSize}) shared via GLZ File Server.">
<meta property="og:title" content="${safeFileName} (${formattedSize})">
<meta property="og:description" content="View or download ${safeFileName} on GLZ File Server.">
<meta property="og:type" content="${metaType}">
${ogTags}
<style>
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; min-height: 100%;
  font-family: Tahoma, "Segoe UI", Verdana, Arial, sans-serif;
  font-size: 11px; color: #000;
  background: #3a6ea5 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%233a6ea5'/%3E%3Cpath d='M0 0L4 4ZM4 0L0 4Z' stroke='%23375f92' stroke-width='0.4'/%3E%3C/svg%3E");
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 16px;
}
.share-container {
  width: 100%; max-width: 860px;
  background: #ece9d8;
  border-radius: 8px 8px 4px 4px;
  border: 1px solid #0831d9;
  box-shadow: 0 12px 38px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.4) inset;
  overflow: hidden;
  display: flex; flex-direction: column;
}
.xp-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 6px; height: 30px;
  background: linear-gradient(180deg,#2a6fe0 0%,#1655d0 8%,#0c4bd6 40%,#1d63e8 60%,#3e93f5 88%,#5aa6f7 100%);
  border-bottom: 1px solid #0831d9;
}
.xp-title-left {
  display: flex; align-items: center; gap: 6px;
  color: #fff; font-weight: 700; font-size: 12px;
  text-shadow: 1px 1px 1px rgba(0,0,0,.5);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.xp-title-icon { font-size: 14px; }
.xp-title-btns { display: flex; gap: 2px; }
.xp-title-btns a {
  width: 21px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 3px; border: 1px solid rgba(255,255,255,.5);
  background: linear-gradient(180deg,#f5a58e,#d5372a);
  color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: none;
}
.xp-title-btns a:hover { filter: brightness(1.15); }

/* File Header info */
.share-header {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #c9c4b3;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.share-file-info {
  display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;
}
.share-file-icon {
  font-size: 36px; line-height: 1; flex: none;
}
.share-file-details {
  min-width: 0;
}
.share-file-title {
  font-size: 14px; font-weight: bold; color: #0c4bd6;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 480px;
}
.share-file-meta {
  color: #555; font-size: 11px; margin-top: 3px;
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.badge-size {
  background: #eef3fc; border: 1px solid #b8cce4; color: #1d63e8;
  padding: 1px 6px; border-radius: 3px; font-weight: bold;
}
.badge-expiry {
  background: #fff4e5; border: 1px solid #ffd699; color: #b35900;
  padding: 1px 6px; border-radius: 3px;
}
.badge-apk {
  background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32;
  padding: 1px 6px; border-radius: 3px; font-weight: bold;
}
.share-apk-card {
  background: #fff; border: 1px solid #c9c4b3; border-radius: 6px;
  padding: 28px 16px; text-align: center; box-shadow: inset 0 1px 3px rgba(0,0,0,.05);
}
.apk-tv-box {
  margin-top: 20px; background: #f3f6fa; border: 1px solid #b8cce4;
  border-radius: 6px; padding: 14px; text-align: left; max-width: 520px;
  margin-left: auto; margin-right: auto;
}
.apk-tv-header {
  font-weight: bold; color: #0c4bd6; font-size: 12px; margin-bottom: 4px;
  display: flex; align-items: center; gap: 6px;
}
.apk-tv-sub { font-size: 10.5px; color: #555; margin-bottom: 8px; }
.apk-input {
  flex: 1; font-size: 11px; padding: 5px 8px; font-family: monospace;
  border: 1px solid #7f9db9; background: #fff; border-radius: 3px;
}
.apk-tv-qr-row {
  display: flex; gap: 14px; align-items: center; margin-top: 12px;
  padding-top: 10px; border-top: 1px dashed #c9d7ea;
}
.apk-qr-img {
  border: 1px solid #7f9db9; background: #fff; padding: 3px;
  border-radius: 4px; flex: none;
}
.apk-qr-text { font-size: 10.5px; color: #444; line-height: 1.45; }

/* Action Bar */
.share-actions {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.xp-btn-download-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(180deg, #38c858 0%, #20993c 100%);
  color: #fff; font-weight: bold; font-size: 12px;
  padding: 6px 14px; border-radius: 4px;
  border: 1px solid #146626; box-shadow: 0 1px 3px rgba(0,0,0,.25), 0 1px 0 rgba(255,255,255,.3) inset;
  text-decoration: none; cursor: pointer;
}
.xp-btn-download-primary:hover {
  background: linear-gradient(180deg, #44dc67 0%, #27af46 100%);
  text-decoration: none; color: #fff;
}
.xp-sub-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: #f0f0f0; color: #000; font-size: 11px;
  padding: 5px 10px; border-radius: 3px;
  border: 1px solid #7f9db9; cursor: pointer; text-decoration: none;
}
.xp-sub-btn:hover {
  background: #e5f0ff; border-color: #316ac5; text-decoration: none; color: #000;
}

/* Content Preview Body */
.share-body {
  padding: 14px; background: #ece9d8;
  display: flex; flex-direction: column; gap: 12px;
}
.share-player-box {
  width: 100%; border-radius: 4px; overflow: hidden;
}
.share-video-box {
  background: #000; display: flex; justify-content: center; align-items: center;
  border: 1px solid #0831d9; border-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,.3);
}
.share-video-el {
  width: 100%; max-height: 65vh; display: block; outline: none;
}
.share-audio-box {
  background: linear-gradient(180deg, #1f365d 0%, #101e38 100%);
  border: 1px solid #0831d9; border-radius: 6px; padding: 24px 16px;
  color: #fff; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,.3);
}
.audio-art { font-size: 44px; margin-bottom: 8px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
.audio-title { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
.audio-sub { font-size: 11px; color: #aac2e8; margin-bottom: 16px; }
.share-audio-el { width: 100%; max-width: 540px; outline: none; }
.share-img-box {
  background: #202020 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%232b2b2b'/%3E%3Crect x='8' width='8' height='8' fill='%23222'/%3E%3Crect y='8' width='8' height='8' fill='%23222'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%232b2b2b'/%3E%3C/svg%3E");
  border: 1px solid #555; border-radius: 4px; padding: 8px;
  display: flex; justify-content: center; align-items: center;
  max-height: 70vh; overflow: auto;
}
.share-img-el {
  max-width: 100%; max-height: 65vh; object-fit: contain;
  border-radius: 2px; box-shadow: 0 4px 16px rgba(0,0,0,.5);
}
.share-pdf-box {
  border: 1px solid #716f64; border-radius: 4px; overflow: hidden; background: #525659;
}
.share-pdf-frame {
  width: 100%; height: 65vh; border: none; display: block;
}
.pdf-alt-bar {
  padding: 6px 12px; background: #ece9d8; border-top: 1px solid #c9c4b3;
  text-align: center; font-size: 11px; color: #333;
}
.share-text-box {
  background: #fff; border: 1px solid #716f64; border-radius: 4px;
  overflow: hidden; display: flex; flex-direction: column; max-height: 65vh;
}
.text-head {
  padding: 4px 8px; background: #ece9d8; border-bottom: 1px solid #c9c4b3;
  display: flex; justify-content: space-between; align-items: center; font-weight: bold;
}
.text-loading { padding: 24px; text-align: center; color: #666; font-style: italic; }
.text-pre {
  margin: 0; padding: 12px; font-family: Consolas, "Courier New", monospace;
  font-size: 12px; line-height: 1.45; overflow: auto; user-select: text;
  white-space: pre-wrap; word-break: break-all;
}
.share-file-box {
  background: #fff; border: 1px solid #c9c4b3; border-radius: 6px;
  padding: 32px 16px; text-align: center; box-shadow: inset 0 1px 3px rgba(0,0,0,.05);
}
.file-hero-icon { font-size: 52px; margin-bottom: 10px; }
.file-hero-name { font-size: 15px; font-weight: bold; color: #0c4bd6; margin-bottom: 4px; word-break: break-all; }
.file-hero-meta { font-size: 12px; color: #666; margin-bottom: 8px; }
.file-hero-desc { font-size: 11px; color: #888; max-width: 400px; margin: 0 auto; }

/* Status Bar */
.share-statusbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 3px 8px; background: #ece9d8; border-top: 1px solid #c9c4b3;
  font-size: 10px; color: #444;
}
.status-panel {
  border: 1px inset #fff; padding: 1px 6px; background: #ece9d8;
}

/* Mobile responsive styling */
@media (max-width: 600px) {
  body { padding: 4px; }
  .share-header { padding: 8px; gap: 8px; }
  .share-file-title { font-size: 13px; max-width: 220px; }
  .share-actions { width: 100%; justify-content: space-between; }
  .xp-btn-download-primary { flex: 1; justify-content: center; }
  .share-pdf-frame { height: 50vh; }
  .share-video-el { max-height: 45vh; }
}
</style>
</head>
<body>
<div class="share-container">
  <div class="xp-titlebar">
    <div class="xp-title-left">
      <span class="xp-title-icon">\u{1F4C1}</span>
      <span>${safeFileName} - Shared File</span>
    </div>
    <div class="xp-title-btns">
      <a href="/" title="Home" class="xp-close">\u2715</a>
    </div>
  </div>

  <div class="share-header">
    <div class="share-file-info">
      <div class="share-file-icon">
        ${previewType === "video" ? "\u{1F3AC}" : previewType === "audio" ? "\u{1F3B5}" : previewType === "image" ? "\u{1F5BC}\uFE0F" : previewType === "pdf" ? "\u{1F4D1}" : previewType === "text" ? "\u{1F4DD}" : "\u{1F4E6}"}
      </div>
      <div class="share-file-details">
        <div class="share-file-title" title="${safeFileName}">${safeFileName}</div>
        <div class="share-file-meta">
          <span class="badge-size">${formattedSize}</span>
          <span>\u2022 ${dateStr}</span>
          ${expiryBadgeHtml}
        </div>
      </div>
    </div>
    <div class="share-actions">
      <a href="/${code}?dl=1" class="xp-btn-download-primary" download title="Download ${safeFileName}">
        \u2B07\uFE0F Download
      </a>
      <a href="/${code}?stream=1" target="_blank" rel="noopener" class="xp-sub-btn" title="Open direct URL in new tab">
        \u2197\uFE0F Direct URL
      </a>
      <button onclick="copyShareUrl()" id="btnCopyShareUrl" class="xp-sub-btn" title="Copy share link to clipboard">
        \u{1F517} Copy Link
      </button>
    </div>
  </div>

  <div class="share-body">
    ${previewContent}
  </div>

  <div class="share-statusbar">
    <div class="status-panel">1 item selected (${formattedSize})</div>
    <div class="status-panel">GLZ File Server \u2022 Safe & Direct Transfer</div>
  </div>
</div>

<script>
function copyShareUrl() {
  navigator.clipboard.writeText(window.location.origin + '/${code}').then(() => {
    const b = document.getElementById('btnCopyShareUrl');
    if (b) {
      const old = b.innerHTML;
      b.innerHTML = '\u2705 Copied!';
      setTimeout(() => { b.innerHTML = old; }, 2000);
    }
  });
}
<\/script>
</body>
</html>`;
}
__name(publicSharePage, "publicSharePage");
__name2(publicSharePage, "publicSharePage");
var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function randomCode(len = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}
__name(randomCode, "randomCode");
__name2(randomCode, "randomCode");
function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(html, "html");
__name2(html, "html");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
__name2(json, "json");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/login" && request.method === "GET") {
      return html(loginPage());
    }
    if (path === "/login" && request.method === "POST") {
      const form = await request.formData();
      const password = form.get("password") || "";
      if (safeEqual(String(password), env.AUTH_PASSWORD)) {
        const cookie = await makeSessionCookie(env.COOKIE_SECRET);
        return new Response(null, {
          status: 302,
          headers: { Location: "/", "Set-Cookie": cookie }
        });
      }
      return html(loginPage("Wrong password. Please try again."), 401);
    }
    if (path === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login", "Set-Cookie": clearSessionCookie() }
      });
    }
    const shortLinkMatch = (request.method === "GET" || request.method === "HEAD") && path.match(/^\/(?:dl\/|apk\/)?([A-Za-z0-9]{4,12})(?:\.([a-zA-Z0-9]+)|\/([^\/]+))?$/);
    const reservedWords = /* @__PURE__ */ new Set(["login", "logout", "api", "stream", "preview", "download", "public", "apks"]);
    if (shortLinkMatch && !reservedWords.has(shortLinkMatch[1].toLowerCase())) {
      const code = shortLinkMatch[1];
      const pathExt = (shortLinkMatch[2] || "").toLowerCase();
      const pathSubfile = (shortLinkMatch[3] || "").toLowerCase();
      const raw = await env.LINKS.get(code);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const key = data.key;
          const isApk = key.toLowerCase().endsWith(".apk") || pathExt === "apk" || pathSubfile.endsWith(".apk");
          const userAgent = (request.headers.get("User-Agent") || "").toLowerCase();
          const accept = (request.headers.get("Accept") || "").toLowerCase();
          const isDownloaderClient = userAgent.includes("glz-tv") || userAgent.includes("okhttp") || userAgent.includes("dalvik") || userAgent.includes("downloader") || userAgent.includes("android") || userAgent.includes("curl") || userAgent.includes("wget");
          const isExplicitDownload = url.searchParams.get("dl") === "1" || url.searchParams.get("download") === "1" || url.searchParams.get("direct") === "1";
          const isExplicitStream = url.searchParams.get("stream") === "1" || url.searchParams.get("raw") === "1";
          const isExplicitPage = url.searchParams.get("page") === "1" || url.searchParams.get("preview") === "1";
          const isPathDirect = path.startsWith("/dl/") || path.startsWith("/apk/") || pathExt === "apk" || Boolean(shortLinkMatch[3]);
          const serveDirect = isExplicitDownload || isPathDirect || !isExplicitPage && (data.direct === true || isDownloaderClient || !accept.includes("text/html") && isApk);
          if (serveDirect) {
            return serveR2Object(request, env, key, { inline: false });
          }
          if (isExplicitStream) {
            return serveR2Object(request, env, key, { inline: true });
          }
          if (request.method === "HEAD") {
            const head2 = await env.BUCKET.head(key);
            if (!head2) return new Response("File not found", { status: 404 });
            return new Response(null, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store"
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
              origin: url.origin
            })
          );
        } catch (err) {
          return new Response("Invalid short link data: " + err.message, { status: 500 });
        }
      }
      return new Response("Shared link has expired or does not exist.", { status: 404 });
    }
    if ((request.method === "GET" || request.method === "HEAD") && (path.startsWith("/public/") || path.startsWith("/apks/"))) {
      const rawSubpath = decodeURIComponent(path.slice(1));
      let head = await env.BUCKET.head(rawSubpath);
      let targetKey = rawSubpath;
      if (!head && path.startsWith("/public/")) {
        const trimmed = decodeURIComponent(path.slice("/public/".length));
        const altHead = await env.BUCKET.head(trimmed);
        if (altHead) {
          head = altHead;
          targetKey = trimmed;
        }
      }
      if (head) {
        return serveR2Object(request, env, targetKey, { inline: false });
      }
      return new Response("File not found in public storage.", { status: 404 });
    }
    if (!await isAuthed(request, env.COOKIE_SECRET)) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" }
      });
    }
    if (path === "/" && request.method === "GET") {
      let prefix = url.searchParams.get("prefix") || "";
      if (prefix && !prefix.endsWith("/")) prefix += "/";
      const { folders, files } = await listFolder(env, prefix);
      return html(browserPage({ prefix, folders, files }));
    }
    if ((path.startsWith("/stream/") || path.startsWith("/preview/")) && request.method === "GET") {
      const prefixToRemove = path.startsWith("/stream/") ? "/stream/" : "/preview/";
      const key = decodeURIComponent(path.slice(prefixToRemove.length));
      return serveR2Object(request, env, key, { inline: true });
    }
    if (path.startsWith("/download/") && request.method === "GET") {
      const key = decodeURIComponent(path.replace("/download/", ""));
      return serveR2Object(request, env, key, { inline: false });
    }
    if (path === "/api/list" && request.method === "GET") {
      let prefix = url.searchParams.get("prefix") || "";
      if (prefix && !prefix.endsWith("/")) prefix += "/";
      const data = await listFolder(env, prefix);
      return json(data);
    }
    if (path === "/api/mkdir" && request.method === "POST") {
      const { prefix = "", name } = await request.json();
      if (!name || typeof name !== "string") {
        return new Response("Missing or invalid name", { status: 400 });
      }
      const cleanName = name.replace(/[/\\]+/g, "").trim();
      if (!cleanName) return new Response("Invalid folder name", { status: 400 });
      const key = `${prefix}${cleanName}/.keep`;
      await env.BUCKET.put(key, new Uint8Array(0), {
        httpMetadata: { contentType: "text/plain" }
      });
      return json({ ok: true, key });
    }
    if (path === "/api/upload-url" && request.method === "POST") {
      const { key, contentType } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
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
    if (path === "/api/delete" && request.method === "POST") {
      const { key } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
      await env.BUCKET.delete(key);
      return new Response(null, { status: 204 });
    }
    if (path === "/api/rename" && request.method === "POST") {
      const { oldKey, newKey } = await request.json();
      if (!oldKey || !newKey) return new Response("Missing oldKey/newKey", { status: 400 });
      if (oldKey === newKey) return new Response(null, { status: 204 });
      const ok = await copyObject(r2Client(env), env, oldKey, newKey);
      if (!ok) return new Response("Rename (copy step) failed", { status: 502 });
      await env.BUCKET.delete(oldKey);
      return new Response(null, { status: 204 });
    }
    if (path === "/api/delete-folder" && request.method === "POST") {
      const { prefix } = await request.json();
      if (!prefix) return new Response("Missing prefix", { status: 400 });
      const keys = await listAllKeysUnderPrefix(env, prefix);
      await batchDelete(env, keys);
      return json({ deleted: keys.length });
    }
    if (path === "/api/rename-folder" && request.method === "POST") {
      const { oldPrefix, newPrefix } = await request.json();
      if (!oldPrefix || !newPrefix) return new Response("Missing oldPrefix/newPrefix", { status: 400 });
      if (oldPrefix === newPrefix) return new Response(null, { status: 204 });
      const keys = await listAllKeysUnderPrefix(env, oldPrefix);
      const client = r2Client(env);
      const failed = [];
      await runWithConcurrency(keys, 8, async (oldKey) => {
        const newKey = newPrefix + oldKey.slice(oldPrefix.length);
        const ok = await copyObject(client, env, oldKey, newKey);
        if (!ok) failed.push(oldKey);
      });
      if (failed.length) {
        return new Response(`Failed to move ${failed.length} of ${keys.length} item(s)`, { status: 502 });
      }
      await batchDelete(env, keys);
      return json({ moved: keys.length });
    }
    if (path === "/api/share-link" && request.method === "POST") {
      const { key, days, direct } = await request.json();
      if (!key) return new Response("Missing key", { status: 400 });
      const numDays = Number(days);
      const isPermanent = days === 0 || days === "0" || days === "permanent" || days === null;
      const ttlDays = isPermanent ? 0 : numDays > 0 ? numDays : 7;
      const ttlSeconds = isPermanent ? null : Math.max(60, Math.round(ttlDays * 24 * 60 * 60));
      let code = randomCode();
      while (await env.LINKS.get(code)) {
        code = randomCode();
      }
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1e3 : null;
      const isApk = key.toLowerCase().endsWith(".apk");
      const isDirect = direct !== void 0 ? Boolean(direct) : isApk;
      const linkData = {
        key,
        expiresAt,
        direct: isDirect,
        isApk,
        createdAt: Date.now()
      };
      const putOptions = ttlSeconds ? { expirationTtl: ttlSeconds } : {};
      await env.LINKS.put(code, JSON.stringify(linkData), putOptions);
      const filename = key.split("/").pop() || "file";
      const shareUrl = `${url.origin}/${code}`;
      const directUrl = `${url.origin}/${code}${isApk ? ".apk" : "?dl=1"}`;
      const rawDirectUrl = `${url.origin}/${code}`;
      return json({
        url: isDirect ? directUrl : shareUrl,
        code,
        shareUrl,
        directUrl,
        rawDirectUrl,
        expiresAt,
        direct: isDirect,
        isApk,
        filename
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
export {
  index_default as default
};
/*! Bundled license information:

aws4fetch/dist/aws4fetch.esm.mjs:
  (**
   * @license MIT <https://opensource.org/licenses/MIT>
   * @copyright Michael Hart 2024
   *)
*/
//# sourceMappingURL=index.js.map
