// Main application logic
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let allChannels = [];
  let filteredChannels = [];
  let activeGroup = 'Todos';
  let activeIndex = -1;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const videoEl         = document.getElementById('video-player');
  const overlay         = document.getElementById('player-overlay');
  const nowTitle        = document.getElementById('now-title');
  const channelList     = document.getElementById('channel-list');
  const groupTabs       = document.getElementById('group-tabs');
  const searchEl        = document.getElementById('search');
  const channelCount    = document.getElementById('channel-count');
  const btnImport       = document.getElementById('btn-import');
  const btnClear        = document.getElementById('btn-clear');
  const btnFullscreen   = document.getElementById('btn-fullscreen');
  const btnPip          = document.getElementById('btn-pip');
  const btnMute         = document.getElementById('btn-mute');
  const volumeSlider    = document.getElementById('volume-slider');
  const modal           = document.getElementById('modal-import');
  const btnModalCancel  = document.getElementById('btn-modal-cancel');
  const btnModalImport  = document.getElementById('btn-modal-import');
  const importStatus    = document.getElementById('import-status');
  const dropZone        = document.getElementById('drop-zone');
  const fileInput       = document.getElementById('file-input');
  const modalDropZone   = document.getElementById('modal-drop-zone');
  const modalFileInput  = document.getElementById('modal-file-input');
  const modalDropLabel  = document.getElementById('modal-drop-label');
  const inputUrl        = document.getElementById('input-url');
  const inputPaste      = document.getElementById('input-paste');
  const tabBtns         = document.querySelectorAll('.tab-btn');
  const tabContents     = document.querySelectorAll('.tab-content');
  // Xtream Codes fields
  const xcServer        = document.getElementById('xc-server');
  const xcUser          = document.getElementById('xc-user');
  const xcPass          = document.getElementById('xc-pass');
  const xcSave          = document.getElementById('xc-save');
  const xcSavedList     = document.getElementById('xtream-saved-list');
  const btnTogglePass   = document.getElementById('btn-toggle-pass');

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

  // ── Xtream Codes ───────────────────────────────────────────────────────────
  function xcNormalizeServer(raw) {
    let s = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    return s;
  }

  function xcBuildM3uUrl(server, user, pass) {
    return `${server}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus&output=ts`;
  }

  function xcGetSelectedTypes() {
    return [...document.querySelectorAll('input[name="xc-type"]:checked')].map(el => el.value);
  }

  async function xcConnect(server, user, pass) {
    setStatus('Verificando cuenta...', 'loading');

    // 1. Verify credentials via player_api
    let info;
    try {
      const apiUrl = `${server}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      info = await res.json();
      if (!info.user_info) throw new Error('Respuesta inesperada del servidor');
      if (info.user_info.auth === 0) throw new Error('Usuario o contraseña incorrectos');
    } catch (err) {
      setStatus('Error de conexión: ' + err.message, 'error');
      return;
    }

    const exp = info.user_info.exp_date
      ? new Date(parseInt(info.user_info.exp_date, 10) * 1000).toLocaleDateString()
      : 'sin fecha';
    setStatus(`Conectado como "${info.user_info.username}" · vence ${exp} · cargando canales...`, 'loading');

    // 2. Fetch M3U playlist
    const types = xcGetSelectedTypes();
    if (!types.length) { setStatus('Selecciona al menos un tipo de contenido.', 'error'); return; }

    const typeParam = types.includes('live') && types.length === 1 ? 'live'
                    : types.includes('vod')  && types.length === 1 ? 'vod'
                    : 'all';
    // m3u_plus gives extended #EXTINF with all metadata
    const m3uUrl = `${server}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus&output=ts`;
    try {
      const res = await fetch(m3uUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();

      let channels = M3UParser.parse(text);

      // filter by selected types using group naming heuristic if not all
      if (typeParam !== 'all') {
        channels = channels.filter(c => {
          if (types.includes('live') && !types.includes('vod') && !types.includes('series')) return true;
          return true; // full m3u_plus already filtered server-side when possible
        });
      }

      if (!channels.length) { setStatus('No se encontraron canales.', 'error'); return; }

      if (xcSave.checked) {
        Storage.saveAccount({ server, user, pass, types, label: info.user_info.username || user });
        renderSavedAccounts();
      }

      const added = mergeChannels(channels);
      activeGroup = 'Todos';
      renderAll();
      closeModal();
      setStatus(`✓ ${added} canales nuevos · ${channels.length} total importados.`, 'success');
    } catch (err) {
      setStatus('Error al descargar lista: ' + err.message, 'error');
    }
  }

  function renderSavedAccounts() {
    const accounts = Storage.loadAccounts();
    xcSavedList.innerHTML = '';
    if (!accounts.length) {
      xcSavedList.innerHTML = '<span class="muted-note">Ninguna cuenta guardada</span>';
      return;
    }
    accounts.forEach(acc => {
      const row = document.createElement('div');
      row.className = 'xc-account-row';

      const info = document.createElement('button');
      info.className = 'xc-account-btn';
      const host = (() => { try { return new URL(acc.server).host; } catch { return acc.server; } })();
      info.textContent = `${acc.label || acc.user} @ ${host}`;
      info.title = 'Cargar esta cuenta';
      info.addEventListener('click', () => {
        xcServer.value = acc.server;
        xcUser.value   = acc.user;
        xcPass.value   = acc.pass;
        // restore type checkboxes
        document.querySelectorAll('input[name="xc-type"]').forEach(cb => {
          cb.checked = acc.types ? acc.types.includes(cb.value) : cb.value === 'live';
        });
      });

      const del = document.createElement('button');
      del.className = 'xc-account-del';
      del.textContent = '✕';
      del.title = 'Eliminar cuenta guardada';
      del.addEventListener('click', () => {
        Storage.deleteAccount(acc.server, acc.user);
        renderSavedAccounts();
      });

      row.appendChild(info);
      row.appendChild(del);
      xcSavedList.appendChild(row);
    });
  }

  btnTogglePass.addEventListener('click', () => {
    xcPass.type = xcPass.type === 'password' ? 'text' : 'password';
    btnTogglePass.textContent = xcPass.type === 'password' ? '👁' : '🙈';
  });

  // ── Modal ──────────────────────────────────────────────────────────────────
  let activeTab = 'xtream';

  function openModal() {
    modal.classList.remove('hidden');
    importStatus.textContent = '';
    importStatus.className = '';
    inputUrl.value = '';
    inputPaste.value = '';
    modalDropLabel.textContent = 'Arrastra el archivo .m3u aquí o haz clic';
    renderSavedAccounts();
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
    if (activeTab === 'xtream') {
      const server = xcNormalizeServer(xcServer.value);
      const user   = xcUser.value.trim();
      const pass   = xcPass.value;
      if (!server || !user || !pass) { setStatus('Completa servidor, usuario y contraseña.', 'error'); return; }
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
