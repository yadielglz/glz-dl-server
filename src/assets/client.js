import { PDF_PREVIEW_SCRIPT } from "./pdf-viewer.js";

export const APP_JS = `
${PDF_PREVIEW_SCRIPT}

(function() {
  const INIT = window.__GLZ_INIT__ || { prefix: '', folders: [], files: [], version: '1.48.3' };
  let PREFIX = INIT.prefix || '';
  let currentFolders = Array.isArray(INIT.folders) ? INIT.folders : [];
  let currentFiles = Array.isArray(INIT.files) ? INIT.files : [];
  let viewMode = localStorage.getItem('glz_view') === 'grid' ? 'grid' : 'list';
  let sortState = { col: 'name', asc: true };
  let currentFilterText = '';
  let globalSearchMode = false;
  let globalSearchResults = null;
  let filterDebounceTimer = null;
  let pendingCount = 0;

  let selectedSet = new Set();
  let lastClickedIdx = -1;
  let selectMode = false;
  let cutClipboard = [];

  let currentActiveKey = null;
  let activePlayerAbort = null;
  let activePdfViewer = null;

  const uploadJobs = [];
  let uploadIdCounter = 1;
  let uploadProcessing = false;
  const MULTIPART_THRESHOLD = 15 * 1024 * 1024;
  const MULTIPART_CHUNK = 10 * 1024 * 1024;

  // ---------------- Theme ----------------
  function initTheme() {
    const saved = localStorage.getItem('glz_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeBtn(theme);
  }
  function updateThemeBtn(theme) {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    btn.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    const label = btn.querySelector('.theme-label');
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme') || 'light';
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('glz_theme', next);
    updateThemeBtn(next);
  }
  initTheme();
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  }

  // ---------------- Helpers ----------------
  function escText(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return escText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function humanSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }
  function humanDate(iso) {
    if (!iso) return '\\u2014';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function encodeKeyPath(key) {
    return String(key).split('/').map(encodeURIComponent).join('/');
  }
  function getExt(name) {
    const m = /\\.([a-z0-9]+)$/i.exec(String(name || '').toLowerCase());
    return m ? m[1] : '';
  }
  function getFileCategory(name) {
    const ext = getExt(name);
    if (!ext) return 'binary';
    if (['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv', 'wmv', 'flv', 'ts', '3gp'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'oga', 'flac', 'aac', 'm4a', 'opus', 'weba', 'mid', 'midi'].includes(ext)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tif', 'tiff'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'log', 'json', 'md', 'csv', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'tsx', 'jsx', 'yaml', 'yml', 'sh', 'bash', 'py', 'ini', 'conf', 'cfg', 'toml', 'sql', 'env', 'c', 'cpp', 'h', 'java', 'go', 'rs', 'rb', 'php'].includes(ext)) return 'text';
    return 'binary';
  }
  function getIconKind(name) {
    const ext = getExt(name);
    if (ext === 'apk') return 'apk';
    if (ext === 'pdf') return 'pdf';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
    if (['iso', 'img', 'bin', 'dmg'].includes(ext)) return 'iso';
    const cat = getFileCategory(name);
    if (cat === 'image') return 'img';
    if (cat === 'video') return 'video';
    if (cat === 'audio') return 'audio';
    if (cat === 'text') return 'doc';
    return 'file';
  }

  const ICONS = {
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 20"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
    apk: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="14" height="10" rx="2"/><path d="M8 9a4 4 0 0 1 8 0"/><line x1="9" y1="5" x2="7.5" y2="3"/><line x1="15" y1="5" x2="16.5" y2="3"/></svg>',
    zip: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M3 8l2-5h14l2 5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    iso: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>'
  };

  function setLoading(on) {
    pendingCount = Math.max(0, pendingCount + (on ? 1 : -1));
    const loader = document.getElementById('topLoader');
    if (loader) loader.classList.toggle('show', pendingCount > 0);
  }
  async function withLoading(promise) {
    setLoading(true);
    try { return await promise; } finally { setLoading(false); }
  }
  function showToast(msg, isErr) {
    const wrap = document.getElementById('toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s';
      setTimeout(() => el.remove(), 220);
    }, 2800);
  }
  async function readError(res) {
    const txt = await res.text().catch(() => '');
    return txt || ('Server returned ' + res.status);
  }
  function copyText(text, msg) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(msg || 'Copied to clipboard'))
      .catch(() => showToast('Could not copy to clipboard', true));
  }

  // ---------------- Sidebar / Mobile Drawer & Favorites ----------------
  function toggleDrawer(force) {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('drawerBackdrop');
    if (!sb || !bd) return;
    const open = typeof force === 'boolean' ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    bd.classList.toggle('show', open);
  }
  function renderFavorites() {
    const wrap = document.getElementById('favoritesList');
    if (!wrap) return;
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('glz_favs') || '[]'); } catch (_) {}
    if (!favs.length) {
      wrap.innerHTML = '<div style="padding:4px 10px;font-size:12px;color:var(--text-muted)">No pinned folders yet</div>';
      return;
    }
    wrap.innerHTML = '';
    favs.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn' + (PREFIX === f.prefix ? ' active' : '');
      btn.innerHTML = ICONS.folder + '<span class="truncate">' + escText(f.name) + '</span><span class="fav-rm" title="Unpin">\\u2715</span>';
      btn.onclick = (e) => {
        if (e.target.classList.contains('fav-rm')) {
          e.stopPropagation();
          favs.splice(idx, 1);
          localStorage.setItem('glz_favs', JSON.stringify(favs));
          renderFavorites();
          return;
        }
        toggleDrawer(false);
        navigateTo(f.prefix);
      };
      wrap.appendChild(btn);
    });
  }
  function pinCurrentFolder() {
    const name = PREFIX ? PREFIX.replace(/\\/$/, '').split('/').pop() : 'Root';
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('glz_favs') || '[]'); } catch (_) {}
    if (favs.some((f) => f.prefix === PREFIX)) {
      showToast('Folder is already pinned.');
      return;
    }
    favs.push({ name, prefix: PREFIX });
    localStorage.setItem('glz_favs', JSON.stringify(favs));
    renderFavorites();
    showToast('Pinned "' + name + '" to sidebar.');
  }

  // ---------------- SPA Folder Navigation ----------------
  async function navigateTo(nextPrefix, { push = true } = {}) {
    const clean = nextPrefix && !nextPrefix.endsWith('/') ? nextPrefix + '/' : (nextPrefix || '');
    const container = document.getElementById('listContainer');
    if (container) container.classList.add('loading');
    try {
      const res = await withLoading(fetch('/api/list?prefix=' + encodeURIComponent(clean), { credentials: 'same-origin' }));
      if (res.status === 401 || res.redirected && res.url.includes('/login')) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      PREFIX = data.prefix || clean;
      currentFolders = data.folders || [];
      currentFiles = data.files || [];
      selectedSet.clear();
      lastClickedIdx = -1;
      globalSearchResults = null;
      if (globalSearchMode) {
        currentFilterText = '';
        const inp = document.getElementById('filterInput');
        if (inp) inp.value = '';
        const clr = document.getElementById('filterClear');
        if (clr) clr.classList.remove('show');
      }
      if (push) {
        const nextUrl = PREFIX ? '/?prefix=' + encodeURIComponent(PREFIX) : '/';
        history.pushState({ prefix: PREFIX }, '', nextUrl);
      }
      renderBreadcrumbs();
      updateSidebarActive();
      renderView();
      updateSelectionBar();
      updateStorageSummary();
      renderFavorites();
    } catch (err) {
      showToast('Failed to open folder: ' + err.message, true);
    } finally {
      if (container) container.classList.remove('loading');
    }
  }

  function goUp() {
    const trimmed = PREFIX.endsWith('/') ? PREFIX.slice(0, -1) : PREFIX;
    if (!trimmed) return;
    const idx = trimmed.lastIndexOf('/');
    const parent = idx === -1 ? '' : trimmed.slice(0, idx + 1);
    navigateTo(parent);
  }

  window.addEventListener('popstate', (e) => {
    const p = (e.state && typeof e.state.prefix === 'string')
      ? e.state.prefix
      : (new URLSearchParams(window.location.search).get('prefix') || '');
    navigateTo(p, { push: false });
  });

  async function refreshList(silent) {
    if (globalSearchMode && currentFilterText) {
      await runGlobalSearch(currentFilterText);
      if (!silent) showToast('Search refreshed.');
      return;
    }
    await navigateTo(PREFIX, { push: false });
    if (!silent) showToast('Refreshed.');
  }

  function updateSidebarActive() {
    const rootBtn = document.getElementById('navRoot');
    if (rootBtn) rootBtn.classList.toggle('active', !PREFIX);
    const upBtn = document.getElementById('btnUp');
    if (upBtn) upBtn.disabled = !PREFIX;
    const folderLabel = PREFIX ? PREFIX.replace(/\\/$/, '').split('/').pop() : 'All Files';
    document.title = folderLabel + ' \\u2014 Glz Serve';
  }

  function renderBreadcrumbs() {
    const el = document.getElementById('breadcrumbs');
    if (!el) return;
    const parts = PREFIX ? PREFIX.replace(/\\/$/, '').split('/') : [];
    el.innerHTML = '';

    const makeCrumb = (label, targetPrefix, isCurrent) => {
      const a = document.createElement('a');
      a.className = 'crumb' + (isCurrent ? ' current' : '');
      a.href = targetPrefix ? '/?prefix=' + encodeURIComponent(targetPrefix) : '/';
      a.textContent = label;
      a.dataset.dropPrefix = targetPrefix;
      a.onclick = (e) => {
        e.preventDefault();
        if (!isCurrent || globalSearchResults) navigateTo(targetPrefix);
      };
      bindDropTarget(a, targetPrefix);
      return a;
    };

    el.appendChild(makeCrumb('All Files', '', parts.length === 0));
    let acc = '';
    parts.forEach((p, idx) => {
      acc += p + '/';
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '/';
      el.appendChild(sep);
      el.appendChild(makeCrumb(p, acc, idx === parts.length - 1));
    });
  }

  function updateStorageSummary() {
    const el = document.getElementById('storageSummary');
    if (!el) return;
    const total = currentFiles.reduce((s, f) => s + (f.size || 0), 0);
    const fCount = currentFolders.length;
    const fileCount = currentFiles.length;
    const parts = [];
    if (fCount) parts.push(fCount + ' folder' + (fCount === 1 ? '' : 's'));
    parts.push(fileCount + ' file' + (fileCount === 1 ? '' : 's'));
    if (total) parts.push(humanSize(total));
    el.textContent = parts.join(' \\u00B7 ');
  }

  // ---------------- Filtering, Global Search & Sorting ----------------
  function getDisplayedEntries() {
    let folders = globalSearchResults ? globalSearchResults.folders.slice() : currentFolders.slice();
    let files = globalSearchResults ? globalSearchResults.files.slice() : currentFiles.slice();

    if (!globalSearchMode && currentFilterText) {
      folders = folders.filter((f) => {
        const name = f.slice(PREFIX.length).replace(/\\/$/, '');
        return name.toLowerCase().includes(currentFilterText);
      });
      files = files.filter((f) => {
        const name = f.key.slice(PREFIX.length);
        return name.toLowerCase().includes(currentFilterText);
      });
    }

    const factor = sortState.asc ? 1 : -1;
    folders.sort((a, b) => a.localeCompare(b) * factor);
    files.sort((a, b) => {
      if (sortState.col === 'size') return ((a.size || 0) - (b.size || 0)) * factor;
      if (sortState.col === 'date') {
        const da = a.uploaded ? new Date(a.uploaded).getTime() : 0;
        const db = b.uploaded ? new Date(b.uploaded).getTime() : 0;
        return (da - db) * factor;
      }
      return a.key.localeCompare(b.key) * factor;
    });

    const entries = [];
    folders.forEach((path) => {
      const trimmed = path.replace(/\\/$/, '');
      const name = globalSearchResults ? trimmed.split('/').pop() : path.slice(PREFIX.length).replace(/\\/$/, '');
      const parent = globalSearchResults ? trimmed.slice(0, Math.max(0, trimmed.lastIndexOf('/') + 1)) : '';
      entries.push({ id: 'folder:' + path, type: 'folder', path, name, parent, size: 0, uploaded: '' });
    });
    files.forEach((f) => {
      const name = globalSearchResults ? f.key.split('/').pop() : f.key.slice(PREFIX.length);
      const parent = globalSearchResults ? f.key.slice(0, Math.max(0, f.key.lastIndexOf('/') + 1)) : '';
      entries.push({ id: 'file:' + f.key, type: 'file', key: f.key, name, parent, size: f.size || 0, uploaded: f.uploaded || '' });
    });
    return entries;
  }

  async function runGlobalSearch(q) {
    if (!q) {
      globalSearchResults = null;
      renderView();
      return;
    }
    try {
      const res = await withLoading(fetch('/api/search?q=' + encodeURIComponent(q), { credentials: 'same-origin' }));
      if (!res.ok) throw new Error(await readError(res));
      globalSearchResults = await res.json();
      selectedSet.clear();
      updateSelectionBar();
      renderView();
    } catch (err) {
      showToast('Search failed: ' + err.message, true);
    }
  }

  function onFilterInput(val) {
    currentFilterText = val.toLowerCase().trim();
    const clr = document.getElementById('filterClear');
    if (clr) clr.classList.toggle('show', !!currentFilterText);
    clearTimeout(filterDebounceTimer);
    if (globalSearchMode) {
      filterDebounceTimer = setTimeout(() => runGlobalSearch(currentFilterText), 240);
    } else {
      globalSearchResults = null;
      filterDebounceTimer = setTimeout(renderView, 80);
    }
  }

  function toggleGlobalSearch() {
    globalSearchMode = !globalSearchMode;
    const btn = document.getElementById('btnGlobalSearch');
    if (btn) {
      btn.classList.toggle('active', globalSearchMode);
      btn.textContent = globalSearchMode ? 'All folders' : 'This folder';
    }
    const inp = document.getElementById('filterInput');
    if (inp) inp.placeholder = globalSearchMode ? 'Search entire storage...' : 'Filter this folder...';
    if (globalSearchMode && currentFilterText) {
      runGlobalSearch(currentFilterText);
    } else {
      globalSearchResults = null;
      renderView();
    }
  }

  function clearFilter() {
    const inp = document.getElementById('filterInput');
    if (inp) { inp.value = ''; inp.focus(); }
    currentFilterText = '';
    globalSearchResults = null;
    const clr = document.getElementById('filterClear');
    if (clr) clr.classList.remove('show');
    renderView();
  }

  function toggleSort(col) {
    if (sortState.col === col) sortState.asc = !sortState.asc;
    else { sortState.col = col; sortState.asc = true; }
    renderView();
  }

  // ---------------- View Mode (List / Grid) & Rendering ----------------
  function setViewMode(mode) {
    viewMode = mode === 'grid' ? 'grid' : 'list';
    localStorage.setItem('glz_view', viewMode);
    const bl = document.getElementById('btnViewList');
    const bg = document.getElementById('btnViewGrid');
    if (bl) bl.classList.toggle('active', viewMode === 'list');
    if (bg) bg.classList.toggle('active', viewMode === 'grid');
    renderView();
  }

  function renderView() {
    const container = document.getElementById('listContainer');
    if (!container) return;
    const entries = getDisplayedEntries();

    if (!entries.length) {
      const msg = currentFilterText
        ? 'No items matched "' + escText(currentFilterText) + '".'
        : 'This folder is empty. Drop files anywhere or click Upload to add files.';
      container.innerHTML =
        '<div class="empty-state">' +
          ICONS.folder +
          '<h3>' + (currentFilterText ? 'No matches found' : 'Empty folder') + '</h3>' +
          '<p>' + msg + '</p>' +
        '</div>';
      updateSelectAllCheckbox(entries);
      return;
    }

    if (viewMode === 'grid') {
      const cards = entries.map((item, idx) => {
        const isSel = selectedSet.has(item.id);
        const kind = item.type === 'folder' ? 'folder' : getIconKind(item.name);
        const cat = item.type === 'file' ? getFileCategory(item.name) : 'folder';
        const ext = item.type === 'file' ? getExt(item.name) : '';
        const thumbHtml = (item.type === 'file' && cat === 'image')
          ? '<img loading="lazy" decoding="async" src="/stream/' + encodeKeyPath(item.key) + '" alt="' + escAttr(item.name) + '" />'
          : '<div class="file-badge kind-' + kind + '">' + (ICONS[kind] || ICONS.file) + '</div>' + (ext ? '<span class="grid-ext-pill">' + escText(ext) + '</span>' : '');
        const sub = item.parent ? item.parent : (item.type === 'folder' ? 'Folder' : humanSize(item.size));
        return (
          '<div class="grid-card' + (isSel ? ' selected' : '') + '" draggable="true" data-idx="' + idx + '" data-id="' + escAttr(item.id) + '" data-type="' + item.type + '"' +
            (item.type === 'folder' ? ' data-path="' + escAttr(item.path) + '"' : ' data-key="' + escAttr(item.key) + '" data-size="' + item.size + '" data-uploaded="' + escAttr(item.uploaded) + '"') + '>' +
            '<label class="grid-card-check" onclick="event.stopPropagation()"><input type="checkbox" class="item-chk"' + (isSel ? ' checked' : '') + '></label>' +
            '<button type="button" class="grid-card-more" title="Actions" aria-label="Actions">' + ICONS.more + '</button>' +
            '<div class="grid-thumb">' + thumbHtml + '</div>' +
            '<div class="grid-card-meta">' +
              '<div class="grid-card-name" title="' + escAttr(item.name) + '">' + escText(item.name) + '</div>' +
              '<div class="grid-card-sub">' + escText(sub) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
      container.innerHTML = '<div class="file-grid" id="fileGrid">' + cards + '</div>';
      attachDragHandlers();
      return;
    }

    const arrow = (col) => sortState.col === col ? '<span class="sort-arrow">' + (sortState.asc ? '\\u25B2' : '\\u25BC') + '</span>' : '';
    const allChecked = entries.length > 0 && entries.every((e) => selectedSet.has(e.id));
    const rows = entries.map((item, idx) => {
      const isSel = selectedSet.has(item.id);
      const kind = item.type === 'folder' ? 'folder' : getIconKind(item.name);
      return (
        '<tr class="item-row' + (isSel ? ' selected' : '') + '" draggable="true" data-idx="' + idx + '" data-id="' + escAttr(item.id) + '" data-type="' + item.type + '"' +
          (item.type === 'folder' ? ' data-path="' + escAttr(item.path) + '"' : ' data-key="' + escAttr(item.key) + '" data-size="' + item.size + '" data-uploaded="' + escAttr(item.uploaded) + '"') + '>' +
          '<td class="col-check"><input type="checkbox" class="item-chk"' + (isSel ? ' checked' : '') + ' aria-label="Select ' + escAttr(item.name) + '"></td>' +
          '<td class="col-name"><div class="name-cell"><span class="file-badge kind-' + kind + '">' + (ICONS[kind] || ICONS.file) + '</span>' +
            '<div class="name-text-wrap"><span class="name-main" title="' + escAttr(item.name) + '">' + escText(item.name) + '</span>' +
            (item.parent ? '<span class="name-sub">' + escText(item.parent) + '</span>' : '') +
            '</div></div></td>' +
          '<td class="col-size">' + (item.type === 'folder' ? '\\u2014' : humanSize(item.size)) + '</td>' +
          '<td class="col-date">' + (item.type === 'folder' ? '\\u2014' : humanDate(item.uploaded)) + '</td>' +
          '<td class="col-act"><button type="button" class="row-more-btn" title="Actions" aria-label="Actions">' + ICONS.more + '</button></td>' +
        '</tr>'
      );
    }).join('');

    container.innerHTML =
      '<table class="file-table" id="fileTable">' +
        '<thead><tr>' +
          '<th class="col-check"><input type="checkbox" id="chkSelectAll" class="item-chk"' + (allChecked ? ' checked' : '') + ' aria-label="Select all"></th>' +
          '<th data-sort="name">Name' + arrow('name') + '</th>' +
          '<th class="col-size" data-sort="size">Size' + arrow('size') + '</th>' +
          '<th class="col-date" data-sort="date">Modified' + arrow('date') + '</th>' +
          '<th class="col-act"></th>' +
        '</tr></thead>' +
        '<tbody id="fileTableBody">' + rows + '</tbody>' +
      '</table>';

    attachDragHandlers();
  }

  function updateSelectAllCheckbox(entries) {
    const chk = document.getElementById('chkSelectAll');
    if (!chk) return;
    const list = entries || getDisplayedEntries();
    chk.checked = list.length > 0 && list.every((e) => selectedSet.has(e.id));
    chk.indeterminate = !chk.checked && selectedSet.size > 0;
  }

  // ---------------- Real Multi-Select ----------------
  function getSelectedItemObjects() {
    const items = [];
    selectedSet.forEach((id) => {
      if (id.startsWith('folder:')) items.push({ type: 'folder', path: id.slice(7) });
      else if (id.startsWith('file:')) items.push({ type: 'file', key: id.slice(5) });
    });
    return items;
  }

  function syncSelectionClasses() {
    document.querySelectorAll('[data-id]').forEach((el) => {
      const sel = selectedSet.has(el.dataset.id);
      el.classList.toggle('selected', sel);
      const chk = el.querySelector('.item-chk');
      if (chk) chk.checked = sel;
    });
    updateSelectAllCheckbox();
    updateSelectionBar();
  }

  function updateSelectionBar() {
    const bar = document.getElementById('bulkBar');
    const countEl = document.getElementById('bulkCount');
    if (!bar || !countEl) return;
    const n = selectedSet.size;
    bar.classList.toggle('show', n > 0);
    countEl.textContent = n + ' item' + (n === 1 ? '' : 's') + ' selected';
    if (n === 0 && selectMode) {
      selectMode = false;
      document.body.classList.remove('select-mode');
      const sb = document.getElementById('btnSelectMode');
      if (sb) sb.classList.remove('btn-primary');
    }
  }

  function toggleSelectMode() {
    selectMode = !selectMode;
    document.body.classList.toggle('select-mode', selectMode);
    const sb = document.getElementById('btnSelectMode');
    if (sb) sb.classList.toggle('btn-primary', selectMode);
    if (!selectMode && selectedSet.size > 0) {
      selectedSet.clear();
      syncSelectionClasses();
    }
  }

  function selectAllVisible(forceState) {
    const entries = getDisplayedEntries();
    const shouldSelect = typeof forceState === 'boolean' ? forceState : selectedSet.size < entries.length;
    selectedSet.clear();
    if (shouldSelect) entries.forEach((e) => selectedSet.add(e.id));
    syncSelectionClasses();
  }

  function handleRowSelect(el, idx, { toggle = false, range = false } = {}) {
    const entries = getDisplayedEntries();
    const id = el.dataset.id;
    if (range && lastClickedIdx >= 0 && lastClickedIdx < entries.length) {
      const [start, end] = lastClickedIdx < idx ? [lastClickedIdx, idx] : [idx, lastClickedIdx];
      for (let i = start; i <= end; i++) selectedSet.add(entries[i].id);
    } else if (toggle) {
      if (selectedSet.has(id)) selectedSet.delete(id);
      else selectedSet.add(id);
      lastClickedIdx = idx;
    } else {
      selectedSet.clear();
      selectedSet.add(id);
      lastClickedIdx = idx;
    }
    syncSelectionClasses();
  }

  function onFileActivate(key, isTouch) {
    const name = key.split('/').pop();
    const cat = getFileCategory(name);
    if (isTouch || ['video', 'audio', 'image', 'pdf', 'text'].includes(cat)) {
      openPlayer(key);
    } else {
      downloadFile(key);
    }
  }

  // ---------------- Drag-to-Folder & Full-Window Upload Drop ----------------
  let isInternalDrag = false;

  function attachDragHandlers() {
    document.querySelectorAll('[data-id][draggable="true"]').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        isInternalDrag = true;
        const id = el.dataset.id;
        if (!selectedSet.has(id)) {
          selectedSet.clear();
          selectedSet.add(id);
          syncSelectionClasses();
        }
        const items = getSelectedItemObjects();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-glz-items', JSON.stringify(items));
      });
      el.addEventListener('dragend', () => {
        isInternalDrag = false;
        document.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
      });
      if (el.dataset.type === 'folder') {
        bindDropTarget(el, el.dataset.path);
      }
    });
  }

  function bindDropTarget(el, targetPrefix) {
    el.addEventListener('dragover', (e) => {
      if (!isInternalDrag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', async (e) => {
      if (!isInternalDrag) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag-over');
      isInternalDrag = false;
      const raw = e.dataTransfer.getData('application/x-glz-items');
      if (!raw) return;
      try {
        const items = JSON.parse(raw);
        await performMove(items, targetPrefix);
      } catch (_) {}
    });
  }

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (isInternalDrag) return;
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      dragDepth++;
      const ov = document.getElementById('dropOverlay');
      if (ov) ov.classList.add('show');
    }
  });
  window.addEventListener('dragover', (e) => {
    if (isInternalDrag) return;
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
    }
  });
  window.addEventListener('dragleave', (e) => {
    if (isInternalDrag) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      const ov = document.getElementById('dropOverlay');
      if (ov) ov.classList.remove('show');
    }
  });
  window.addEventListener('drop', (e) => {
    if (isInternalDrag) return;
    dragDepth = 0;
    const ov = document.getElementById('dropOverlay');
    if (ov) ov.classList.remove('show');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      enqueueUploads(e.dataTransfer.files);
    }
  });

  // ---------------- Event Delegation & Touch Gestures ----------------
  const listContainer = document.getElementById('listContainer');
  let touchTimer = null;
  let touchStartPos = { x: 0, y: 0 };
  let touchTargetEl = null;
  let touchHeld = false;
  let suppressTouchClickUntil = 0;

  function cancelTouch() {
    clearTimeout(touchTimer);
    touchTimer = null;
    touchTargetEl = null;
  }

  listContainer.addEventListener('click', (e) => {
    if (Date.now() < suppressTouchClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const selAll = e.target.closest('#chkSelectAll');
    if (selAll) {
      selectAllVisible(selAll.checked);
      return;
    }
    const th = e.target.closest('thead th[data-sort]');
    if (th) {
      toggleSort(th.dataset.sort);
      return;
    }
    const moreBtn = e.target.closest('.row-more-btn, .grid-card-more');
    if (moreBtn) {
      e.stopPropagation();
      const itemEl = moreBtn.closest('[data-id]');
      if (!itemEl) return;
      if (!selectedSet.has(itemEl.dataset.id)) {
        selectedSet.clear();
        selectedSet.add(itemEl.dataset.id);
        syncSelectionClasses();
      }
      const rect = moreBtn.getBoundingClientRect();
      openCtxMenu(
        { clientX: rect.right, clientY: rect.bottom + 4, preventDefault() {}, stopPropagation() {} },
        itemEl.dataset.type,
        itemEl.dataset.type === 'folder' ? itemEl.dataset.path : itemEl.dataset.key
      );
      return;
    }
    const chk = e.target.closest('.item-chk');
    const itemEl = e.target.closest('[data-id]');
    if (!itemEl) return;
    const idx = Number(itemEl.dataset.idx);
    if (chk || selectMode) {
      handleRowSelect(itemEl, idx, { toggle: true, range: e.shiftKey });
      return;
    }
    handleRowSelect(itemEl, idx, { toggle: e.ctrlKey || e.metaKey, range: e.shiftKey });
  });

  listContainer.addEventListener('dblclick', (e) => {
    if (Date.now() < suppressTouchClickUntil) return;
    if (e.target.closest('.item-chk, .row-more-btn, .grid-card-more')) return;
    const itemEl = e.target.closest('[data-id]');
    if (!itemEl) return;
    if (itemEl.dataset.type === 'folder') navigateTo(itemEl.dataset.path);
    else onFileActivate(itemEl.dataset.key, false);
  });

  listContainer.addEventListener('contextmenu', (e) => {
    cancelTouch();
    const itemEl = e.target.closest('[data-id]');
    if (itemEl) {
      if (!selectedSet.has(itemEl.dataset.id)) {
        selectedSet.clear();
        selectedSet.add(itemEl.dataset.id);
        syncSelectionClasses();
      }
      openCtxMenu(e, itemEl.dataset.type, itemEl.dataset.type === 'folder' ? itemEl.dataset.path : itemEl.dataset.key);
    } else {
      openCtxMenu(e, 'main');
    }
  });

  listContainer.addEventListener('touchstart', (e) => {
    cancelTouch();
    if (e.touches.length !== 1) return;
    if (e.target.closest('.item-chk, .row-more-btn, .grid-card-more, thead')) return;
    const itemEl = e.target.closest('[data-id]');
    if (!itemEl) return;
    const touch = e.touches[0];
    closeCtxMenu();
    touchTargetEl = itemEl;
    touchHeld = false;
    suppressTouchClickUntil = Date.now() + 1200;
    touchStartPos = { x: touch.clientX, y: touch.clientY };

    touchTimer = setTimeout(() => {
      touchHeld = true;
      suppressTouchClickUntil = Date.now() + 1200;
      if (!selectedSet.has(itemEl.dataset.id)) {
        selectedSet.clear();
        selectedSet.add(itemEl.dataset.id);
        syncSelectionClasses();
      }
      openCtxMenu(
        { clientX: touch.clientX, clientY: touch.clientY, preventDefault() {}, stopPropagation() {} },
        itemEl.dataset.type,
        itemEl.dataset.type === 'folder' ? itemEl.dataset.path : itemEl.dataset.key
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
    const itemEl = touchTargetEl;
    const held = touchHeld;
    cancelTouch();
    touchHeld = false;
    if (itemEl || held) e.preventDefault();
    if (!itemEl) return;
    suppressTouchClickUntil = Date.now() + 800;
    if (held) return;
    if (selectMode) {
      handleRowSelect(itemEl, Number(itemEl.dataset.idx), { toggle: true });
      return;
    }
    if (itemEl.dataset.type === 'folder') navigateTo(itemEl.dataset.path);
    else onFileActivate(itemEl.dataset.key, true);
  }, { passive: false });
  listContainer.addEventListener('touchcancel', () => { cancelTouch(); touchHeld = false; });

  // ---------------- Upgraded Upload Manager (Multipart + Cancel + Retry) ----------------
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) enqueueUploads(e.target.files);
    e.target.value = '';
  });

  function enqueueUploads(fileList) {
    Array.from(fileList).forEach((file) => {
      uploadJobs.push({
        id: uploadIdCounter++,
        file,
        name: file.name,
        targetPrefix: PREFIX,
        progress: 0,
        status: 'queued',
        error: '',
        xhr: null,
        aborted: false,
        multipartUploadId: null
      });
    });
    renderUploadTray();
    processUploadQueue();
  }

  function renderUploadTray() {
    const tray = document.getElementById('uploadTray');
    const list = document.getElementById('uploadTrayList');
    const title = document.getElementById('uploadTrayTitle');
    if (!tray || !list) return;
    if (!uploadJobs.length) {
      tray.classList.remove('show');
      return;
    }
    tray.classList.add('show');
    const active = uploadJobs.filter((j) => j.status === 'uploading' || j.status === 'queued').length;
    const done = uploadJobs.filter((j) => j.status === 'done').length;
    if (title) {
      title.textContent = active > 0
        ? 'Uploading ' + active + ' file' + (active === 1 ? '' : 's') + '...'
        : 'Uploads (' + done + '/' + uploadJobs.length + ' complete)';
    }

    list.innerHTML = '';
    uploadJobs.slice().reverse().forEach((job) => {
      const row = document.createElement('div');
      row.className = 'upload-item';
      const statusText = job.status === 'done'
        ? 'Done'
        : job.status === 'error'
          ? (job.error || 'Failed')
          : job.status === 'canceled'
            ? 'Canceled'
            : job.status === 'queued'
              ? 'Queued'
              : Math.round(job.progress * 100) + '%';
      const statusCls = job.status === 'done' ? ' done' : (job.status === 'error' ? ' err' : '');
      row.innerHTML =
        '<div class="upload-item-top">' +
          '<span class="upload-item-name" title="' + escAttr(job.name) + '">' + escText(job.name) + '</span>' +
          '<span class="upload-item-status' + statusCls + '">' + escText(statusText) + '</span>' +
        '</div>' +
        '<div class="upload-bar"><div class="upload-bar-fill' + statusCls + '" style="width:' + Math.round(job.progress * 100) + '%"></div></div>';

      if (job.status === 'uploading' || job.status === 'queued' || job.status === 'error' || job.status === 'canceled') {
        const acts = document.createElement('div');
        acts.className = 'upload-item-actions';
        if (job.status === 'uploading' || job.status === 'queued') {
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn-sm btn-ghost';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.onclick = () => cancelUploadJob(job.id);
          acts.appendChild(cancelBtn);
        } else {
          const retryBtn = document.createElement('button');
          retryBtn.type = 'button';
          retryBtn.className = 'btn btn-sm';
          retryBtn.textContent = 'Retry';
          retryBtn.onclick = () => {
            job.status = 'queued';
            job.error = '';
            job.aborted = false;
            job.progress = 0;
            renderUploadTray();
            processUploadQueue();
          };
          acts.appendChild(retryBtn);
        }
        row.appendChild(acts);
      }
      list.appendChild(row);
    });
  }

  async function cancelUploadJob(id) {
    const job = uploadJobs.find((j) => j.id === id);
    if (!job) return;
    job.aborted = true;
    job.status = 'canceled';
    if (job.xhr) { try { job.xhr.abort(); } catch (_) {} job.xhr = null; }
    if (job.multipartUploadId) {
      const uid = job.multipartUploadId;
      job.multipartUploadId = null;
      fetch('/api/multipart/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: job.targetPrefix + job.name, uploadId: uid })
      }).catch(() => {});
    }
    renderUploadTray();
  }

  function clearCompletedUploads() {
    for (let i = uploadJobs.length - 1; i >= 0; i--) {
      if (uploadJobs[i].status !== 'uploading' && uploadJobs[i].status !== 'queued') {
        uploadJobs.splice(i, 1);
      }
    }
    renderUploadTray();
  }

  function xhrPut(url, body, contentType, job, onProg) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      job.xhr = xhr;
      xhr.open('PUT', url);
      if (contentType) xhr.setRequestHeader('Content-Type', contentType);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProg(e.loaded / e.total); };
      xhr.onload = () => {
        job.xhr = null;
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
        else reject(new Error('HTTP ' + xhr.status));
      };
      xhr.onerror = () => { job.xhr = null; reject(new Error('Network error')); };
      xhr.onabort = () => { job.xhr = null; reject(new Error('Canceled')); };
      xhr.send(body);
    });
  }

  async function uploadSingleFile(job) {
    const key = job.targetPrefix + job.name;
    const contentType = job.file.type || 'application/octet-stream';

    if (job.file.size >= MULTIPART_THRESHOLD) {
      const createRes = await fetch('/api/multipart/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType })
      });
      if (!createRes.ok) throw new Error(await readError(createRes));
      const { uploadId } = await createRes.json();
      job.multipartUploadId = uploadId;

      const totalParts = Math.ceil(job.file.size / MULTIPART_CHUNK);
      const uploadedParts = [];
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (job.aborted) throw new Error('Canceled');
        const start = (partNumber - 1) * MULTIPART_CHUNK;
        const end = Math.min(job.file.size, start + MULTIPART_CHUNK);
        const chunk = job.file.slice(start, end);

        let partResult = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (job.aborted) throw new Error('Canceled');
          try {
            const url = '/api/multipart/part?key=' + encodeURIComponent(key) + '&uploadId=' + encodeURIComponent(uploadId) + '&partNumber=' + partNumber;
            const text = await xhrPut(url, chunk, 'application/octet-stream', job, (frac) => {
              job.progress = (start + frac * (end - start)) / job.file.size;
              renderUploadTray();
            });
            partResult = JSON.parse(text);
            break;
          } catch (err) {
            if (job.aborted || attempt === 3) throw err;
            await new Promise((r) => setTimeout(r, 600 * attempt));
          }
        }
        uploadedParts.push(partResult);
      }

      const compRes = await fetch('/api/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts: uploadedParts })
      });
      if (!compRes.ok) throw new Error(await readError(compRes));
      job.multipartUploadId = null;
      return;
    }

    // Small file: try presigned PUT, fallback to direct upload PUT
    try {
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, contentType })
      });
      if (!urlRes.ok) throw new Error('presign-unavailable');
      const { url } = await urlRes.json();
      await xhrPut(url, job.file, contentType, job, (frac) => {
        job.progress = frac;
        renderUploadTray();
      });
    } catch (err) {
      if (job.aborted) throw err;
      await xhrPut('/api/upload-direct?key=' + encodeURIComponent(key), job.file, contentType, job, (frac) => {
        job.progress = frac;
        renderUploadTray();
      });
    }
  }

  async function processUploadQueue() {
    if (uploadProcessing) return;
    uploadProcessing = true;
    let completedAny = false;
    while (true) {
      const next = uploadJobs.find((j) => j.status === 'queued');
      if (!next) break;
      next.status = 'uploading';
      renderUploadTray();
      try {
        await uploadSingleFile(next);
        next.progress = 1;
        next.status = 'done';
        completedAny = true;
      } catch (err) {
        if (!next.aborted) {
          next.status = 'error';
          next.error = err.message || 'Upload failed';
        }
      }
      renderUploadTray();
    }
    uploadProcessing = false;
    if (completedAny) {
      showToast('Upload complete.');
      await refreshList(true);
    }
  }

  // ---------------- Cut / Paste & Move to Folder ----------------
  function cutSelected() {
    const items = getSelectedItemObjects();
    if (!items.length) return;
    cutClipboard = items;
    updateClipboardBar();
    showToast('Cut ' + items.length + ' item' + (items.length === 1 ? '' : 's') + '. Navigate to destination and click Paste.');
  }
  function updateClipboardBar() {
    const bar = document.getElementById('clipboardBar');
    const txt = document.getElementById('clipboardText');
    if (!bar || !txt) return;
    bar.classList.toggle('show', cutClipboard.length > 0);
    txt.textContent = 'Ready to move ' + cutClipboard.length + ' item' + (cutClipboard.length === 1 ? '' : 's');
  }
  function clearClipboard() {
    cutClipboard = [];
    updateClipboardBar();
  }
  async function pasteClipboard() {
    if (!cutClipboard.length) return;
    const items = cutClipboard.slice();
    await performMove(items, PREFIX);
    clearClipboard();
  }
  async function performMove(items, targetPrefix) {
    if (!items || !items.length) return;
    try {
      const res = await withLoading(fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, targetPrefix })
      }));
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      selectedSet.clear();
      updateSelectionBar();
      showToast('Moved ' + (data.moved || items.length) + ' item' + ((data.moved || items.length) === 1 ? '' : 's') + '.');
      await refreshList(true);
    } catch (err) {
      showToast('Move failed: ' + err.message, true);
    }
  }

  async function openMoveModal(explicitItems) {
    const items = explicitItems || getSelectedItemObjects();
    if (!items.length) { showToast('Select at least one item to move.', true); return; }

    openDialog('Move ' + items.length + ' item' + (items.length === 1 ? '' : 's'),
      '<div class="field"><label>Choose destination folder</label><div id="moveFolderList" class="folder-picker-list"><div style="padding:14px;color:var(--text-muted)">Loading folders...</div></div></div>' +
      '<div class="modal-foot" style="margin:12px -18px -16px"><button type="button" class="btn" onclick="window.__glz.closeDialog()">Cancel</button><button type="button" class="btn btn-primary" id="btnConfirmMove">Move Here</button></div>'
    );

    let chosen = PREFIX;
    try {
      const res = await fetch('/api/folders', { credentials: 'same-origin' });
      const data = await res.json();
      const folders = data.folders || [''];
      const listEl = document.getElementById('moveFolderList');
      if (!listEl) return;
      listEl.innerHTML = '';
      folders.forEach((f) => {
        const div = document.createElement('div');
        div.className = 'folder-pick-item' + (f === chosen ? ' selected' : '');
        div.textContent = f ? '/' + f : '/ (Root)';
        div.onclick = () => {
          chosen = f;
          listEl.querySelectorAll('.folder-pick-item').forEach((n) => n.classList.remove('selected'));
          div.classList.add('selected');
        };
        listEl.appendChild(div);
      });
    } catch (err) {
      const listEl = document.getElementById('moveFolderList');
      if (listEl) listEl.innerHTML = '<div style="padding:14px;color:var(--danger)">Could not load folders.</div>';
    }

    const btn = document.getElementById('btnConfirmMove');
    if (btn) {
      btn.onclick = async () => {
        closeDialog();
        await performMove(items, chosen);
      };
    }
  }

  // ---------------- Create Folder, Rename, Bulk Delete, Properties ----------------
  async function promptNewFolder() {
    const name = await openPrompt('New folder', 'Folder name', '');
    if (!name || !name.trim()) return;
    const res = await withLoading(fetch('/api/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: PREFIX, name: name.trim() })
    }));
    if (!res.ok) { showToast(await readError(res), true); return; }
    showToast('Folder created.');
    await refreshList(true);
  }

  async function renameFile(key) {
    const dir = key.slice(0, Math.max(0, key.lastIndexOf('/') + 1));
    const curr = key.split('/').pop();
    const next = await openPrompt('Rename file', 'New filename', curr);
    if (!next || next.trim() === curr) return;
    const res = await withLoading(fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldKey: key, newKey: dir + next.trim() })
    }));
    if (!res.ok) { showToast(await readError(res), true); return; }
    showToast('Renamed to "' + next.trim() + '".');
    await refreshList(true);
  }

  async function renameFolder(path) {
    const trimmed = path.replace(/\\/$/, '');
    const parent = trimmed.slice(0, Math.max(0, trimmed.lastIndexOf('/') + 1));
    const curr = trimmed.split('/').pop();
    const next = await openPrompt('Rename folder', 'New folder name', curr);
    if (!next || next.trim() === curr) return;
    const newPrefix = parent + next.trim().replace(/\\/+$/, '') + '/';
    const res = await withLoading(fetch('/api/rename-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPrefix: path, newPrefix })
    }));
    if (!res.ok) { showToast(await readError(res), true); return; }
    showToast('Folder renamed.');
    await refreshList(true);
  }

  async function deleteSelected(explicitItems) {
    const items = explicitItems || getSelectedItemObjects();
    if (!items.length) return;
    const label = items.length === 1
      ? (items[0].type === 'folder' ? 'folder "' + items[0].path.replace(/\\/$/, '').split('/').pop() + '" and all its contents' : '"' + items[0].key.split('/').pop() + '"')
      : items.length + ' selected items (including any folder contents)';
    const ok = await openConfirm('Delete ' + (items.length === 1 ? 'item' : items.length + ' items'), 'Permanently delete ' + label + '? This cannot be undone.', 'Delete');
    if (!ok) return;
    const res = await withLoading(fetch('/api/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }));
    if (!res.ok) { showToast(await readError(res), true); return; }
    selectedSet.clear();
    updateSelectionBar();
    showToast('Deleted.');
    await refreshList(true);
  }

  function showProperties(kind, keyOrPath) {
    if (kind === 'file') {
      const f = currentFiles.find((x) => x.key === keyOrPath) || (globalSearchResults && globalSearchResults.files.find((x) => x.key === keyOrPath));
      const name = keyOrPath.split('/').pop();
      const size = f ? f.size : 0;
      const uploaded = f ? f.uploaded : '';
      openDialog(name,
        '<div class="prop-list">' +
          '<div class="prop-row"><span class="prop-k">Name</span><span class="prop-v">' + escText(name) + '</span></div>' +
          '<div class="prop-row"><span class="prop-k">Path</span><span class="prop-v" style="font-family:var(--font-mono)">' + escText(keyOrPath) + '</span></div>' +
          '<div class="prop-row"><span class="prop-k">Category</span><span class="prop-v">' + escText(getFileCategory(name).toUpperCase()) + '</span></div>' +
          '<div class="prop-row"><span class="prop-k">Size</span><span class="prop-v">' + humanSize(size) + ' (' + size.toLocaleString() + ' bytes)</span></div>' +
          '<div class="prop-row"><span class="prop-k">Modified</span><span class="prop-v">' + humanDate(uploaded) + '</span></div>' +
        '</div>' +
        '<div class="modal-foot" style="margin:14px -18px -16px"><button type="button" class="btn btn-primary" onclick="window.__glz.closeDialog()">Close</button></div>'
      );
    } else {
      const name = keyOrPath ? keyOrPath.replace(/\\/$/, '').split('/').pop() : 'All Files (Root)';
      openDialog(name,
        '<div class="prop-list">' +
          '<div class="prop-row"><span class="prop-k">Folder</span><span class="prop-v">' + escText(name) + '</span></div>' +
          '<div class="prop-row"><span class="prop-k">Path</span><span class="prop-v" style="font-family:var(--font-mono)">/' + escText(keyOrPath || '') + '</span></div>' +
          '<div class="prop-row"><span class="prop-k">Storage</span><span class="prop-v">Glz Serve</span></div>' +
        '</div>' +
        '<div class="modal-foot" style="margin:14px -18px -16px"><button type="button" class="btn btn-primary" onclick="window.__glz.closeDialog()">Close</button></div>'
      );
    }
  }

  // ---------------- Share Links: Create + Manager ----------------
  function shareFile(key) {
    const fileName = key.split('/').pop();
    const isApk = fileName.toLowerCase().endsWith('.apk');
    const html =
      '<div class="field">' +
        '<label>Delivery mode</label>' +
        '<label class="radio-card"><input type="radio" name="shareMode" id="shareModePage" value="page"' + (!isApk ? ' checked' : '') + '><div><div class="radio-card-title">Interactive Preview Page</div><div class="radio-card-desc">Web page with mobile-ready preview and Download button.</div></div></label>' +
        '<label class="radio-card"><input type="radio" name="shareMode" id="shareModeDirect" value="direct"' + (isApk ? ' checked' : '') + '><div><div class="radio-card-title">Direct Download Stream</div><div class="radio-card-desc">Streams raw file immediately. Required for GLZTV & TV Downloader APKs.</div></div></label>' +
      '</div>' +
      '<div class="field-grid">' +
        '<div class="field"><label for="shareExpiry">Expiration</label><select id="shareExpiry" class="select">' +
          '<option value="7"' + (!isApk ? ' selected' : '') + '>7 days</option>' +
          '<option value="30">30 days</option>' +
          '<option value="90">90 days</option>' +
          '<option value="0"' + (isApk ? ' selected' : '') + '>Never expires</option>' +
        '</select></div>' +
        '<div class="field"><label for="shareMaxDl">Max downloads (optional)</label><input type="number" min="1" id="shareMaxDl" class="input" placeholder="Unlimited (1 = one-time)"></div>' +
      '</div>' +
      '<div class="field-grid">' +
        '<div class="field"><label for="shareSlug">Custom alias (optional)</label><input type="text" id="shareSlug" class="input" placeholder="e.g. glztv-latest"></div>' +
        '<div class="field"><label for="sharePass">Password (optional)</label><input type="password" id="sharePass" class="input" placeholder="Leave blank for public"></div>' +
      '</div>' +
      '<div id="shareResultBox" style="display:none;margin-top:12px;"></div>' +
      '<div class="modal-foot" style="margin:14px -18px -16px">' +
        '<button type="button" class="btn" onclick="window.__glz.closeDialog()">Close</button>' +
        '<button type="button" class="btn btn-primary" id="btnGenShare">Create Share Link</button>' +
      '</div>';

    openDialog('Share: ' + fileName, html, { large: true });
    document.getElementById('btnGenShare').onclick = async () => {
      const btn = document.getElementById('btnGenShare');
      const box = document.getElementById('shareResultBox');
      const direct = document.getElementById('shareModeDirect').checked;
      const days = document.getElementById('shareExpiry').value;
      const slug = document.getElementById('shareSlug').value.trim();
      const password = document.getElementById('sharePass').value;
      const maxDownloads = document.getElementById('shareMaxDl').value;

      btn.disabled = true;
      btn.textContent = 'Creating...';
      try {
        const res = await fetch('/api/share-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, days: days === '0' ? 0 : Number(days), direct, slug, password, maxDownloads })
        });
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        const primary = direct ? data.directUrl : data.shareUrl;
        copyText(primary, 'Share link created & copied!');
        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=' + encodeURIComponent(primary);
        box.style.display = 'block';
        box.innerHTML =
          '<div class="link-card">' +
            '<div class="link-card-top"><span class="link-card-name">Link ready</span><div class="link-badges">' +
              (data.hasPassword ? '<span class="tag tag-warn">Password</span>' : '') +
              (data.maxDownloads ? '<span class="tag tag-accent">Max ' + data.maxDownloads + '</span>' : '') +
              (data.expiresAt ? '<span class="tag">Expires ' + new Date(data.expiresAt).toLocaleDateString() + '</span>' : '<span class="tag tag-success">Permanent</span>') +
            '</div></div>' +
            '<div class="link-card-actions"><input class="link-code-input" readonly value="' + escAttr(data.shareUrl) + '" onclick="this.select()"><button type="button" class="btn btn-sm" id="cpSharePage">Copy Preview</button></div>' +
            '<div class="link-card-actions"><input class="link-code-input" readonly value="' + escAttr(data.directUrl) + '" onclick="this.select()"><button type="button" class="btn btn-sm btn-primary" id="cpShareDirect">Copy Direct</button></div>' +
            '<div style="display:flex;align-items:center;gap:12px;padding-top:4px"><img src="' + escAttr(qrUrl) + '" width="88" height="88" alt="QR Code" style="border-radius:6px;border:1px solid var(--border);background:#fff;padding:3px"><div class="field-hint" style="margin:0">Scan on mobile or TV to open immediately. Manage or revoke anytime in <b>Share Links</b>.</div></div>' +
          '</div>';
        document.getElementById('cpSharePage').onclick = () => copyText(data.shareUrl, 'Preview link copied');
        document.getElementById('cpShareDirect').onclick = () => copyText(data.directUrl, 'Direct link copied');
      } catch (err) {
        box.style.display = 'block';
        box.innerHTML = '<div style="color:var(--danger);font-size:13px;font-weight:500">' + escText(err.message) + '</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Share Link';
      }
    };
  }

  async function openShareLinksManager() {
    toggleDrawer(false);
    openDialog('Share Links', '<div id="linksMgrBody" style="color:var(--text-muted);padding:12px 0">Loading active links...</div>' +
      '<div class="modal-foot" style="margin:14px -18px -16px"><button type="button" class="btn btn-primary" onclick="window.__glz.closeDialog()">Done</button></div>',
      { large: true }
    );
    await loadShareLinksList();
  }

  async function loadShareLinksList() {
    const body = document.getElementById('linksMgrBody');
    if (!body) return;
    try {
      const res = await fetch('/api/share-links', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      const links = data.links || [];
      if (!links.length) {
        body.innerHTML = '<div class="empty-state" style="padding:32px 12px"><h3>No active share links</h3><p>Right-click any file or open its menu to create a share link.</p></div>';
        return;
      }
      const list = document.createElement('div');
      list.className = 'links-list';
      links.forEach((l) => {
        const card = document.createElement('div');
        card.className = 'link-card';
        const dlText = l.maxDownloads ? (l.downloads + ' / ' + l.maxDownloads + ' dl') : (l.downloads + ' dl');
        const expText = l.expiresAt ? 'Exp ' + new Date(l.expiresAt).toLocaleDateString() : 'Permanent';
        card.innerHTML =
          '<div class="link-card-top">' +
            '<span class="link-card-name" title="' + escAttr(l.key) + '">' + escText(l.filename) + '</span>' +
            '<div class="link-badges">' +
              '<span class="tag tag-accent">/' + escText(l.code) + '</span>' +
              '<span class="tag">' + escText(dlText) + '</span>' +
              (l.hasPassword ? '<span class="tag tag-warn">Locked</span>' : '') +
              (l.direct ? '<span class="tag tag-success">Direct</span>' : '') +
              '<span class="tag">' + escText(expText) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="link-card-actions">' +
            '<input class="link-code-input" readonly value="' + escAttr(l.direct ? l.directUrl : l.shareUrl) + '" onclick="this.select()">' +
            '<button type="button" class="btn btn-sm" data-act="copy">Copy</button>' +
            '<a class="btn btn-sm" href="' + escAttr(l.shareUrl) + '" target="_blank" rel="noopener">Open</a>' +
            '<button type="button" class="btn btn-sm btn-danger" data-act="revoke">Revoke</button>' +
          '</div>';
        card.querySelector('[data-act="copy"]').onclick = () => copyText(l.direct ? l.directUrl : l.shareUrl, 'Copied link');
        card.querySelector('[data-act="revoke"]').onclick = async () => {
          const ok = await openConfirm('Revoke share link', 'Revoke "/' + l.code + '" for "' + l.filename + '"? Anyone with this URL will immediately lose access.', 'Revoke');
          if (!ok) return;
          const r = await fetch('/api/share-links/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: l.code })
          });
          if (!r.ok) { showToast(await readError(r), true); return; }
          showToast('Link revoked.');
          await loadShareLinksList();
        };
        list.appendChild(card);
      });
      body.innerHTML = '';
      body.appendChild(list);
    } catch (err) {
      body.innerHTML = '<div style="color:var(--danger);padding:12px">' + escText(err.message) + '</div>';
    }
  }

  // ---------------- Preview Modal ----------------
  function cleanupPlayerMedia() {
    if (activePlayerAbort) { try { activePlayerAbort.abort(); } catch (_) {} activePlayerAbort = null; }
    if (activePdfViewer) { try { activePdfViewer.destroy(); } catch (_) {} activePdfViewer = null; }
    const contentEl = document.getElementById('playerContent');
    if (!contentEl) return;
    contentEl.querySelectorAll('video, audio').forEach((el) => {
      try { el.pause(); el.removeAttribute('src'); el.load(); } catch (_) {}
    });
    contentEl.innerHTML = '';
  }

  function getVisibleFileKeys() {
    return getDisplayedEntries().filter((e) => e.type === 'file').map((e) => e.key);
  }

  function updatePlayerNavButtons() {
    const prevBtn = document.getElementById('playerPrevBtn');
    const nextBtn = document.getElementById('playerNextBtn');
    if (!prevBtn || !nextBtn) return;
    const keys = getVisibleFileKeys();
    const idx = keys.indexOf(currentActiveKey);
    const show = keys.length > 1 && idx !== -1;
    prevBtn.style.display = show ? 'inline-flex' : 'none';
    nextBtn.style.display = show ? 'inline-flex' : 'none';
    if (show) {
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= keys.length - 1;
    }
  }

  function playerStep(delta) {
    const keys = getVisibleFileKeys();
    const idx = keys.indexOf(currentActiveKey);
    if (idx === -1) return;
    const nextKey = keys[idx + delta];
    if (nextKey) openPlayer(nextKey);
  }

  function openPlayer(key) {
    cleanupPlayerMedia();
    currentActiveKey = key;
    const name = key.split('/').pop();
    const cat = getFileCategory(name);
    const encodedPath = encodeKeyPath(key);
    const streamUrl = '/stream/' + encodedPath;
    const downloadUrl = '/download/' + encodedPath;
    const isTouchLike = shouldUseInlinePdfRenderer();

    const backdrop = document.getElementById('playerBackdrop');
    const titleEl = document.getElementById('playerTitle');
    const metaEl = document.getElementById('playerMeta');
    const contentEl = document.getElementById('playerContent');

    const fileObj = currentFiles.find((f) => f.key === key) || (globalSearchResults && globalSearchResults.files.find((f) => f.key === key));
    const sizeText = fileObj ? humanSize(fileObj.size) : '';
    titleEl.textContent = name;
    metaEl.textContent = (sizeText ? sizeText + ' \\u00B7 ' : '') + cat.toUpperCase();

    activePlayerAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = activePlayerAbort ? activePlayerAbort.signal : undefined;

    const showMediaError = (msg) => {
      contentEl.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'player-media-err';
      const p = document.createElement('p');
      p.textContent = msg;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pbtn pbtn-download';
      btn.textContent = 'Download File';
      btn.onclick = () => downloadFile(key);
      box.append(p, btn);
      contentEl.appendChild(box);
    };

    if (cat === 'video') {
      const video = document.createElement('video');
      video.className = 'player-video';
      video.controls = true;
      video.autoplay = !isTouchLike;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.src = streamUrl;
      video.onerror = () => showMediaError('Your browser cannot decode this video format inline. Download it to play in an external player.');
      contentEl.appendChild(video);
    } else if (cat === 'audio') {
      const card = document.createElement('div');
      card.className = 'player-audio-card';
      const t = document.createElement('div');
      t.className = 'player-audio-title';
      t.textContent = name;
      const audio = document.createElement('audio');
      audio.className = 'player-audio-element';
      audio.controls = true;
      audio.autoplay = !isTouchLike;
      audio.preload = 'metadata';
      audio.src = streamUrl;
      audio.onerror = () => showMediaError('Your browser cannot decode this audio format inline.');
      card.append(t, audio);
      contentEl.appendChild(card);
    } else if (cat === 'image') {
      const status = document.createElement('div');
      status.className = 'player-status-msg';
      status.textContent = 'Loading image...';
      const img = document.createElement('img');
      img.className = 'player-image';
      img.decoding = 'async';
      img.alt = name;
      img.style.display = 'none';
      img.onload = () => { status.remove(); img.style.display = 'block'; };
      img.onerror = () => showMediaError('This image format could not be previewed in your browser.');
      img.onclick = () => img.classList.toggle('player-image-zoomed');
      img.src = streamUrl;
      contentEl.append(status, img);
    } else if (cat === 'pdf') {
      if (shouldUseInlinePdfRenderer()) {
        activePdfViewer = renderInlinePdf(contentEl, streamUrl, downloadUrl, name, signal);
      } else {
        const iframe = document.createElement('iframe');
        iframe.className = 'player-pdf';
        iframe.src = streamUrl;
        contentEl.appendChild(iframe);
      }
    } else if (cat === 'text') {
      const TEXT_LIMIT = 262144;
      const wrap = document.createElement('div');
      wrap.className = 'player-text-wrap';
      const bar = document.createElement('div');
      bar.className = 'player-text-bar';
      const info = document.createElement('span');
      info.textContent = 'Loading text preview...';
      const acts = document.createElement('div');
      acts.className = 'player-text-bar-actions';
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'pdf-ctrl-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.style.display = 'none';
      const loadFullBtn = document.createElement('button');
      loadFullBtn.type = 'button';
      loadFullBtn.className = 'pdf-ctrl-btn';
      loadFullBtn.textContent = 'Load Full File';
      loadFullBtn.style.display = 'none';
      acts.append(loadFullBtn, copyBtn);
      bar.append(info, acts);
      const pre = document.createElement('pre');
      pre.className = 'player-text';
      pre.textContent = 'Loading...';
      wrap.append(bar, pre);
      contentEl.appendChild(wrap);

      copyBtn.onclick = () => copyText(pre.textContent, 'Copied text');
      const loadText = (full) => {
        const opts = full ? { credentials: 'same-origin', signal } : { credentials: 'same-origin', headers: { Range: 'bytes=0-' + (TEXT_LIMIT - 1) }, signal };
        if (full) { info.textContent = 'Loading full file...'; loadFullBtn.disabled = true; }
        fetch(streamUrl, opts)
          .then(async (r) => {
            if (!r.ok && r.status !== 206) throw new Error('Status ' + r.status);
            const text = await r.text();
            const cr = r.headers.get('Content-Range') || '';
            const m = /\\/(\\d+)$/.exec(cr);
            const total = m ? Number(m[1]) : (fileObj ? fileObj.size : text.length);
            const partial = !full && r.status === 206 && total > TEXT_LIMIT;
            pre.textContent = text;
            copyBtn.style.display = 'inline-block';
            if (partial) {
              info.textContent = 'Showing first ' + humanSize(TEXT_LIMIT) + ' of ' + humanSize(total);
              loadFullBtn.style.display = 'inline-block';
              loadFullBtn.disabled = false;
            } else {
              info.textContent = humanSize(total) + ' \\u00B7 ' + text.split(/\\r?\\n/).length + ' lines';
              loadFullBtn.style.display = 'none';
            }
          })
          .catch((err) => {
            if (err && err.name === 'AbortError') return;
            info.textContent = 'Preview unavailable';
            pre.textContent = 'Could not load text content: ' + err.message;
          });
      };
      loadFullBtn.onclick = () => loadText(true);
      loadText(false);
    } else {
      const kind = getIconKind(name);
      const card = document.createElement('div');
      card.className = 'player-generic';
      card.innerHTML = '<div class="file-badge kind-' + kind + '" style="width:52px;height:52px;margin:0 auto;border-radius:12px">' + (ICONS[kind] || ICONS.file) + '</div>';
      const nameEl = document.createElement('div');
      nameEl.className = 'player-generic-name';
      nameEl.textContent = name;
      const sizeEl = document.createElement('div');
      sizeEl.className = 'player-generic-size';
      sizeEl.textContent = (sizeText ? sizeText + ' \\u00B7 ' : '') + 'No inline preview for this file type';
      const actions = document.createElement('div');
      actions.className = 'player-generic-actions';
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'pbtn pbtn-download';
      dlBtn.textContent = 'Download File';
      dlBtn.onclick = () => downloadFile(key);
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'pbtn';
      shareBtn.textContent = 'Share Link';
      shareBtn.onclick = () => { closePlayer(); shareFile(key); };
      actions.append(dlBtn, shareBtn);
      card.append(nameEl, sizeEl, actions);
      contentEl.appendChild(card);
    }

    updatePlayerNavButtons();
    backdrop.classList.add('show');
  }

  function closePlayer() {
    cleanupPlayerMedia();
    document.getElementById('playerBackdrop').classList.remove('show');
    currentActiveKey = null;
  }

  function downloadFile(key) {
    window.location.href = '/download/' + encodeKeyPath(key);
  }

  // ---------------- Context Menu ----------------
  function openCtxMenu(evt, kind, keyOrPath) {
    if (evt.preventDefault) evt.preventDefault();
    if (evt.stopPropagation) evt.stopPropagation();
    const menu = document.getElementById('ctxMenu');
    const selectedCount = selectedSet.size;
    let items = [];

    if (kind === 'file') {
      items = [
        { label: 'Preview', cls: 'primary', run: () => openPlayer(keyOrPath) },
        { label: 'Download', run: () => downloadFile(keyOrPath) },
        { label: 'Share link...', run: () => shareFile(keyOrPath) },
        { sep: true },
        { label: selectedCount > 1 ? 'Move ' + selectedCount + ' items...' : 'Move to...', run: () => openMoveModal(selectedCount > 1 ? null : [{ type: 'file', key: keyOrPath }]) },
        { label: 'Cut', run: () => cutSelected() },
        { label: 'Rename', run: () => renameFile(keyOrPath) },
        { label: 'Properties', run: () => showProperties('file', keyOrPath) },
        { sep: true },
        { label: selectedCount > 1 ? 'Delete ' + selectedCount + ' items' : 'Delete', cls: 'danger', run: () => deleteSelected(selectedCount > 1 ? null : [{ type: 'file', key: keyOrPath }]) }
      ];
    } else if (kind === 'folder') {
      items = [
        { label: 'Open folder', cls: 'primary', run: () => navigateTo(keyOrPath) },
        { sep: true },
        { label: selectedCount > 1 ? 'Move ' + selectedCount + ' items...' : 'Move to...', run: () => openMoveModal(selectedCount > 1 ? null : [{ type: 'folder', path: keyOrPath }]) },
        { label: 'Cut', run: () => cutSelected() },
        { label: 'Rename', run: () => renameFolder(keyOrPath) },
        { label: 'Properties', run: () => showProperties('folder', keyOrPath) },
        { sep: true },
        { label: selectedCount > 1 ? 'Delete ' + selectedCount + ' items' : 'Delete', cls: 'danger', run: () => deleteSelected(selectedCount > 1 ? null : [{ type: 'folder', path: keyOrPath }]) }
      ];
    } else {
      items = [
        { label: 'New folder...', run: () => promptNewFolder() },
        { label: 'Upload files...', run: () => document.getElementById('fileInput').click() },
        ...(cutClipboard.length ? [{ label: 'Paste ' + cutClipboard.length + ' item(s) here', cls: 'primary', run: () => pasteClipboard() }] : []),
        { sep: true },
        { label: 'Select all', run: () => selectAllVisible(true) },
        { label: 'Refresh', run: () => refreshList() }
      ];
    }

    menu.innerHTML = '';
    items.forEach((it) => {
      if (it.sep) {
        const s = document.createElement('div');
        s.className = 'ctx-sep';
        menu.appendChild(s);
        return;
      }
      const el = document.createElement('div');
      el.role = 'menuitem';
      el.tabIndex = 0;
      el.className = 'ctx-item' + (it.cls ? ' ' + it.cls : '');
      el.textContent = it.label;
      el.onclick = (e) => { e.stopPropagation(); closeCtxMenu(); it.run(); };
      el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } };
      menu.appendChild(el);
    });

    menu.style.left = evt.clientX + 'px';
    menu.style.top = evt.clientY + 'px';
    menu.classList.add('show');
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = Math.max(6, window.innerWidth - rect.width - 6) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = Math.max(6, window.innerHeight - rect.height - 6) + 'px';
  }

  function closeCtxMenu() {
    const m = document.getElementById('ctxMenu');
    if (m) m.classList.remove('show');
  }
  document.addEventListener('click', closeCtxMenu);
  document.addEventListener('pointerdown', (e) => {
    const m = document.getElementById('ctxMenu');
    if (m && !m.contains(e.target)) closeCtxMenu();
  });
  window.addEventListener('resize', closeCtxMenu);

  // ---------------- Generic Dialogs ----------------
  function openDialog(title, bodyHtml, { large = false } = {}) {
    const bd = document.getElementById('dialogBackdrop');
    const win = document.getElementById('dialogWindow');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = bodyHtml;
    win.classList.toggle('modal-lg', Boolean(large));
    bd.classList.add('show');
  }
  function closeDialog() {
    document.getElementById('dialogBackdrop').classList.remove('show');
  }

  function openPrompt(title, label, defaultValue) {
    return new Promise((resolve) => {
      openDialog(title,
        '<div class="field"><label for="promptInp">' + escText(label) + '</label><input type="text" id="promptInp" class="input" value="' + escAttr(defaultValue || '') + '"></div>' +
        '<div class="modal-foot" style="margin:12px -18px -16px"><button type="button" class="btn" id="promptCancel">Cancel</button><button type="button" class="btn btn-primary" id="promptOk">OK</button></div>'
      );
      const inp = document.getElementById('promptInp');
      const done = (val) => { closeDialog(); resolve(val); };
      document.getElementById('promptOk').onclick = () => done(inp.value);
      document.getElementById('promptCancel').onclick = () => done(null);
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); };
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    });
  }

  function openConfirm(title, message, okLabel) {
    return new Promise((resolve) => {
      openDialog(title,
        '<p style="margin:0 0 8px;color:var(--text-secondary);line-height:1.5">' + escText(message) + '</p>' +
        '<div class="modal-foot" style="margin:16px -18px -16px"><button type="button" class="btn" id="confirmCancel">Cancel</button><button type="button" class="btn btn-danger" id="confirmOk">' + escText(okLabel || 'Confirm') + '</button></div>'
      );
      const done = (v) => { closeDialog(); resolve(v); };
      document.getElementById('confirmOk').onclick = () => done(true);
      document.getElementById('confirmCancel').onclick = () => done(false);
    });
  }

  // ---------------- Keyboard Shortcuts ----------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCtxMenu();
      closeDialog();
      toggleDrawer(false);
      if (document.getElementById('playerBackdrop').classList.contains('show')) closePlayer();
      return;
    }
    if (document.getElementById('playerBackdrop').classList.contains('show')) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); playerStep(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); playerStep(1); }
      return;
    }
    if (document.getElementById('dialogBackdrop').classList.contains('show')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      document.getElementById('filterInput').focus();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAllVisible(true);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      if (selectedSet.size) { e.preventDefault(); cutSelected(); }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (cutClipboard.length) { e.preventDefault(); pasteClipboard(); }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedSet.size && e.key === 'Delete') { e.preventDefault(); deleteSelected(); }
    } else if (e.key === 'F2' && selectedSet.size === 1) {
      e.preventDefault();
      const item = getSelectedItemObjects()[0];
      if (item.type === 'folder') renameFolder(item.path);
      else renameFile(item.key);
    } else if (e.key === ' ' && selectedSet.size === 1) {
      const item = getSelectedItemObjects()[0];
      if (item.type === 'file') { e.preventDefault(); openPlayer(item.key); }
    }
  });

  // Expose API for inline buttons & browser tests
  window.__glz = {
    navigateTo,
    goUp,
    refreshList,
    toggleTheme,
    toggleDrawer,
    setViewMode,
    toggleGlobalSearch,
    onFilterInput,
    clearFilter,
    pinCurrentFolder,
    promptNewFolder,
    openShareLinksManager,
    openMoveModal,
    cutSelected,
    pasteClipboard,
    clearClipboard,
    deleteSelected,
    selectAllVisible,
    toggleSelectMode,
    clearCompletedUploads,
    closeDialog,
    closePlayer,
    playerStep,
    playerDownloadCurrent: () => currentActiveKey && downloadFile(currentActiveKey),
    playerShareCurrent: () => { if (!currentActiveKey) return; const k = currentActiveKey; closePlayer(); shareFile(k); },
    playerOpenRaw: () => currentActiveKey && window.open('/stream/' + encodeKeyPath(currentActiveKey), '_blank'),
    openPlayer
  };

  // Initial render
  setViewMode(viewMode);
  renderBreadcrumbs();
  updateSidebarActive();
  updateStorageSummary();
  renderFavorites();
})();
`;
