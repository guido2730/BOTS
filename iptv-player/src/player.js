// Video player controller with HLS.js fallback for m3u8 streams
const Player = (() => {
  let video = null;
  let hlsInstance = null;
  let onErrorCb = null;

  // Dynamically load hls.js from a CDN only when needed (native HLS fails)
  function loadHlsJs(cb) {
    if (window.Hls) return cb();
    const script = document.createElement('script');
    // Using jsdelivr CDN — swap for a local copy if full offline operation is needed
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
    script.onload = cb;
    script.onerror = () => { console.error('No se pudo cargar hls.js'); };
    document.head.appendChild(script);
  }

  function destroyHls() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
  }

  function playNative(url) {
    destroyHls();
    video.src = url;
    video.load();
    video.play().catch(() => {});
  }

  function playWithHls(url) {
    loadHlsJs(() => {
      if (!window.Hls || !Hls.isSupported()) {
        if (onErrorCb) onErrorCb('Este navegador no soporta HLS y hls.js no está disponible.');
        return;
      }
      destroyHls();
      hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && onErrorCb) onErrorCb('Error HLS: ' + data.details);
      });
    });
  }

  function play(url) {
    if (!video) return;
    const isHls = url.includes('.m3u8') || url.includes('m3u8');
    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      playWithHls(url);
    } else {
      playNative(url);
    }
  }

  function stop() {
    destroyHls();
    if (video) { video.pause(); video.src = ''; }
  }

  function init(videoEl, errorCb) {
    video = videoEl;
    onErrorCb = errorCb;
  }

  return { init, play, stop };
})();
