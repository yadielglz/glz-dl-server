export const BASE_TOKENS = `
:root {
  --bg-canvas: #f4f3ef;
  --bg-surface: #ffffff;
  --bg-subtle: #faf9f6;
  --bg-hover: #f1f0eb;
  --bg-selected: #edf3fe;
  --bg-selected-border: #bfd5fb;
  --border: #e4e2da;
  --border-strong: #cfcdc3;
  --text: #181816;
  --text-secondary: #585650;
  --text-muted: #8a877f;
  --accent: #1d5fd6;
  --accent-hover: #174fb6;
  --accent-soft: #eaf1fd;
  --success: #1d7a4c;
  --success-hover: #16633d;
  --success-soft: #e8f5ee;
  --danger: #c6332a;
  --danger-soft: #fdeeed;
  --warning: #a66208;
  --warning-soft: #fdf4e4;
  --shadow-sm: 0 1px 2px rgba(24, 24, 22, 0.05);
  --shadow-md: 0 8px 24px rgba(24, 24, 22, 0.1);
  --shadow-lg: 0 20px 56px rgba(15, 15, 13, 0.22);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

[data-theme="dark"] {
  --bg-canvas: #121210;
  --bg-surface: #1a1a18;
  --bg-subtle: #151513;
  --bg-hover: #232320;
  --bg-selected: #1b2840;
  --bg-selected-border: #2e4a7c;
  --border: #2a2a26;
  --border-strong: #3a3a35;
  --text: #f0efe9;
  --text-secondary: #aba9a0;
  --text-muted: #76746c;
  --accent: #4c8bf5;
  --accent-hover: #679df7;
  --accent-soft: #1a2942;
  --success: #2ea368;
  --success-hover: #3ab677;
  --success-soft: #152b20;
  --danger: #e5534b;
  --danger-soft: #311919;
  --warning: #e09f3e;
  --warning-soft: #2e2414;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.28);
  --shadow-md: 0 10px 28px rgba(0, 0, 0, 0.42);
  --shadow-lg: 0 24px 64px rgba(0, 0, 0, 0.65);
}

*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
  color: var(--text);
  background: var(--bg-canvas);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button, input, select { font-family: inherit; font-size: inherit; color: inherit; }
`;

export const APP_CSS = `${BASE_TOKENS}
html, body { height: 100%; height: 100dvh; overflow: hidden; }

/* Top Loading Bar */
#topLoader {
  position: fixed; top: 0; left: 0; height: 2.5px; width: 0%;
  background: var(--accent); z-index: 5000;
  transition: width 0.25s ease, opacity 0.25s ease; opacity: 0; pointer-events: none;
}
#topLoader.show { opacity: 1; width: 78%; }

/* App Shell */
.app-shell {
  display: flex; height: 100%; height: 100dvh; width: 100%; overflow: hidden;
  background: var(--bg-canvas);
}

/* Sidebar */
.sidebar {
  width: 244px; flex: none; display: flex; flex-direction: column;
  background: var(--bg-subtle); border-right: 1px solid var(--border);
  overflow-y: auto; z-index: 40;
}
.sidebar-brand {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 14px; border-bottom: 1px solid var(--border);
}
.brand-mark {
  display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none;
  font-weight: 600; font-size: 14px; letter-spacing: -0.02em;
}
.brand-mark:hover { text-decoration: none; }
.brand-icon {
  width: 28px; height: 28px; border-radius: 7px; background: var(--text); color: var(--bg-surface);
  display: grid; place-items: center; flex: none;
}
.brand-sub { font-size: 11px; font-weight: 500; color: var(--text-muted); font-family: var(--font-mono); }

.sidebar-section { padding: 12px 10px; border-bottom: 1px solid var(--border); }
.sidebar-section:last-of-type { border-bottom: none; }
.sidebar-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-muted); padding: 4px 10px 6px; display: flex; align-items: center; justify-content: space-between;
}

.nav-btn {
  width: 100%; display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border: none; background: transparent; border-radius: var(--radius-sm);
  color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer;
  text-align: left; transition: background 0.12s, color 0.12s;
}
.nav-btn:hover { background: var(--bg-hover); color: var(--text); }
.nav-btn.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.nav-btn svg { width: 16px; height: 16px; flex: none; stroke: currentColor; }
.nav-btn span.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.nav-btn .fav-rm {
  opacity: 0; font-size: 12px; color: var(--text-muted); padding: 0 3px; border-radius: 4px;
}
.nav-btn:hover .fav-rm { opacity: 1; }
.nav-btn .fav-rm:hover { color: var(--danger); background: var(--danger-soft); }

.sidebar-cta-wrap { padding: 12px 12px 10px; display: flex; gap: 6px; }
.sidebar-footer {
  margin-top: auto; padding: 12px 14px; border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 8px;
}
.storage-summary { font-variant-numeric: tabular-nums; color: var(--text-secondary); font-size: 12px; }
.sidebar-footer-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.ver-tag { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

/* Main Workspace */
.workspace {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  background: var(--bg-surface); position: relative;
}

/* Header */
.topbar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  border-bottom: 1px solid var(--border); background: var(--bg-surface); flex: none;
}

.search-box {
  flex: 1; min-width: 0; max-width: 480px; display: flex; align-items: center; gap: 6px;
  background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 5px 6px 5px 10px; transition: border-color 0.15s, background 0.15s;
}
.search-box:focus-within { border-color: var(--accent); background: var(--bg-surface); }
.search-box svg { width: 15px; height: 15px; color: var(--text-muted); flex: none; }
.search-input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-size: 13px; color: var(--text);
}
.search-input::placeholder { color: var(--text-muted); }
.search-scope-btn {
  border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-secondary);
  border-radius: 5px; padding: 2px 7px; font-size: 11px; font-weight: 500; cursor: pointer;
  white-space: nowrap; flex: none; transition: all 0.12s;
}
.search-scope-btn.active {
  background: var(--accent-soft); border-color: var(--bg-selected-border); color: var(--accent); font-weight: 600;
}
.search-clear {
  display: none; border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; padding: 2px 4px; border-radius: 4px; line-height: 1; flex: none;
}
.search-clear.show { display: inline-flex; }
.search-clear:hover { color: var(--text); background: var(--bg-hover); }

.topbar-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex: none; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: background 0.12s, border-color 0.12s;
  line-height: 1.2;
}
.btn:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--border-strong); }
.btn:disabled { opacity: 0.45; cursor: default; }
.btn svg { width: 15px; height: 15px; stroke: currentColor; flex: none; }
.btn-primary {
  background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn-success {
  background: var(--success); border-color: var(--success); color: #fff; font-weight: 600;
}
.btn-success:hover:not(:disabled) { background: var(--success-hover); border-color: var(--success-hover); }
.btn-danger {
  background: var(--danger-soft); border-color: transparent; color: var(--danger); font-weight: 600;
}
.btn-danger:hover:not(:disabled) { background: var(--danger); color: #fff; }
.btn-ghost { background: transparent; border-color: transparent; color: var(--text-secondary); }
.btn-ghost:hover:not(:disabled) { background: var(--bg-hover); color: var(--text); border-color: transparent; }
.btn-sm { padding: 5px 9px; font-size: 12px; }
.btn-icon { width: 32px; height: 32px; padding: 0; flex: none; }
.btn.mobile-menu-btn { display: none; }

.segmented {
  display: inline-flex; background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 2px; gap: 2px;
}
.segmented button {
  border: none; background: transparent; color: var(--text-muted); cursor: pointer;
  padding: 4px 7px; border-radius: 4px; display: inline-flex; align-items: center;
}
.segmented button.active { background: var(--bg-surface); color: var(--text); box-shadow: var(--shadow-sm); }
.segmented svg { width: 15px; height: 15px; stroke: currentColor; }

/* Subbar: Breadcrumbs & Context Controls */
.subbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--bg-subtle); flex: none;
  min-height: 42px;
}
.breadcrumbs {
  display: flex; align-items: center; gap: 4px; overflow-x: auto; white-space: nowrap;
  font-size: 13px; min-width: 0; scrollbar-width: none;
}
.breadcrumbs::-webkit-scrollbar { display: none; }
.crumb {
  color: var(--text-secondary); padding: 3px 6px; border-radius: 5px; font-weight: 500;
  cursor: pointer; border: 1px solid transparent; transition: all 0.12s; text-decoration: none;
}
.crumb:hover { background: var(--bg-hover); color: var(--text); text-decoration: none; }
.crumb.current { color: var(--text); font-weight: 600; }
.crumb.drag-over { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.crumb-sep { color: var(--text-muted); font-size: 12px; user-select: none; }

.subbar-right { display: flex; align-items: center; gap: 6px; flex: none; }

/* Selection & Clipboard Action Bars */
.action-banner {
  display: none; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  padding: 8px 16px; background: var(--accent-soft); border-bottom: 1px solid var(--bg-selected-border);
  color: var(--text); font-size: 13px; flex: none;
}
.action-banner.show { display: flex; }
.action-banner-left { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--accent); }
.action-banner-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* File Container */
#listContainer {
  flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch;
  background: var(--bg-surface); position: relative;
}
#listContainer.loading { opacity: 0.6; pointer-events: none; }

/* Details Table View */
table.file-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.file-table thead th {
  position: sticky; top: 0; z-index: 5; background: var(--bg-subtle);
  border-bottom: 1px solid var(--border); padding: 8px 12px;
  text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted); user-select: none; cursor: pointer;
}
table.file-table thead th:hover { color: var(--text); }
table.file-table thead th.col-check { width: 40px; padding-right: 4px; cursor: default; text-align: center; }
table.file-table thead th.col-size { width: 100px; text-align: right; }
table.file-table thead th.col-date { width: 160px; }
table.file-table thead th.col-act { width: 44px; cursor: default; }
.sort-arrow { margin-left: 4px; font-size: 10px; color: var(--accent); }

tbody tr.item-row {
  border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.1s;
  user-select: none;
}
tbody tr.item-row:hover { background: var(--bg-hover); }
tbody tr.item-row.selected { background: var(--bg-selected); }
tbody tr.item-row.drag-over { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--accent-soft); }
tbody tr.item-row td { padding: 9px 12px; vertical-align: middle; white-space: nowrap; }
tbody tr.item-row td.col-check { text-align: center; padding-right: 4px; }
tbody tr.item-row td.col-name { overflow: hidden; text-overflow: ellipsis; }
tbody tr.item-row td.col-size {
  text-align: right; color: var(--text-secondary); font-family: var(--font-mono);
  font-size: 12px; font-variant-numeric: tabular-nums;
}
tbody tr.item-row td.col-date {
  color: var(--text-muted); font-size: 12px; font-variant-numeric: tabular-nums;
}
tbody tr.item-row td.col-act { text-align: center; padding: 4px 6px; }

.name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.name-text-wrap { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.name-main { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: var(--text); }
.name-sub { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); }

.item-chk {
  width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; margin: 0;
  vertical-align: middle;
}

.row-more-btn {
  width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted);
  border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.row-more-btn:hover { background: var(--bg-hover); color: var(--text); }
.row-more-btn svg { width: 16px; height: 16px; }

/* Type Icon Badges */
.file-badge {
  width: 28px; height: 28px; border-radius: 6px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-secondary);
}
.file-badge svg { width: 16px; height: 16px; stroke: currentColor; }
.file-badge.kind-folder { background: #fdf3dc; border-color: #f0d79c; color: #a96d10; }
[data-theme="dark"] .file-badge.kind-folder { background: #2d2412; border-color: #4f3d19; color: #e8b04b; }
.file-badge.kind-video { background: #eaf1fd; border-color: #c5daf9; color: #1d5fd6; }
[data-theme="dark"] .file-badge.kind-video { background: #19263e; border-color: #2c436b; color: #679df7; }
.file-badge.kind-audio { background: #f2eefc; border-color: #d9cef7; color: #6441a5; }
[data-theme="dark"] .file-badge.kind-audio { background: #241d35; border-color: #3d3159; color: #b197fc; }
.file-badge.kind-img { background: #e8f5ee; border-color: #bfe4cf; color: #1d7a4c; }
[data-theme="dark"] .file-badge.kind-img { background: #152b20; border-color: #254d38; color: #47c283; }
.file-badge.kind-pdf { background: #fdeeed; border-color: #f6c9c6; color: #c6332a; }
[data-theme="dark"] .file-badge.kind-pdf { background: #311919; border-color: #5a2a28; color: #f07167; }
.file-badge.kind-apk { background: #e8f6ec; border-color: #b7e2c4; color: #19733b; }
[data-theme="dark"] .file-badge.kind-apk { background: #142a1c; border-color: #244f34; color: #4cd07d; }
.file-badge.kind-zip, .file-badge.kind-iso { background: #f5efe6; border-color: #e0d3c0; color: #805724; }
[data-theme="dark"] .file-badge.kind-zip, [data-theme="dark"] .file-badge.kind-iso { background: #2a2319; border-color: #473b29; color: #d9a86c; }

/* Grid / Thumbnail View */
.file-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(164px, 1fr));
  gap: 12px; padding: 16px;
}
.grid-card {
  position: relative; display: flex; flex-direction: column;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  overflow: hidden; cursor: pointer; transition: border-color 0.14s, box-shadow 0.14s, transform 0.12s;
  user-select: none;
}
.grid-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
.grid-card.selected { border-color: var(--accent); background: var(--bg-selected); box-shadow: 0 0 0 1px var(--accent); }
.grid-card.drag-over { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 0 2px var(--accent); }

.grid-thumb {
  height: 118px; background: var(--bg-subtle); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;
}
.grid-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.grid-thumb .file-badge { width: 44px; height: 44px; border-radius: 10px; }
.grid-thumb .file-badge svg { width: 22px; height: 22px; }
.grid-ext-pill {
  position: absolute; bottom: 6px; right: 6px; padding: 2px 6px; border-radius: 4px;
  background: rgba(24, 24, 22, 0.72); color: #fff; font-family: var(--font-mono);
  font-size: 10px; font-weight: 600; text-transform: uppercase;
}
.grid-card-check {
  position: absolute; top: 8px; left: 8px; z-index: 2;
  background: var(--bg-surface); border-radius: 4px; padding: 2px; display: flex;
  box-shadow: var(--shadow-sm); opacity: 0; transition: opacity 0.12s;
}
.grid-card:hover .grid-card-check, .grid-card.selected .grid-card-check, body.select-mode .grid-card-check { opacity: 1; }
.grid-card-more {
  position: absolute; top: 6px; right: 6px; z-index: 2;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px;
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer; opacity: 0; transition: opacity 0.12s;
}
.grid-card:hover .grid-card-more, body.touch-device .grid-card-more { opacity: 1; }
.grid-card-meta { padding: 9px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.grid-card-name {
  font-size: 13px; font-weight: 500; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.grid-card-sub { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Empty State */
.empty-state {
  padding: 64px 20px; text-align: center; color: var(--text-muted);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-state svg { width: 38px; height: 38px; opacity: 0.5; }
.empty-state h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-secondary); }
.empty-state p { margin: 0; font-size: 13px; max-width: 340px; }

/* Full-Window Drag Drop Overlay */
.drop-overlay {
  position: fixed; inset: 0; z-index: 4200; background: rgba(29, 95, 214, 0.12);
  backdrop-filter: blur(2px); display: none; align-items: center; justify-content: center;
  padding: 24px; pointer-events: none;
}
.drop-overlay.show { display: flex; }
.drop-overlay-card {
  background: var(--bg-surface); border: 2px dashed var(--accent); border-radius: var(--radius-lg);
  padding: 36px 48px; text-align: center; box-shadow: var(--shadow-lg);
}
.drop-overlay-card h2 { margin: 10px 0 4px; font-size: 17px; letter-spacing: -0.02em; }
.drop-overlay-card p { margin: 0; font-size: 13px; color: var(--text-secondary); }

/* Upload Manager Floating Tray */
.upload-tray {
  position: fixed; bottom: 16px; right: 16px; z-index: 3600; width: 360px; max-width: calc(100vw - 24px);
  background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg); display: none; flex-direction: column; overflow: hidden;
}
.upload-tray.show { display: flex; }
.upload-tray-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--bg-subtle); border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600;
}
.upload-tray-list { max-height: 260px; overflow-y: auto; }
.upload-item {
  padding: 10px 14px; border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 6px;
}
.upload-item:last-child { border-bottom: none; }
.upload-item-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.upload-item-name { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.upload-item-status { font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); flex: none; }
.upload-item-status.err { color: var(--danger); }
.upload-item-status.done { color: var(--success); }
.upload-bar { height: 5px; background: var(--bg-hover); border-radius: 99px; overflow: hidden; }
.upload-bar-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.15s; }
.upload-bar-fill.done { background: var(--success); }
.upload-bar-fill.err { background: var(--danger); }
.upload-item-actions { display: flex; justify-content: flex-end; gap: 6px; }

/* Context Menu */
.ctx-menu {
  position: fixed; z-index: 3800; min-width: 196px; display: none;
  max-width: calc(100vw - 12px); max-height: calc(100dvh - 12px); overflow-y: auto;
  background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  box-shadow: var(--shadow-md); padding: 5px; user-select: none;
}
.ctx-menu.show { display: block; }
.ctx-item {
  display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 13px; color: var(--text); white-space: nowrap;
}
.ctx-item:hover, .ctx-item:focus { background: var(--bg-hover); outline: none; }
.ctx-item.primary { font-weight: 600; color: var(--accent); }
.ctx-item.danger { color: var(--danger); }
.ctx-item.danger:hover { background: var(--danger-soft); }
.ctx-item svg { width: 15px; height: 15px; stroke: currentColor; flex: none; }
.ctx-sep { height: 1px; background: var(--border); margin: 4px 6px; }

/* Modals */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15, 15, 13, 0.5);
  display: none; align-items: center; justify-content: center; z-index: 3200; padding: 16px;
}
.modal-backdrop.show { display: flex; }
.modal {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  width: 100%; max-width: 460px; max-height: 90dvh; display: flex; flex-direction: column;
  box-shadow: var(--shadow-lg); overflow: hidden; animation: modal-in 0.14s ease;
}
.modal.modal-lg { max-width: 660px; }
@keyframes modal-in { from { opacity: 0; transform: translateY(8px) scale(0.985); } to { opacity: 1; transform: none; } }
.modal-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px 18px; border-bottom: 1px solid var(--border); flex: none;
}
.modal-head h3 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.modal-body { padding: 16px 18px; overflow-y: auto; flex: 1; }
.modal-foot {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid var(--border); background: var(--bg-subtle); flex: none;
}

.field { margin-bottom: 12px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 5px; }
.input, .select {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--bg-surface); color: var(--text); font-size: 13px; outline: none;
}
.input:focus, .select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-hint { font-size: 11.5px; color: var(--text-muted); margin-top: 4px; }

.radio-card {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; margin-bottom: 8px;
}
.radio-card:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
.radio-card input { margin-top: 3px; accent-color: var(--accent); }
.radio-card-title { font-weight: 600; font-size: 13px; }
.radio-card-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.prop-list { display: flex; flex-direction: column; gap: 8px; }
.prop-row { display: flex; gap: 12px; font-size: 13px; border-bottom: 1px solid var(--border); padding-bottom: 7px; }
.prop-row:last-child { border-bottom: none; padding-bottom: 0; }
.prop-k { width: 110px; flex: none; color: var(--text-muted); font-weight: 500; }
.prop-v { flex: 1; word-break: break-word; font-weight: 500; }

/* Folder Picker List */
.folder-picker-list {
  border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 260px; overflow-y: auto;
}
.folder-pick-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: pointer;
  border-bottom: 1px solid var(--border); font-size: 13px; font-family: var(--font-mono);
}
.folder-pick-item:last-child { border-bottom: none; }
.folder-pick-item:hover { background: var(--bg-hover); }
.folder-pick-item.selected { background: var(--accent-soft); color: var(--accent); font-weight: 600; }

/* Share Links Manager Table */
.links-list { display: flex; flex-direction: column; gap: 8px; }
.link-card {
  border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px 12px;
  background: var(--bg-subtle); display: flex; flex-direction: column; gap: 8px;
}
.link-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.link-card-name { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-badges { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
.tag {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px;
  font-size: 11px; font-weight: 600; background: var(--bg-hover); color: var(--text-secondary);
  font-family: var(--font-mono);
}
.tag-accent { background: var(--accent-soft); color: var(--accent); }
.tag-success { background: var(--success-soft); color: var(--success); }
.tag-warn { background: var(--warning-soft); color: var(--warning); }
.link-card-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.link-code-input {
  flex: 1; min-width: 140px; font-family: var(--font-mono); font-size: 12px;
  padding: 5px 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg-surface);
}

/* Preview Modal */
.player-backdrop {
  position: fixed; inset: 0; background: rgba(12, 12, 10, 0.78);
  display: none; align-items: center; justify-content: center; z-index: 3500; padding: 20px;
}
.player-backdrop.show { display: flex; }
.player-window {
  width: 100%; max-width: 960px; max-height: 92dvh;
  background: #141413; border: 1px solid #2c2c29; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg); display: flex; flex-direction: column; overflow: hidden;
  color: #f0efe9; animation: modal-in 0.14s ease;
}
.player-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 14px; background: #1c1c1a; border-bottom: 1px solid #2d2d29; flex: none;
}
.player-title-wrap { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.player-title { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-meta { font-size: 11.5px; color: #9c9a92; font-family: var(--font-mono); }
.player-controls { display: flex; align-items: center; gap: 6px; flex: none; flex-wrap: wrap; }
.pbtn {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px;
  border-radius: 6px; border: 1px solid #353530; background: #242421; color: #ecebe5;
  font-size: 12px; font-weight: 500; cursor: pointer;
}
.pbtn:hover:not(:disabled) { background: #31312d; border-color: #4a4a44; }
.pbtn:disabled { opacity: 0.38; cursor: default; }
.pbtn-download { background: #1d7a4c; border-color: #258d59; color: #fff; font-weight: 600; }
.pbtn-download:hover:not(:disabled) { background: #23905a; }
.pbtn svg { width: 14px; height: 14px; stroke: currentColor; }

.player-content {
  flex: 1; min-height: 280px; max-height: calc(92dvh - 60px);
  background: #0d0d0c; display: flex; align-items: center; justify-content: center;
  overflow: auto; position: relative;
}
.player-video { width: 100%; max-height: calc(92dvh - 64px); outline: none; background: #000; display: block; }
.player-audio-card { padding: 36px 24px; text-align: center; width: 100%; max-width: 480px; }
.player-audio-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; word-break: break-word; }
.player-audio-element { width: 100%; outline: none; }
.player-image { max-width: 100%; max-height: calc(92dvh - 64px); object-fit: contain; cursor: zoom-in; }
.player-image.player-image-zoomed { max-width: none; max-height: none; cursor: zoom-out; }
.player-pdf { width: 100%; height: calc(92dvh - 64px); border: none; background: #fff; display: block; }
.player-text-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: #141413; }
.player-text-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
  padding: 8px 14px; background: #1c1c1a; border-bottom: 1px solid #2d2d29;
  color: #a8a69e; font-size: 12px; font-family: var(--font-mono); flex: none;
}
.player-text-bar-actions { display: flex; gap: 6px; }
.player-text {
  width: 100%; flex: 1; min-height: 0; padding: 16px; margin: 0; color: #e8e7e0; background: #141413;
  font-family: var(--font-mono); font-size: 12.5px; line-height: 1.55;
  white-space: pre-wrap; word-break: break-word; overflow: auto; text-align: left;
  user-select: text; -webkit-user-select: text;
}
.player-status-msg { padding: 28px 16px; text-align: center; color: #a8a69e; font-size: 13px; }
.player-media-err {
  padding: 24px; text-align: center; background: #1c1c1a; border: 1px solid #353530;
  border-radius: var(--radius-md); max-width: 420px; margin: 16px;
}
.player-media-err p { margin: 0 0 14px; color: #d6d5ce; font-size: 13px; line-height: 1.5; }
.player-generic { padding: 40px 24px; text-align: center; max-width: 420px; }
.player-generic-name { font-size: 16px; font-weight: 600; margin: 14px 0 6px; word-break: break-word; }
.player-generic-size { font-size: 13px; color: #9c9a92; margin-bottom: 20px; font-family: var(--font-mono); }
.player-generic-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

/* Inline Mobile PDF Canvas Viewer */
.pdf-viewer-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: #262624; color: #ecebe5; min-height: 260px; }
.pdf-viewer-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;
  padding: 8px 12px; background: #1c1c1a; border-bottom: 1px solid #31312d; flex: none;
}
.pdf-viewer-group { display: flex; align-items: center; gap: 5px; }
.pdf-ctrl-btn {
  background: #2b2b27; color: #ecebe5; border: 1px solid #3e3e39; border-radius: 5px;
  padding: 5px 10px; font-size: 12px; font-weight: 500; cursor: pointer; min-height: 30px;
}
.pdf-ctrl-btn:hover:not(:disabled) { background: #383833; }
.pdf-ctrl-btn:disabled { opacity: 0.4; cursor: default; }
.pdf-page-indicator { font-size: 12px; color: #b5b3aa; padding: 0 6px; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.pdf-viewer-pages {
  flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch;
  padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.pdf-page-slot {
  background: #fff; box-shadow: 0 3px 12px rgba(0,0,0,0.45); position: relative;
  display: flex; align-items: center; justify-content: center; flex: none; max-width: 100%;
}
.pdf-page-canvas { display: block; max-width: 100%; height: auto; }
.pdf-page-placeholder { color: #757570; font-size: 12px; padding: 28px 12px; }
.pdf-loading, .pdf-error { padding: 32px 16px; text-align: center; color: #b5b3aa; font-size: 13px; line-height: 1.5; }
.pdf-error-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

/* Toasts */
#toasts {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  z-index: 4600; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none;
}
.toast {
  background: #181816; color: #f5f4f0; padding: 9px 14px; border-radius: 8px; font-size: 13px;
  font-weight: 500; box-shadow: var(--shadow-md); pointer-events: auto;
  animation: toast-in 0.16s ease; max-width: calc(100vw - 32px);
}
[data-theme="dark"] .toast { background: #f0efe9; color: #161614; }
.toast.err { background: var(--danger); color: #fff; }
@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* Mobile Drawer Backdrop */
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(15, 15, 13, 0.45); z-index: 35; display: none;
}
.drawer-backdrop.show { display: block; }

/* Responsive Mobile Layout */
@media (max-width: 820px) {
  .sidebar {
    position: fixed; top: 0; bottom: 0; left: 0; width: 276px; max-width: 84vw;
    transform: translateX(-102%); transition: transform 0.2s ease; box-shadow: var(--shadow-lg);
  }
  .sidebar.open { transform: translateX(0); }
  .btn.mobile-menu-btn { display: inline-flex; }
  .hide-mobile { display: none !important; }
  .topbar { padding: 8px 10px; gap: 6px; }
  .search-box { padding: 5px 6px 5px 8px; }
  .search-box svg { display: none; }
  .subbar { padding: 7px 10px; }
  table.file-table thead th.col-date,
  tbody tr.item-row td.col-date { display: none; }
  table.file-table thead th.col-size { width: 82px; }
  tbody tr.item-row td { padding: 11px 8px; }
  .file-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 10px; }
  .grid-thumb { height: 104px; }
  .field-grid { grid-template-columns: 1fr; }
  .player-backdrop { padding: 0; }
  .player-window {
    max-width: 100%; max-height: 100%; height: 100%; height: 100dvh;
    border-radius: 0; border: none; padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .player-header { flex-wrap: wrap; padding: 10px 12px; }
  .player-controls { width: 100%; justify-content: flex-end; }
  .player-content { max-height: none; flex: 1; min-height: 0; }
  .player-video, .player-image { max-height: 100%; }
  .pbtn { padding: 7px 11px; min-height: 36px; }
  .pdf-ctrl-btn { padding: 6px 11px; min-height: 36px; }
  .upload-tray { left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); width: auto; }
}
`;

export const LOGIN_CSS = `${BASE_TOKENS}
body {
  min-height: 100vh; min-height: 100dvh;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.auth-card {
  width: 100%; max-width: 390px; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 28px 26px 24px; box-shadow: var(--shadow-md);
}
.auth-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.auth-logo {
  width: 38px; height: 38px; border-radius: 9px; background: var(--text); color: var(--bg-surface);
  display: grid; place-items: center; flex: none;
}
.auth-head h1 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
.auth-head p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-muted); }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--bg-surface); color: var(--text); font-size: 14px; outline: none;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.auth-err {
  margin: 0 0 14px; padding: 9px 11px; border-radius: var(--radius-sm);
  background: var(--danger-soft); color: var(--danger); font-size: 12.5px; font-weight: 500;
}
.btn-submit {
  width: 100%; padding: 10px 14px; border: none; border-radius: var(--radius-sm);
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-submit:hover { background: var(--accent-hover); }
.auth-foot {
  margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border);
  display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted);
  font-family: var(--font-mono);
}
`;

export const SHARE_CSS = `${BASE_TOKENS}
body {
  min-height: 100vh; min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 20px;
}
.share-shell {
  width: 100%; max-width: 900px; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md); overflow: hidden; display: flex; flex-direction: column;
}
.share-head {
  padding: 16px 20px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}
.share-title-group { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
.share-type-badge {
  width: 40px; height: 40px; border-radius: 10px; background: var(--bg-subtle);
  border: 1px solid var(--border); display: grid; place-items: center; flex: none; color: var(--accent);
}
.share-title-wrap { min-width: 0; flex: 1; }
.share-title-wrap h1 {
  margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.015em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.share-meta {
  margin-top: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);
}
.meta-pill {
  padding: 2px 7px; border-radius: 4px; background: var(--bg-subtle);
  border: 1px solid var(--border); color: var(--text-secondary); font-weight: 500;
}
.meta-pill.warn { background: var(--warning-soft); border-color: transparent; color: var(--warning); }
.meta-pill.apk { background: var(--success-soft); border-color: transparent; color: var(--success); }

.share-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sbtn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text); font-size: 13px; font-weight: 500;
  cursor: pointer; text-decoration: none; white-space: nowrap;
}
.sbtn:hover { background: var(--bg-hover); text-decoration: none; }
.sbtn-primary { background: var(--success); border-color: var(--success); color: #fff; font-weight: 600; }
.sbtn-primary:hover { background: var(--success-hover); color: #fff; }

.share-body { padding: 16px 20px; background: var(--bg-subtle); }
.share-video-box { background: #000; border-radius: var(--radius-md); overflow: hidden; display: flex; justify-content: center; }
.share-video-el { width: 100%; max-height: 66dvh; display: block; outline: none; }
.share-media-err { padding: 28px 18px; text-align: center; color: #d6d5ce; max-width: 420px; }
.share-media-err p { margin: 0 0 14px; font-size: 13px; line-height: 1.5; }
.share-audio-box {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 28px 20px; text-align: center;
}
.audio-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; word-break: break-word; }
.audio-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 18px; font-family: var(--font-mono); }
.share-audio-el { width: 100%; max-width: 520px; outline: none; }
.share-img-box {
  background: #141413; border-radius: var(--radius-md); padding: 10px;
  display: flex; justify-content: center; align-items: center; max-height: 70dvh; overflow: auto;
}
.share-img-el { max-width: 100%; max-height: 66dvh; object-fit: contain; border-radius: 4px; cursor: zoom-in; }
.share-img-el.share-img-zoomed { max-width: none; max-height: none; cursor: zoom-out; }
.share-pdf-box { border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; background: #262624; }
.share-pdf-mount { width: 100%; height: 66dvh; display: flex; flex-direction: column; }
.share-pdf-frame { width: 100%; height: 100%; border: none; display: block; background: #fff; }
.pdf-viewer-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: #262624; color: #ecebe5; }
.pdf-viewer-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;
  padding: 8px 12px; background: #1c1c1a; border-bottom: 1px solid #31312d; flex: none;
}
.pdf-viewer-group { display: flex; align-items: center; gap: 5px; }
.pdf-ctrl-btn {
  background: #2b2b27; color: #ecebe5; border: 1px solid #3e3e39; border-radius: 5px;
  padding: 5px 10px; font-size: 12px; cursor: pointer; min-height: 32px;
}
.pdf-ctrl-btn:disabled { opacity: 0.4; }
.pdf-page-indicator { font-size: 12px; color: #b5b3aa; padding: 0 6px; font-family: var(--font-mono); }
.pdf-viewer-pages {
  flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch;
  padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.pdf-page-slot { background: #fff; box-shadow: 0 3px 12px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; flex: none; max-width: 100%; }
.pdf-page-canvas { display: block; max-width: 100%; height: auto; }
.pdf-page-placeholder { color: #757570; font-size: 12px; padding: 28px 12px; }
.pdf-loading, .pdf-error { padding: 32px 16px; text-align: center; color: #b5b3aa; font-size: 13px; }
.pdf-error-actions { margin-top: 12px; display: flex; justify-content: center; }
.pdf-alt-bar {
  padding: 9px 14px; background: var(--bg-surface); border-top: 1px solid var(--border);
  text-align: center; font-size: 12px; color: var(--text-secondary);
}
.share-text-box {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  overflow: hidden; display: flex; flex-direction: column; max-height: 66dvh;
}
.text-head {
  padding: 8px 12px; background: var(--bg-subtle); border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 12.5px; font-weight: 600;
}
.text-loading { padding: 28px; text-align: center; color: var(--text-muted); }
.text-pre {
  margin: 0; padding: 14px; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.5;
  overflow: auto; user-select: text; -webkit-user-select: text; white-space: pre-wrap; word-break: break-word;
}
.share-file-box {
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 32px 20px; text-align: center;
}
.file-hero-name { font-size: 16px; font-weight: 600; margin: 10px 0 4px; word-break: break-word; }
.file-hero-meta { font-size: 12.5px; color: var(--text-muted); margin-bottom: 10px; font-family: var(--font-mono); }
.file-hero-desc { font-size: 13px; color: var(--text-secondary); max-width: 440px; margin: 0 auto 18px; }
.apk-tv-box {
  margin: 22px auto 0; max-width: 520px; text-align: left; padding: 16px;
  background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-md);
}
.apk-tv-header { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.apk-tv-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.apk-input-row { display: flex; gap: 8px; }
.apk-input {
  flex: 1; min-width: 0; padding: 7px 10px; font-family: var(--font-mono); font-size: 12px;
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-surface);
}
.apk-tv-qr-row {
  display: flex; gap: 14px; align-items: center; margin-top: 14px; padding-top: 12px;
  border-top: 1px solid var(--border);
}
.apk-qr-img { border: 1px solid var(--border); background: #fff; padding: 4px; border-radius: 6px; flex: none; }
.apk-qr-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

.share-foot {
  padding: 10px 20px; border-top: 1px solid var(--border); background: var(--bg-surface);
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
  font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);
}

@media (max-width: 640px) {
  body { padding: 8px; justify-content: flex-start; }
  .share-head { padding: 12px 14px; }
  .share-body { padding: 10px 12px; }
  .share-actions { width: 100%; }
  .sbtn-primary { flex: 1; }
  .share-pdf-mount { height: 64dvh; }
  .share-video-el { max-height: 55dvh; }
  .apk-tv-qr-row { flex-direction: column; text-align: center; }
}
`;
