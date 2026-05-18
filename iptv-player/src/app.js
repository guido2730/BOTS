// Main application logic
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let allChannels = [];
  let filteredChannels = [];
  let activeGroup = 'Todos';
  let activeIndex = -1;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const videoEl       = document.getElementById('video-player');
  const overlay       = document.getElementById('player-overlay');
  const nowTitle      = document.getElementById('now-title');
  const channelList   = document.getElementById('channel-list');
  const groupTabs     = document.getElementById('group-tabs');
  const searchEl      = document.getElementById('search');
  const channelCount  = document.getElementById('channel-count');
  const btnImport     = document.getElementById('btn-import');
  const btnClear      = document.getElementById('btn-clear');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnPip        = document.getElementById('btn-pip');
  const btnMute       = document.getElementById('btn-mute');
  const volumeSlider  = document.getElementById('volume-slider');
  const modal         = document.getElementById('modal-import');
  const btnModalCancel= document.getElementById('btn-modal-cancel');
  const btnModalImport= document.getElementById('btn-modal-import');
  const importStatus  = document.getElementById('import-status');
  const dropZone      = document.getElementById('drop-zone');
  const fileInput     = document.getElementById('file-input');
  const modalDropZone = document.getElementById('modal-drop-zone');
  const modalFileInput= document.getElementById('modal-file-input');
  const modalDropLabel= document.getElementById('modal-drop-label');
  const inputUrl      = document.getElementById('input-url');
  const inputPaste    = document.getElementById('input-paste');
  const tabBtns       = document.querySelectorAll('.tab-btn');
  const tabContents   = document.querySelectorAll('.tab-content');

  // ── Init ───────────────────────────────────────────────────────────────────
  Player.init(videoEl, msg => setStatus(msg, 'error'));
  allChannels = Storage.load();
  renderAll();

  // ── Channel rendering ──────────────────────────────────────────────────────
  function getGroups() {
    const groups = [...new Set(allChannels.map(c => c.group))];
    return ['Todos', ...groups.sort()];
  }

  function applyFilters() {
    const q = searchEl.value.trim().toLowerCase();
    filteredChannels = allChannels.filter(c => {
      const matchGroup = activeGroup === 'Todos' || c.group === activeGroup;
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }

  function renderGroupTabs() {
    groupTabs.innerHTML = '';
    getGroups().forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'group-tab' + (g === activeGroup ? ' active' : '');
      btn.textContent = g;
      btn.title = g;
      btn.addEventListener('click', () => {
        activeGroup = g;
        renderAll();
      });
      groupTabs.appendChild(btn);
    });
  }

  function renderChannelList() {
    channelList.innerHTML = '';
    if (!filteredChannels.length) {
      channelList.innerHTML = '<li class="empty-state">No se encontraron canales</li>';
      channelCount.textContent = '';
      return;
    }
    channelCount.textContent = filteredChannels.length + ' canales';

    filteredChannels.forEach((ch, idx) => {
      const li = document.createElement('li');
      li.className = 'channel-item' + (idx === activeIndex ? ' active' : '');
      li.dataset.idx = idx;

      if (ch.logo) {
        const img = document.createElement('img');
        img.className = 'channel-logo';
        img.src = ch.logo;
        img.alt = '';
        img.onerror = () => { img.replaceWith(placeholder(ch.name)); };
        li.appendChild(img);
      } else {
        li.appendChild(placeholder(ch.name));
      }

      const info = document.createElement('div');
      info.className = 'channel-info';
      info.innerHTML = `<div class="channel-name">${esc(ch.name)}</div><div class="channel-group">${esc(ch.group)}</div>`;
      li.appendChild(info);

      li.addEventListener('click', () => selectChannel(idx));
      channelList.appendChild(li);
    });
  }

  function placeholder(name) {
    const d = document.createElement('div');
    d.className = 'channel-logo-placeholder';
    d.textContent = name.charAt(0).toUpperCase();
    return d;
  }

  function renderAll() {
    applyFilters();
    renderGroupTabs();
    renderChannelList();
    if (!allChannels.length) {
      showOverlay(true);
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────
  function selectChannel(idx) {
    activeIndex = idx;
    const ch = filteredChannels[idx];
    showOverlay(false);
    Player.play(ch.url);
    nowTitle.textContent = ch.name;
    renderChannelList();
  }

  function showOverlay(show) {
    overlay.classList.toggle('visible', show);
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  function mergeChannels(newChannels) {
    const existingUrls = new Set(allChannels.map(c => c.url));
    const added = newChannels.filter(c => !existingUrls.has(c.url));
    allChannels = [...allChannels, ...added];
    Storage.save(allChannels);
    return added.length;
  }

  function importText(text) {
    if (!text || !text.includes('#EXTINF')) {
      setStatus('El texto no parece ser un archivo M3U válido.', 'error');
      return;
    }
    const channels = M3UParser.parse(text);
    if (!channels.length) {
      setStatus('No se encontraron canales en la lista.', 'error');
      return;
    }
    const added = mergeChannels(channels);
    activeGroup = 'Todos';
    renderAll();
    closeModal();
    setStatus(`✓ ${added} canales nuevos añadidos (${channels.length} total en la lista).`, 'success');
  }

  function importFromUrl(url) {
    if (!url) { setStatus('Ingresa una URL válida.', 'error'); return; }
    setStatus('Descargando lista...', 'loading');
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(text => importText(text))
      .catch(err => {
        setStatus('Error al descargar: ' + err.message + '. Intenta con la opción Archivo.', 'error');
      });
  }

  function importFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => importText(e.target.result);
    reader.readAsText(file, 'utf-8');
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  let activeTab = 'url';

  function openModal() {
    modal.classList.remove('hidden');
    importStatus.textContent = '';
    importStatus.className = '';
    inputUrl.value = '';
    inputPaste.value = '';
    modalDropLabel.textContent = 'Arrastra el archivo .m3u aquí o haz clic';
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  function setStatus(msg, cls) {
    importStatus.textContent = msg;
    importStatus.className = cls || '';
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + activeTab));
    });
  });

  btnImport.addEventListener('click', openModal);
  btnModalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  btnModalImport.addEventListener('click', () => {
    if (activeTab === 'url') importFromUrl(inputUrl.value.trim());
    else if (activeTab === 'paste') importText(inputPaste.value.trim());
    else if (activeTab === 'file') importFromFile(modalFileInput.files[0]);
  });

  modalFileInput.addEventListener('change', () => {
    if (modalFileInput.files[0]) modalDropLabel.textContent = '📄 ' + modalFileInput.files[0].name;
  });

  // drag-drop on modal drop zone
  ['dragenter','dragover'].forEach(evt => {
    modalDropZone.addEventListener(evt, e => { e.preventDefault(); modalDropZone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(evt => {
    modalDropZone.addEventListener(evt, e => { e.preventDefault(); modalDropZone.classList.remove('dragover'); });
  });
  modalDropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) { modalDropLabel.textContent = '📄 ' + file.name; importFromFile(file); }
  });

  // drag-drop on overlay
  ['dragenter','dragover'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
  });
  dropZone.addEventListener('drop', e => { importFromFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => importFromFile(fileInput.files[0]));

  // ── Controls ───────────────────────────────────────────────────────────────
  btnFullscreen.addEventListener('click', () => {
    const el = document.getElementById('player-wrapper');
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  btnPip.addEventListener('click', () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (videoEl.readyState) {
      videoEl.requestPictureInPicture().catch(() => {});
    }
  });

  btnMute.addEventListener('click', () => {
    videoEl.muted = !videoEl.muted;
    btnMute.textContent = videoEl.muted ? '🔇' : '🔊';
  });

  volumeSlider.addEventListener('input', () => {
    videoEl.volume = parseFloat(volumeSlider.value);
    videoEl.muted = videoEl.volume === 0;
    btnMute.textContent = videoEl.muted ? '🔇' : '🔊';
  });

  btnClear.addEventListener('click', () => {
    if (!confirm('¿Borrar todos los canales guardados?')) return;
    Storage.clear();
    allChannels = [];
    activeIndex = -1;
    Player.stop();
    nowTitle.textContent = 'Sin reproducción';
    showOverlay(true);
    renderAll();
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveChannel(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveChannel(-1); }
    if (e.key === ' ')         { e.preventDefault(); togglePlay(); }
    if (e.key === 'f' || e.key === 'F') btnFullscreen.click();
    if (e.key === 'm' || e.key === 'M') btnMute.click();
  });

  function moveChannel(delta) {
    if (!filteredChannels.length) return;
    const next = Math.max(0, Math.min(filteredChannels.length - 1, activeIndex + delta));
    if (next !== activeIndex) selectChannel(next);
  }

  function togglePlay() {
    if (videoEl.paused) videoEl.play().catch(() => {});
    else videoEl.pause();
  }

  searchEl.addEventListener('input', () => renderAll());

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
