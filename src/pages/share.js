import { APP_VERSION, escAttr, escText, getMimeType, getPreviewType, humanSize } from "../config.js";
import { PDF_PREVIEW_SCRIPT } from "../assets/pdf-viewer.js";

export function publicSharePage({
  code,
  key,
  size = 0,
  uploaded = null,
  expiresAt = null,
  direct = false,
  origin = "",
  downloads = 0,
  maxDownloads = null
}) {
  const fileName = key.split("/").pop() || "file";
  const previewType = getPreviewType(fileName);
  const mimeType = getMimeType(fileName);
  const isApk = fileName.toLowerCase().endsWith(".apk");
  const safeFileName = escText(fileName);
  const formattedSize = humanSize(size);
  const dateStr = uploaded ? new Date(uploaded).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Recently";
  const absBase = origin || "";
  const absStreamUrl = `${absBase}/${code}?stream=1`;
  const absPageUrl = `${absBase}/${code}${direct ? "?page=1" : ""}`;

  let expiryStr = "";
  if (expiresAt) {
    const diffHours = Math.round((expiresAt - Date.now()) / (1000 * 60 * 60));
    if (diffHours > 24) expiryStr = `Expires in ${Math.round(diffHours / 24)}d`;
    else if (diffHours > 0) expiryStr = `Expires in ${diffHours}h`;
    else expiryStr = "Expiring soon";
  }

  let previewContent = "";
  let metaType = "website";
  let ogTags = absPageUrl ? `<meta property="og:url" content="${escAttr(absPageUrl)}">` : "";

  if (previewType === "video") {
    metaType = "video.other";
    ogTags += `\n<meta property="og:video" content="${escAttr(absStreamUrl)}">\n<meta property="og:video:type" content="${mimeType}">`;
    previewContent = `
      <div class="share-video-box" id="shareVideoBox">
        <video controls playsinline webkit-playsinline preload="metadata" class="share-video-el" id="shareVideoEl">
          <source src="/${code}?stream=1" type="${mimeType}">
          Your browser does not support HTML5 video streaming.
        </video>
      </div>
      <script>
        (function() {
          const v = document.getElementById('shareVideoEl');
          if (!v) return;
          const onErr = () => {
            const box = document.getElementById('shareVideoBox');
            if (box) box.innerHTML = '<div class="share-media-err"><p>Your mobile browser cannot decode this video format inline. You can download it to play in an external player.</p><a href="/${code}?dl=1" class="sbtn sbtn-primary" download>Download Video (${formattedSize})</a></div>';
          };
          v.addEventListener('error', onErr);
          const s = v.querySelector('source');
          if (s) s.addEventListener('error', onErr);
        })();
      </script>`;
  } else if (previewType === "audio") {
    metaType = "music.song";
    ogTags += `\n<meta property="og:audio" content="${escAttr(absStreamUrl)}">\n<meta property="og:audio:type" content="${mimeType}">`;
    previewContent = `
      <div class="share-audio-box">
        <div class="audio-title">${safeFileName}</div>
        <div class="audio-sub">${mimeType} &middot; ${formattedSize}</div>
        <audio controls preload="metadata" class="share-audio-el" id="shareAudioEl">
          <source src="/${code}?stream=1" type="${mimeType}">
          Your browser does not support HTML5 audio streaming.
        </audio>
        <div id="shareAudioErr" style="display:none;margin-top:10px;color:var(--danger);font-size:12px;">This audio format cannot be decoded inline. Use Download above to play locally.</div>
      </div>
      <script>
        (function() {
          const a = document.getElementById('shareAudioEl');
          const e = document.getElementById('shareAudioErr');
          if (!a || !e) return;
          const onErr = () => { e.style.display = 'block'; };
          a.addEventListener('error', onErr);
          const s = a.querySelector('source');
          if (s) s.addEventListener('error', onErr);
        })();
      </script>`;
  } else if (previewType === "image") {
    metaType = "image";
    ogTags += `\n<meta property="og:image" content="${escAttr(absStreamUrl)}">`;
    previewContent = `
      <div class="share-img-box">
        <img src="/${code}?stream=1" alt="${escAttr(fileName)}" class="share-img-el" decoding="async" onclick="this.classList.toggle('share-img-zoomed')" />
      </div>`;
  } else if (previewType === "pdf") {
    previewContent = `
      <div class="share-pdf-box">
        <div id="sharePdfMount" class="share-pdf-mount">
          <div class="pdf-loading">Loading PDF preview...</div>
        </div>
        <div class="pdf-alt-bar">
          <a href="/${code}?dl=1" download="${escAttr(fileName)}">Download PDF (${formattedSize})</a>
          &middot;
          <a href="/${code}?stream=1" target="_blank" rel="noopener">Open raw PDF</a>
        </div>
      </div>
      <script>
        ${PDF_PREVIEW_SCRIPT}
        (function() {
          const mount = document.getElementById('sharePdfMount');
          if (!mount) return;
          if (shouldUseInlinePdfRenderer()) {
            renderInlinePdf(mount, '/${code}?stream=1', '/${code}?dl=1', ${JSON.stringify(fileName).replace(/<\//g, "<\\/")});
          } else {
            mount.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.className = 'share-pdf-frame';
            iframe.src = '/${code}?stream=1#toolbar=1';
            mount.appendChild(iframe);
          }
        })();
      </script>`;
  } else if (previewType === "text") {
    previewContent = `
      <div class="share-text-box">
        <div class="text-head">
          <span id="textHeadLabel">Document Preview</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <button type="button" id="btnLoadFullText" class="sbtn" style="padding:4px 9px;font-size:12px;display:none;" onclick="loadShareText(true)">Load Full File</button>
            <button type="button" id="btnCopyText" class="sbtn" style="padding:4px 9px;font-size:12px;" onclick="copyShareText()">Copy Text</button>
          </div>
        </div>
        <div id="textLoading" class="text-loading">Loading text preview...</div>
        <pre id="textPre" class="text-pre" style="display:none;"></pre>
      </div>
      <script>
        const SHARE_TEXT_LIMIT = 262144;
        function loadShareText(full) {
          const l = document.getElementById('textLoading');
          const p = document.getElementById('textPre');
          const head = document.getElementById('textHeadLabel');
          const fullBtn = document.getElementById('btnLoadFullText');
          if (full && fullBtn) { fullBtn.disabled = true; fullBtn.textContent = 'Loading...'; }
          const opts = full ? {} : { headers: { Range: 'bytes=0-' + (SHARE_TEXT_LIMIT - 1) } };
          fetch('/${code}?stream=1', opts)
            .then(async r => {
              if (!r.ok && r.status !== 206) throw new Error('Status ' + r.status);
              const txt = await r.text();
              const cr = r.headers.get('Content-Range') || '';
              const m = /\\/(\\d+)$/.exec(cr);
              const total = m ? Number(m[1]) : txt.length;
              const partial = !full && r.status === 206 && total > SHARE_TEXT_LIMIT;
              if (l) l.style.display = 'none';
              if (p) { p.textContent = txt; p.style.display = 'block'; }
              if (fullBtn) {
                fullBtn.style.display = partial ? 'inline-flex' : 'none';
                fullBtn.disabled = false;
                fullBtn.textContent = 'Load Full File';
              }
              if (head) head.textContent = partial ? 'Document Preview (first 256 KB)' : 'Document Preview';
            })
            .catch(() => {
              if (l) { l.style.display = 'block'; l.textContent = 'Unable to render direct preview. Please download the file to view.'; }
            });
        }
        loadShareText(false);
        function copyShareText() {
          const p = document.getElementById('textPre');
          if (!p) return;
          navigator.clipboard.writeText(p.textContent).then(() => {
            const b = document.getElementById('btnCopyText');
            if (b) { const old = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = old; }, 1800); }
          });
        }
      </script>`;
  } else if (isApk) {
    metaType = "application/vnd.android.package-archive";
    const apkDirectUrl = `/${code}.apk`;
    const fullDirectUrl = absBase + apkDirectUrl;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=" + encodeURIComponent(fullDirectUrl);
    previewContent = `
      <div class="share-file-box">
        <div class="file-hero-name">${safeFileName}</div>
        <div class="file-hero-meta"><span class="meta-pill apk">Android Package (APK)</span> &middot; ${formattedSize}</div>
        <div class="file-hero-desc">Ready for direct installation on GLZTV, Android TV, Fire TV, or Android mobile devices.</div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <a href="/${code}?dl=1" class="sbtn sbtn-primary" download="${escAttr(fileName)}">Download APK (${formattedSize})</a>
          <button type="button" onclick="copyDirectApkUrl()" id="btnCopyDirectApk" class="sbtn">Copy Direct APK URL</button>
        </div>
        <div class="apk-tv-box">
          <div class="apk-tv-header">GLZTV &amp; TV Downloader Direct Link</div>
          <div class="apk-tv-sub">Paste into GLZTV App Repository URL or AFTV Downloader to install directly:</div>
          <div class="apk-input-row">
            <input type="text" id="apkDirectInput" readonly value="${escAttr(fullDirectUrl)}" class="apk-input" onclick="this.select()" />
            <button type="button" onclick="copyApkDirectInput()" id="btnCopyApkInput" class="sbtn">Copy</button>
          </div>
          <div class="apk-tv-qr-row">
            <img src="${escAttr(qrUrl)}" alt="QR Code" width="96" height="96" class="apk-qr-img" />
            <div class="apk-qr-text">
              <strong>Scan to install</strong><br>
              Scan with your phone or Android TV remote app to download this APK immediately.
            </div>
          </div>
        </div>
      </div>
      <script>
        function copyDirectApkUrl() {
          const u = window.location.origin + '/${code}.apk';
          navigator.clipboard.writeText(u).then(() => {
            const b = document.getElementById('btnCopyDirectApk');
            if (b) { const old = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = old; }, 1800); }
          });
        }
        function copyApkDirectInput() {
          const inp = document.getElementById('apkDirectInput');
          if (!inp) return;
          inp.select();
          navigator.clipboard.writeText(inp.value).then(() => {
            const b = document.getElementById('btnCopyApkInput');
            if (b) { const old = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = old; }, 1800); }
          });
        }
      </script>`;
  } else {
    previewContent = `
      <div class="share-file-box">
        <div class="file-hero-name">${safeFileName}</div>
        <div class="file-hero-meta">${mimeType} &middot; ${formattedSize}</div>
        <div class="file-hero-desc">No inline preview available for this format. Download the file directly to your device.</div>
        <a href="/${code}?dl=1" class="sbtn sbtn-primary" download="${escAttr(fileName)}">Download File (${formattedSize})</a>
      </div>`;
  }

  const remainingText = maxDownloads
    ? `<span class="meta-pill warn">${Math.max(0, maxDownloads - downloads)} of ${maxDownloads} downloads left</span>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeFileName} — dl.glztech.com</title>
<meta name="description" content="View or download ${escAttr(fileName)} (${formattedSize}) shared via dl.glztech.com.">
<meta property="og:title" content="${escAttr(fileName)} (${formattedSize})">
<meta property="og:description" content="View or download ${escAttr(fileName)} on dl.glztech.com.">
<meta property="og:type" content="${metaType}">
${ogTags}
<script>(function(){var t=localStorage.getItem('glz_theme');if(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)t='dark';if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/share.css?v=${APP_VERSION}">
</head>
<body>
<main class="share-shell">
  <header class="share-head">
    <div class="share-title-group">
      <div class="share-type-badge" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="share-title-wrap">
        <h1 title="${escAttr(fileName)}">${safeFileName}</h1>
        <div class="share-meta">
          <span class="meta-pill">${formattedSize}</span>
          <span>${dateStr}</span>
          ${expiryStr ? `<span class="meta-pill warn">${escText(expiryStr)}</span>` : ""}
          ${remainingText}
        </div>
      </div>
    </div>
    <div class="share-actions">
      <a href="/${code}?dl=1" class="sbtn sbtn-primary" download="${escAttr(fileName)}">Download</a>
      <a href="/${code}?stream=1" target="_blank" rel="noopener" class="sbtn">Direct URL</a>
      <button type="button" onclick="copyShareUrl()" id="btnCopyShareUrl" class="sbtn">Copy Link</button>
    </div>
  </header>

  <section class="share-body">
    ${previewContent}
  </section>

  <footer class="share-foot">
    <span>dl.glztech.com</span>
    <span>v${APP_VERSION}</span>
  </footer>
</main>

<script>
function copyShareUrl() {
  navigator.clipboard.writeText(window.location.origin + '/${code}${direct ? "?page=1" : ""}').then(() => {
    const b = document.getElementById('btnCopyShareUrl');
    if (b) { const old = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = old; }, 1800); }
  });
}
</script>
</body>
</html>`;
}
