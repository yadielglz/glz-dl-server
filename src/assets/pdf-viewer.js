export const PDF_PREVIEW_SCRIPT = `
function shouldUseInlinePdfRenderer() {
  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua);
  const isTouchScreen = (navigator.maxTouchPoints || 0) > 1 && window.innerWidth <= 1024;
  const nativePdf = typeof navigator.pdfViewerEnabled === 'boolean' ? navigator.pdfViewerEnabled : !isMobileUa;
  return isMobileUa || isTouchScreen || !nativePdf;
}

let _pdfJsPromise = null;
function loadPdfJsLibrary() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfJsPromise) return _pdfJsPromise;
  const sources = [
    {
      lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    },
    {
      lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
      worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    }
  ];
  const tryLoad = (idx) => new Promise((resolve, reject) => {
    if (idx >= sources.length) {
      reject(new Error('Could not load PDF renderer library'));
      return;
    }
    const src = sources[idx];
    const s = document.createElement('script');
    s.src = src.lib;
    s.async = true;
    s.onload = () => {
      if (!window.pdfjsLib) {
        tryLoad(idx + 1).then(resolve, reject);
        return;
      }
      try {
        const blob = new Blob(['importScripts(' + JSON.stringify(src.worker) + ');'], { type: 'application/javascript' });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      } catch (_) {}
      resolve(window.pdfjsLib);
    };
    s.onerror = () => {
      s.remove();
      tryLoad(idx + 1).then(resolve, reject);
    };
    document.head.appendChild(s);
  });
  _pdfJsPromise = tryLoad(0).catch((err) => {
    _pdfJsPromise = null;
    throw err;
  });
  return _pdfJsPromise;
}

function renderInlinePdf(container, pdfUrl, downloadUrl, fileName, signal) {
  let destroyed = false;
  let pdfDoc = null;
  let observer = null;
  const activeTasks = new Set();

  const destroy = () => {
    destroyed = true;
    if (observer) { observer.disconnect(); observer = null; }
    activeTasks.forEach((t) => { try { t.cancel(); } catch (_) {} });
    activeTasks.clear();
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (_) {} pdfDoc = null; }
  };

  container.innerHTML = '<div class="pdf-viewer-wrap"><div class="pdf-loading">Loading PDF preview...</div></div>';

  (async () => {
    try {
      const [pdfjsLib, res] = await Promise.all([
        loadPdfJsLibrary(),
        fetch(pdfUrl, { credentials: 'same-origin', signal })
      ]);
      if (destroyed) return;
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const rawBuf = await res.arrayBuffer();
      if (destroyed) return;

      const cMapUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/';
      try {
        pdfDoc = await pdfjsLib.getDocument({
          data: new Uint8Array(rawBuf.slice(0)),
          cMapUrl,
          cMapPacked: true
        }).promise;
      } catch (_) {
        if (destroyed) return;
        pdfDoc = await pdfjsLib.getDocument({
          data: new Uint8Array(rawBuf),
          cMapUrl,
          cMapPacked: true,
          disableWorker: true
        }).promise;
      }
      if (destroyed) { try { pdfDoc.destroy(); } catch (_) {} return; }

      const totalPages = pdfDoc.numPages;
      let zoom = 1;
      let currentPage = 1;

      const wrap = document.createElement('div');
      wrap.className = 'pdf-viewer-wrap';

      const bar = document.createElement('div');
      bar.className = 'pdf-viewer-bar';

      const navGroup = document.createElement('div');
      navGroup.className = 'pdf-viewer-group';
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'pdf-ctrl-btn';
      prevBtn.textContent = 'Prev';
      const pageInd = document.createElement('span');
      pageInd.className = 'pdf-page-indicator';
      pageInd.textContent = '1 / ' + totalPages;
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'pdf-ctrl-btn';
      nextBtn.textContent = 'Next';
      navGroup.append(prevBtn, pageInd, nextBtn);

      const zoomGroup = document.createElement('div');
      zoomGroup.className = 'pdf-viewer-group';
      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.type = 'button';
      zoomOutBtn.className = 'pdf-ctrl-btn';
      zoomOutBtn.textContent = '\\u2212';
      zoomOutBtn.title = 'Zoom out';
      const zoomInd = document.createElement('span');
      zoomInd.className = 'pdf-page-indicator';
      zoomInd.textContent = '100%';
      const zoomInBtn = document.createElement('button');
      zoomInBtn.type = 'button';
      zoomInBtn.className = 'pdf-ctrl-btn';
      zoomInBtn.textContent = '+';
      zoomInBtn.title = 'Zoom in';
      const zoomFitBtn = document.createElement('button');
      zoomFitBtn.type = 'button';
      zoomFitBtn.className = 'pdf-ctrl-btn';
      zoomFitBtn.textContent = 'Fit';
      zoomGroup.append(zoomOutBtn, zoomInd, zoomInBtn, zoomFitBtn);

      bar.append(navGroup, zoomGroup);

      const pagesEl = document.createElement('div');
      pagesEl.className = 'pdf-viewer-pages';

      wrap.append(bar, pagesEl);
      container.innerHTML = '';
      container.appendChild(wrap);

      const firstPage = await pdfDoc.getPage(1);
      if (destroyed) return;
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const slots = [];
      const renderedSet = new Set();
      const renderingSet = new Set();

      const getFitScale = () => {
        const availW = Math.max(240, (pagesEl.clientWidth || window.innerWidth) - 24);
        return Math.min(2.5, availW / baseViewport.width);
      };

      const updateNavUi = () => {
        pageInd.textContent = currentPage + ' / ' + totalPages;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        zoomInd.textContent = Math.round(zoom * 100) + '%';
      };

      const sizeSlots = () => {
        const effScale = getFitScale() * zoom;
        const w = Math.floor(baseViewport.width * effScale);
        const h = Math.floor(baseViewport.height * effScale);
        slots.forEach((slot) => {
          slot.style.width = w + 'px';
          slot.style.minHeight = h + 'px';
        });
      };

      const renderPage = async (num) => {
        if (destroyed || !pdfDoc || renderedSet.has(num) || renderingSet.has(num)) return;
        renderingSet.add(num);
        const slot = slots[num - 1];
        try {
          const page = num === 1 ? firstPage : await pdfDoc.getPage(num);
          if (destroyed) return;
          const cssScale = getFitScale() * zoom;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const vp = page.getViewport({ scale: cssScale });
          const hiVp = page.getViewport({ scale: cssScale * dpr });

          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page-canvas';
          canvas.width = Math.floor(hiVp.width);
          canvas.height = Math.floor(hiVp.height);
          canvas.style.width = Math.floor(vp.width) + 'px';
          canvas.style.height = Math.floor(vp.height) + 'px';
          slot.style.width = Math.floor(vp.width) + 'px';
          slot.style.minHeight = Math.floor(vp.height) + 'px';

          const ctx = canvas.getContext('2d', { alpha: false });
          const task = page.render({ canvasContext: ctx, viewport: hiVp });
          activeTasks.add(task);
          await task.promise;
          activeTasks.delete(task);
          if (destroyed) return;
          slot.innerHTML = '';
          slot.appendChild(canvas);
          renderedSet.add(num);
        } catch (err) {
          if (err && err.name !== 'RenderingCancelledException' && !destroyed) {
            slot.innerHTML = '<div class="pdf-page-placeholder">Could not render page ' + num + '</div>';
          }
        } finally {
          renderingSet.delete(num);
        }
      };

      for (let i = 1; i <= totalPages; i++) {
        const slot = document.createElement('div');
        slot.className = 'pdf-page-slot';
        slot.dataset.page = String(i);
        slot.innerHTML = '<div class="pdf-page-placeholder">Page ' + i + '</div>';
        pagesEl.appendChild(slot);
        slots.push(slot);
      }
      sizeSlots();
      updateNavUi();

      if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) renderPage(Number(entry.target.dataset.page));
          });
        }, { root: pagesEl, rootMargin: '300px 0px' });
        slots.forEach((s) => observer.observe(s));
      } else {
        for (let i = 1; i <= Math.min(totalPages, 5); i++) renderPage(i);
      }
      renderPage(1);
      if (totalPages > 1) renderPage(2);

      const rerenderVisible = () => {
        activeTasks.forEach((t) => { try { t.cancel(); } catch (_) {} });
        activeTasks.clear();
        renderedSet.clear();
        renderingSet.clear();
        sizeSlots();
        updateNavUi();
        renderPage(currentPage);
        if (currentPage > 1) renderPage(currentPage - 1);
        if (currentPage < totalPages) renderPage(currentPage + 1);
      };

      const goToPage = (p) => {
        const clamped = Math.max(1, Math.min(totalPages, p));
        currentPage = clamped;
        updateNavUi();
        const slot = slots[clamped - 1];
        if (slot) slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderPage(clamped);
      };

      prevBtn.onclick = () => goToPage(currentPage - 1);
      nextBtn.onclick = () => goToPage(currentPage + 1);
      zoomOutBtn.onclick = () => { zoom = Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100); rerenderVisible(); };
      zoomInBtn.onclick = () => { zoom = Math.min(2.5, Math.round((zoom + 0.25) * 100) / 100); rerenderVisible(); };
      zoomFitBtn.onclick = () => { zoom = 1; rerenderVisible(); };

      let scrollRaf = 0;
      pagesEl.addEventListener('scroll', () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          const mid = pagesEl.scrollTop + pagesEl.clientHeight * 0.35;
          for (let i = 0; i < slots.length; i++) {
            const top = slots[i].offsetTop;
            const bottom = top + slots[i].offsetHeight;
            if (mid >= top && mid <= bottom) {
              if (currentPage !== i + 1) {
                currentPage = i + 1;
                updateNavUi();
              }
              break;
            }
          }
        });
      }, { passive: true });
    } catch (err) {
      if (destroyed || (err && err.name === 'AbortError')) return;
      container.innerHTML = '';
      const errBox = document.createElement('div');
      errBox.className = 'pdf-viewer-wrap';
      const inner = document.createElement('div');
      inner.className = 'pdf-error';
      const msg = document.createElement('div');
      msg.textContent = 'Inline PDF preview could not be rendered (' + (err && err.message ? err.message : 'unavailable') + ').';
      const actions = document.createElement('div');
      actions.className = 'pdf-error-actions';
      const dlLink = document.createElement('a');
      dlLink.href = downloadUrl;
      dlLink.setAttribute('download', fileName || 'document.pdf');
      dlLink.className = 'pdf-ctrl-btn';
      dlLink.style.textDecoration = 'none';
      dlLink.textContent = 'Download PDF';
      actions.appendChild(dlLink);
      inner.append(msg, actions);
      errBox.appendChild(inner);
      container.appendChild(errBox);
    }
  })();

  return { destroy };
}
`;
