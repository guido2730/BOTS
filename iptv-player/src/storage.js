// Persistent storage using localStorage — no external server needed
const Storage = (() => {
  const KEY_CH  = 'iptv_channels_v1';
  const KEY_XC  = 'iptv_xtream_accounts_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY_CH);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(channels) {
    try {
      localStorage.setItem(KEY_CH, JSON.stringify(channels));
    } catch {
      console.warn('localStorage full, saving trimmed list');
      const slim = channels.map(c => ({ ...c, logo: '' }));
      localStorage.setItem(KEY_CH, JSON.stringify(slim));
    }
  }

  function clear() {
    localStorage.removeItem(KEY_CH);
  }

  // ── Xtream accounts ────────────────────────────────────────────────────────
  function loadAccounts() {
    try {
      const raw = localStorage.getItem(KEY_XC);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveAccount(account) {
    const accounts = loadAccounts();
    // deduplicate by server+user
    const idx = accounts.findIndex(a => a.server === account.server && a.user === account.user);
    if (idx !== -1) accounts[idx] = account;
    else accounts.push(account);
    localStorage.setItem(KEY_XC, JSON.stringify(accounts));
  }

  function deleteAccount(server, user) {
    const accounts = loadAccounts().filter(a => !(a.server === server && a.user === user));
    localStorage.setItem(KEY_XC, JSON.stringify(accounts));
  }

  function clearAccounts() {
    localStorage.removeItem(KEY_XC);
  }

  return { load, save, clear, loadAccounts, saveAccount, deleteAccount, clearAccounts };
})();
