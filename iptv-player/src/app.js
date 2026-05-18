// Main application logic
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let allChannels     = [];
  let filteredChannels = [];
  let activeGroup     = 'Todos';
  let activeIndex     = -1;
  let activeChannel   = null;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const videoEl        = document.getElementById('video-player');
  const overlay        = document.getElementById('player-overlay');
  const npTitle        = document.getElementById('np-title');
  const npGroup        = document.getElementById('np-group');
  const npLogo         = document.getElementById('np-logo');
  const npLogoPlaceholder = document.getElementById('np-logo-placeholder');
  const channelList    = document.getElementById('channel-list');
  const groupTabs      = document.getElementById('group-tabs');
  const searchEl       = document.getElementById('search');
  const channelCount   = document.getElementById('channel-count');
  const btnImport      = document.getElementById('btn-import');
  const btnClear       = document.getElementById('btn-clear');
  const btnFullscreen  = document.getElementById('btn-fullscreen');
  const btnPip         = document.getElementById('btn-pip');
  const btnMute        = document.getElementById('btn-mute');
  const volumeSlider   = document.getElementById('volume-slider');
  const modal          = document.getElementById('modal-import');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalImport = document.getElementById('btn-modal-import');
  const btnConnLabel   = document.getElementById('btn-connect-label');
  const importStatus   = document.getElementById('import-status');
  const dropZone       = document.getElementById('drop-zone');
  const fileInput      = document.getElementById('file-input');
  const modalDropZone  = document.getElementById('modal-drop-zone');
  const modalFileInput = document.getElementById('modal-file-input');
  const modalDropLabel = document.getElementById('modal-drop-label');
  const inputUrl       = document.getElementById('input-url');
  const inputPaste     = document.getElementById('input-paste');
  const methodCards    = document.querySelectorAll('.method-card');
  const tabContents    = document.querySelectorAll('.tab-content');
  // Xtream fields
  const xcServer       = document.getElementById('xc-server');
  const xcUser         = document.getElementById('xc-user');
  const xcPass         = document.getElementById('xc-pass');
  const xcSave         = document.getElementById('xc-save');
  const xcSavedList    = document.getElementById('xtream-saved-list');
  const btnTogglePass  = document.getElementById('btn-toggle-pass');
  // Overlay shortcut buttons
  const overlayBtnXtream = document.getElementById('overlay-btn-xtream');

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
      const matchGroup  = activeGroup === 'Todos' || c.group === activeGroup;
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
      btn.addEventListener('click', () => { activeGroup = g; renderAll(); });
      groupTabs.appendChild(btn);
    });
  }

  function renderChannelList() {
    channelList.innerHTML = '';
    if (!filteredChannels.length) {
      const li = document.createElement('li');
      li.className = 'empty-state';
      li.innerHTML = allChannels.length
        ? '<p>Sin resultados para tu búsqueda</p>'
        : '<p>Agrega una lista para<br>empezar a ver canales</p>';
      channelList.appendChild(li);
      channelCount.textContent = '';
      return;
    }

    channelCount.textContent = filteredChannels.length.toLocaleString();

    filteredChannels.forEach((ch, idx) => {
      const li  = document.createElement('li');
      const isActive = idx === activeIndex;
      li.className = 'channel-item' + (isActive ? ' active' : '');

      // Logo or avatar
      if (ch.logo) {
        const img = document.createElement('img');
        img.className = 'ch-logo';
        img.src = ch.logo;
        img.alt = '';
        img.onerror = () => img.replaceWith(makeAvatar(ch.name));
        li.appendChild(img);
      } else {
        li.appendChild(makeAvatar(ch.name));
      }

      // Info
      const info = document.createElement('div');
      info.className = 'ch-info';
      info.innerHTML = `<div class="ch-name">${esc(ch.name)}</div><div class="ch-group">${esc(ch.group)}</div>`;
      li.appendChild(info);

      // Playing indicator
      if (isActive) {
        const dot = document.createElement('div');
        dot.className = 'ch-playing';
        dot.innerHTML = '<div class="ch-playing-dot"></div>';
        li.appendChild(dot);
      }

      li.addEventListener('click', () => selectChannel(idx));
      channelList.appendChild(li);
    });
  }

  function makeAvatar(name) {
    const d = document.createElement('div');
    d.className = 'ch-avatar';
    d.textContent = name.trim().charAt(0).toUpperCase() || '?';
    return d;
  }

  function renderAll() {
    applyFilters();
    renderGroupTabs();
    renderChannelList();
    showOverlay(!allChannels.length);
  }

  // ── Playback ───────────────────────────────────────────────────────────────
  function selectChannel(idx) {
    activeIndex = idx;
    activeChannel = filteredChannels[idx];
    showOverlay(false);
    Player.play(activeChannel.url);
    updateNowPlaying(activeChannel);
    renderChannelList();
    // scroll active item into view
    const el = channelList.querySelector('.channel-item.active');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function updateNowPlaying(ch) {
    npTitle.textContent = ch.name;
    npGroup.textContent = ch.group;
    if (ch.logo) {
      npLogo.src = ch.logo;
      npLogo.hidden = false;
      npLogoPlaceholder.hidden = true;
      npLogo.onerror = () => { npLogo.hidden = true; npLogoPlaceholder.hidden = false; };
    } else {
      npLogo.hidden = true;
      npLogoPlaceholder.hidden = false;
      npLogoPlaceholder.textContent = ch.name.charAt(0).toUpperCase();
    }
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
    setStatus(`${added} canales nuevos añadidos.`, 'success');
  }

  function importFromUrl(url) {
    if (!url) { setStatus('Ingresa una URL válida.', 'error'); return; }
    setStatus('Descargando lista…', 'loading');
    setBusy(true);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(text => importText(text))
      .catch(err => setStatus('Error: ' + err.message + ' — intenta con archivo local.', 'error'))
      .finally(() => setBusy(false));
  }

  function importFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => importText(e.target.result);
    reader.readAsText(file, 'utf-8');
  }

  // ── Xtream Codes ───────────────────────────────────────────────────────────
  function xcNorm(raw) {
    let s = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    return s;
  }

  function xcTypes() {
    return [...document.querySelectorAll('input[name="xc-type"]:checked')].map(el => el.value);
  }

  async function xcConnect(server, user, pass) {
    setStatus('Verificando credenciales…', 'loading');
    setBusy(true);

    let info;
    try {
      const res = await fetch(`${server}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      info = await res.json();
      if (!info.user_info) throw new Error('Respuesta inesperada');
      if (info.user_info.auth === 0) throw new Error('Usuario o contraseña incorrectos');
    } catch (err) {
      setStatus('Error de conexión: ' + err.message, 'error');
      setBusy(false);
      return;
    }

    const exp = info.user_info.exp_date
      ? new Date(parseInt(info.user_info.exp_date, 10) * 1000).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    setStatus(`Conectado · Vence: ${exp} · Descargando canales…`, 'loading');

    const types = xcTypes();
    if (!types.length) { setStatus('Selecciona al menos un tipo.', 'error'); setBusy(false); return; }

    try {
      const m3uUrl = `${server}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus&output=ts`;
      const res = await fetch(m3uUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const channels = M3UParser.parse(text);
      if (!channels.length) { setStatus('No se encontraron canales.', 'error'); setBusy(false); return; }

      if (xcSave.checked) {
        Storage.saveAccount({ server, user, pass, types, label: info.user_info.username || user });
        renderSavedAccounts();
      }

      const added = mergeChannels(channels);
      activeGroup = 'Todos';
      renderAll();
      closeModal();
      setStatus(`${added} canales nuevos importados.`, 'success');
    } catch (err) {
      setStatus('Error al descargar lista: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function renderSavedAccounts() {
    const accounts = Storage.loadAccounts();
    xcSavedList.innerHTML = '';
    if (!accounts.length) {
      xcSavedList.innerHTML = '<span class="no-accounts">Ninguna cuenta guardada aún</span>';
      return;
    }
    accounts.forEach(acc => {
      const row  = document.createElement('div');
      row.className = 'xc-account-row';

      const icon = document.createElement('div');
      icon.className = 'xc-acc-icon';
      icon.textContent = (acc.label || acc.user).charAt(0).toUpperCase();

      const btn = document.createElement('button');
      btn.className = 'xc-account-btn';
      const host = (() => { try { return new URL(acc.server).host; } catch { return acc.server; } })();
      btn.textContent = `${acc.label || acc.user}  ·  ${host}`;
      btn.title = 'Cargar esta cuenta';
      btn.addEventListener('click', () => {
        xcServer.value = acc.server;
        xcUser.value   = acc.user;
        xcPass.value   = acc.pass;
        document.querySelectorAll('input[name="xc-type"]').forEach(cb => {
          cb.checked = acc.types ? acc.types.includes(cb.value) : cb.value === 'live';
        });
      });

      const del = document.createElement('button');
      del.className = 'xc-account-del';
      del.innerHTML = '&times;';
      del.title = 'Eliminar';
      del.addEventListener('click', () => {
        Storage.deleteAccount(acc.server, acc.user);
        renderSavedAccounts();
      });

      row.appendChild(icon);
      row.appendChild(btn);
      row.appendChild(del);
      xcSavedList.appendChild(row);
    });
  }

  btnTogglePass.addEventListener('click', () => {
    const show = xcPass.type === 'password';
    xcPass.type = show ? 'text' : 'password';
    document.getElementById('icon-eye').innerHTML = show
      ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  });

  // ── Modal ──────────────────────────────────────────────────────────────────
  let activeTab = 'xtream';

  const connectLabels = {
    xtream: 'Conectar',
    url:    'Importar',
    file:   'Importar',
    paste:  'Importar',
  };

  function openModal(defaultTab) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    importStatus.textContent = '';
    importStatus.className = '';
    inputUrl.value = '';
    inputPaste.value = '';
    modalDropLabel.textContent = 'Arrastra tu archivo .m3u aquí';
    renderSavedAccounts();
    if (defaultTab) switchTab(defaultTab);
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    setBusy(false);
  }

  function setStatus(msg, cls) {
    importStatus.textContent = msg;
    importStatus.className = cls || '';
  }

  function setBusy(busy) {
    btnModalImport.disabled = busy;
    btnModalImport.classList.toggle('loading', busy);
  }

  function switchTab(tab) {
    activeTab = tab;
    methodCards.forEach(c => c.classList.toggle('active', c.dataset.tab === tab));
    tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
    btnConnLabel.textContent = connectLabels[tab] || 'Importar';
  }

  methodCards.forEach(card => {
    card.addEventListener('click', () => switchTab(card.dataset.tab));
  });

  btnImport.addEventListener('click', () => openModal('xtream'));
  overlayBtnXtream.addEventListener('click', () => openModal('xtream'));
  btnModalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  btnModalImport.addEventListener('click', () => {
    if (activeTab === 'xtream') {
      const server = xcNorm(xcServer.value);
      const user   = xcUser.value.trim();
      const pass   = xcPass.value;
      if (!xcServer.value || !user || !pass) {
        setStatus('Completa servidor, usuario y contraseña.', 'error');
        return;
      }
      xcConnect(server, user, pass);
    } else if (activeTab === 'url') {
      importFromUrl(inputUrl.value.trim());
    } else if (activeTab === 'paste') {
      importText(inputPaste.value.trim());
    } else if (activeTab === 'file') {
      importFromFile(modalFileInput.files[0]);
    }
  });

  modalFileInput.addEventListener('change', () => {
    if (modalFileInput.files[0]) {
      modalDropLabel.textContent = '📄 ' + modalFileInput.files[0].name;
    }
  });

  // Drag-drop modal
  ['dragenter','dragover'].forEach(e => {
    modalDropZone.addEventListener(e, ev => { ev.preventDefault(); modalDropZone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(e => {
    modalDropZone.addEventListener(e, ev => { ev.preventDefault(); modalDropZone.classList.remove('dragover'); });
  });
  modalDropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) { modalDropLabel.textContent = '📄 ' + file.name; importFromFile(file); }
  });

  // Drag-drop overlay
  ['dragenter','dragover'].forEach(e => {
    dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(e => {
    dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.remove('dragover'); });
  });
  dropZone.addEventListener('drop', e => { importFromFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => importFromFile(fileInput.files[0]));

  // ── Controls ───────────────────────────────────────────────────────────────
  btnFullscreen.addEventListener('click', () => {
    const wrap = document.getElementById('player-wrapper');
    if (!document.fullscreenElement) wrap.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  btnPip.addEventListener('click', () => {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else if (videoEl.readyState) videoEl.requestPictureInPicture().catch(() => {});
  });

  btnMute.addEventListener('click', () => {
    videoEl.muted = !videoEl.muted;
    updateMuteIcon();
  });

  volumeSlider.addEventListener('input', () => {
    videoEl.volume = parseFloat(volumeSlider.value);
    videoEl.muted  = videoEl.volume === 0;
    updateMuteIcon();
  });

  function updateMuteIcon() {
    const muted = videoEl.muted || videoEl.volume === 0;
    document.getElementById('icon-vol').innerHTML = muted
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
      : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>';
  }

  btnClear.addEventListener('click', () => {
    if (!confirm('¿Borrar todos los canales y cuentas guardadas?')) return;
    Storage.clear();
    Storage.clearAccounts();
    allChannels    = [];
    activeIndex    = -1;
    activeChannel  = null;
    Player.stop();
    npTitle.textContent = 'Sin reproducción';
    npGroup.textContent = '';
    showOverlay(true);
    renderAll();
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (modal && !modal.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveChannel(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveChannel(-1); }
    if (e.key === ' ')         { e.preventDefault(); togglePlay(); }
    if (e.key === 'f' || e.key === 'F') btnFullscreen.click();
    if (e.key === 'm' || e.key === 'M') btnMute.click();
    if (e.key === 'Escape') closeModal();
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

  searchEl.addEventListener('input', () => { activeIndex = -1; renderAll(); });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
