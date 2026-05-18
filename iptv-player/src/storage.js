// Persistent storage using localStorage — no external server needed
const Storage = (() => {
  const KEY = 'iptv_channels_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(channels) {
    try {
      localStorage.setItem(KEY, JSON.stringify(channels));
    } catch (e) {
      console.warn('localStorage full, saving trimmed list');
      // trim logos to save space
      const slim = channels.map(c => ({ ...c, logo: '' }));
      localStorage.setItem(KEY, JSON.stringify(slim));
    }
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  return { load, save, clear };
})();
