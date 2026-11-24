import { APP_VERSION, escText } from "../config.js";

export function browserPage({ prefix = "", folders = [], files = [] }) {
  const folderTitle = prefix ? prefix.replace(/\/$/, "").split("/").pop() : "All Files";
  const initPayload = JSON.stringify({
    prefix,
    folders,
    files,
    version: APP_VERSION
  }).replace(/<\//g, "<\\/");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escText(folderTitle)} — dl.glztech.com</title>
<meta name="description" content="glztech Cloudflare R2 File Server">
<script>(function(){var t=localStorage.getItem('glz_theme');if(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)t='dark';if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/app.css?v=${APP_VERSION}">
</head>
<body>
<div id="topLoader"></div>
<div class="drawer-backdrop" id="drawerBackdrop" onclick="window.__glz.toggleDrawer(false)"></div>

<div class="app-shell">
  <aside class="sidebar" id="sidebar" aria-label="Navigation">
    <div class="sidebar-brand">
      <a class="brand-mark" href="/" onclick="event.preventDefault();window.__glz.toggleDrawer(false);window.__glz.navigateTo('')">
        <span class="brand-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </span>
        <span>
          <div>dl.glztech.com</div>
          <div class="brand-sub">R2 Storage</div>
        </span>
      </a>
    </div>

    <div class="sidebar-cta-wrap">
      <button type="button" class="btn btn-primary" style="flex:1" onclick="window.__glz.toggleDrawer(false);document.getElementById('fileInput').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Upload
      </button>
      <button type="button" class="btn" title="New folder" onclick="window.__glz.toggleDrawer(false);window.__glz.promptNewFolder()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
      </button>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Browse</div>
      <button type="button" class="nav-btn active" id="navRoot" onclick="window.__glz.toggleDrawer(false);window.__glz.navigateTo('')">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        <span>All Files</span>
      </button>
      <button type="button" class="nav-btn" onclick="window.__glz.openShareLinksManager()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span>Share Links</span>
      </button>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">
        <span>Pinned</span>
        <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 5px;font-size:11px" onclick="window.__glz.pinCurrentFolder()" title="Pin current folder">+ Pin</button>
      </div>
      <div id="favoritesList"></div>
    </div>

    <div class="sidebar-footer">
      <div class="storage-summary" id="storageSummary">Ready</div>
      <div class="sidebar-footer-row">
        <button type="button" class="btn btn-sm btn-ghost" id="btnThemeToggle" onclick="window.__glz.toggleTheme()">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <span class="theme-label">Dark mode</span>
        </button>
        <a class="btn btn-sm btn-ghost" href="/logout" title="Sign out">Sign out</a>
      </div>
      <div class="sidebar-footer-row">
        <span class="ver-tag">glz-dl-server</span>
        <span class="ver-tag">v${APP_VERSION}</span>
      </div>
    </div>
  </aside>

  <main class="workspace" id="xpMain">
    <header class="topbar">
      <button type="button" class="btn btn-icon mobile-menu-btn" onclick="window.__glz.toggleDrawer()" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="filterInput" class="search-input" placeholder="Filter this folder..." oninput="window.__glz.onFilterInput(this.value)">
        <button type="button" id="filterClear" class="search-clear" onclick="window.__glz.clearFilter()" aria-label="Clear search">&times;</button>
        <button type="button" id="btnGlobalSearch" class="search-scope-btn" onclick="window.__glz.toggleGlobalSearch()" title="Toggle current folder vs all folders">This folder</button>
      </div>

      <div class="topbar-actions">
        <button type="button" class="btn btn-icon" id="btnUp" onclick="window.__glz.goUp()" title="Up one folder" aria-label="Up one folder">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
        <button type="button" class="btn btn-icon hide-mobile" onclick="window.__glz.refreshList()" title="Refresh" aria-label="Refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button type="button" class="btn btn-primary hide-mobile" onclick="document.getElementById('fileInput').click()">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </button>
      </div>
    </header>

    <div class="subbar">
      <nav class="breadcrumbs" id="breadcrumbs" aria-label="Breadcrumb"></nav>
      <div class="subbar-right">
        <div class="segmented" role="group" aria-label="View mode">
          <button type="button" id="btnViewList" class="active" onclick="window.__glz.setViewMode('list')" title="List view" aria-label="List view">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
          </button>
          <button type="button" id="btnViewGrid" onclick="window.__glz.setViewMode('grid')" title="Grid view" aria-label="Grid view">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
        </div>
        <button type="button" class="btn btn-sm" id="btnSelectMode" onclick="window.__glz.toggleSelectMode()" title="Multi-select items">Select</button>
        <button type="button" class="btn btn-sm hide-mobile" onclick="window.__glz.promptNewFolder()">New folder</button>
      </div>
    </div>

    <div class="action-banner" id="bulkBar">
      <span class="action-banner-left" id="bulkCount">0 selected</span>
      <div class="action-banner-right">
        <button type="button" class="btn btn-sm" onclick="window.__glz.openMoveModal()">Move to...</button>
        <button type="button" class="btn btn-sm" onclick="window.__glz.cutSelected()">Cut</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="window.__glz.deleteSelected()">Delete</button>
        <button type="button" class="btn btn-sm btn-ghost" onclick="window.__glz.selectAllVisible(false)">Clear</button>
      </div>
    </div>

    <div class="action-banner" id="clipboardBar">
      <span class="action-banner-left" id="clipboardText">Ready to move</span>
      <div class="action-banner-right">
        <button type="button" class="btn btn-sm btn-primary" onclick="window.__glz.pasteClipboard()">Paste Here</button>
        <button type="button" class="btn btn-sm btn-ghost" onclick="window.__glz.clearClipboard()">Cancel</button>
      </div>
    </div>

    <div id="listContainer"></div>
  </main>
</div>

<input type="file" id="fileInput" multiple style="display:none">

<div class="drop-overlay" id="dropOverlay">
  <div class="drop-overlay-card">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    <h2>Drop files to upload</h2>
    <p>Files over 15 MB automatically use resumable multipart upload</p>
  </div>
</div>

<div class="upload-tray" id="uploadTray" aria-live="polite">
  <div class="upload-tray-head">
    <span id="uploadTrayTitle">Uploads</span>
    <button type="button" class="btn btn-sm btn-ghost" onclick="window.__glz.clearCompletedUploads()">Clear done</button>
  </div>
  <div class="upload-tray-list" id="uploadTrayList"></div>
</div>

<div class="ctx-menu" id="ctxMenu" role="menu" aria-label="Item actions"></div>

<div class="modal-backdrop" id="dialogBackdrop" onclick="if(event.target===this)window.__glz.closeDialog()">
  <div class="modal" id="dialogWindow" role="dialog" aria-modal="true">
    <div class="modal-head">
      <h3 id="dialogTitle">Dialog</h3>
      <button type="button" class="btn btn-icon btn-ghost" onclick="window.__glz.closeDialog()" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body" id="dialogBody"></div>
  </div>
</div>

<div class="player-backdrop" id="playerBackdrop" onclick="if(event.target===this)window.__glz.closePlayer()">
  <div class="player-window" role="dialog" aria-modal="true">
    <div class="player-header">
      <div class="player-title-wrap">
        <div class="player-title" id="playerTitle">Preview</div>
        <div class="player-meta" id="playerMeta"></div>
      </div>
      <div class="player-controls">
        <button type="button" class="pbtn" id="playerPrevBtn" onclick="window.__glz.playerStep(-1)" title="Previous" style="display:none">&larr;</button>
        <button type="button" class="pbtn" id="playerNextBtn" onclick="window.__glz.playerStep(1)" title="Next" style="display:none">&rarr;</button>
        <button type="button" class="pbtn pbtn-download" onclick="window.__glz.playerDownloadCurrent()">Download</button>
        <button type="button" class="pbtn" onclick="window.__glz.playerShareCurrent()">Share</button>
        <button type="button" class="pbtn" onclick="window.__glz.playerOpenRaw()">Raw</button>
        <button type="button" class="pbtn" onclick="window.__glz.closePlayer()" aria-label="Close">&times;</button>
      </div>
    </div>
    <div class="player-content" id="playerContent"></div>
  </div>
</div>

<div id="toasts"></div>

<script>window.__GLZ_INIT__ = ${initPayload};</script>
<script src="/assets/app.js?v=${APP_VERSION}"></script>
</body>
</html>`;
}
