(() => {
  const VIDEO_MP4_URL = 'https://www.openbeelden.nl/files/55/55145.55131.WEEKNUMMER393-HRE0002A506.mp4';
  const SOURCE_URL = 'https://www.openbeelden.nl/media/55132/Opening_van_de_spoorwegtentoonstelling.en';
  let overlay;
  let loadingTimer;
  function clearLoadingTimer() { clearTimeout(loadingTimer); loadingTimer = undefined; }
  function unavailable() {
    if (!overlay?.classList.contains('visible')) return;
    clearLoadingTimer();
    overlay.querySelector('#rw-cctv-feed-status').textContent = 'REFERENCE VIDEO UNAVAILABLE - NOT VISUALLY VERIFIED';
    overlay.querySelector('#rw-cctv-feed-state').textContent = 'UNAVAILABLE';
    overlay.querySelector('#rw-cctv-availability').textContent = 'NOT VERIFIED';
    overlay.querySelector('#rw-cctv-availability').className = 'warning';
    overlay.querySelector('#rw-cctv-retry').hidden = false;
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'railwatch-cctv-overlay';
    overlay.innerHTML = `
      <div class="rw-cctv-modal" role="dialog" aria-modal="true" aria-label="CCTV evidence viewer">
        <div class="rw-cctv-head">
          <div>
            <div class="rw-cctv-eyebrow">EVIDENCE VIEWER · RAILWATCH</div>
            <div class="rw-cctv-title" id="rw-cctv-title">Camera evidence</div>
            <div class="rw-cctv-sub" id="rw-cctv-sub">REFERENCE FOOTAGE · NOT A LIVE TRANSNET CAMERA</div>
          </div>
          <button class="rw-cctv-close" id="rw-cctv-close" type="button">CLOSE</button>
        </div>
        <div class="rw-cctv-stage">
          <video id="rw-cctv-video" controls autoplay muted loop playsinline preload="auto" poster="https://www.openbeelden.nl/images/598912/vlcsnap-208355.png">
            <source src="${VIDEO_MP4_URL}" type="video/mp4" />
            Your browser could not load the CCTV reference video.
          </video>
          <div class="rw-cctv-badge">SAMPLE EVIDENCE</div>
          <div class="rw-cctv-rec">RECORDED SAMPLE · NOT LIVE</div>
          <div class="rw-cctv-overlayline"><span id="rw-cctv-location">RAIL CORRIDOR</span><span id="rw-cctv-time">--:--:-- SAST</span></div>
          <div class="rw-cctv-feed-status" id="rw-cctv-feed-status">LOADING VIDEO…</div>
        </div>
        <button id="rw-cctv-retry" type="button" hidden>Retry reference video</button>
        <div class="rw-cctv-caption"><span class="positive" id="rw-cctv-availability">VIDEO LOADING</span><span>REFERENCE ONLY · NOT VERIFICATION</span></div>
        <div class="rw-cctv-grid">
          <div class="rw-cctv-kpi high"><span>INCIDENT</span><strong id="rw-cctv-incident">CRITICAL</strong></div>
          <div class="rw-cctv-kpi high"><span>CAMERA</span><strong id="rw-cctv-camera">SAMPLE-CAM-0142</strong></div>
          <div class="rw-cctv-kpi medium"><span>ASSET</span><strong id="rw-cctv-asset">TRACK</strong></div>
          <div class="rw-cctv-kpi good"><span>FEED STATE</span><strong id="rw-cctv-feed-state">LOADING</strong></div>
        </div>
        <div class="rw-cctv-note"><b>Note:</b> this is recorded railway reference footage, not a live Transnet security camera. Production would replace it with an authorised HLS/WebRTC CCTV feed or recorded clip.</div>
        <div class="rw-cctv-source">Source: Open Beelden · Public Domain Mark · <a href="${SOURCE_URL}" target="_blank" rel="noreferrer">view source and licence</a></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#rw-cctv-close').addEventListener('click', close);
    overlay.querySelector('#rw-cctv-retry').addEventListener('click', open);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    const video = overlay.querySelector('#rw-cctv-video');
    video.querySelector('source').addEventListener('error', unavailable);
    video.addEventListener('playing', () => {
      clearLoadingTimer();
      overlay.querySelector('#rw-cctv-retry').hidden = true;
      overlay.querySelector('#rw-cctv-feed-status').textContent = '● PLAYING REFERENCE FEED';
      overlay.querySelector('#rw-cctv-feed-state').textContent = 'PLAYING';
      overlay.querySelector('#rw-cctv-availability').textContent = 'VIDEO PLAYING';
      overlay.querySelector('#rw-cctv-availability').className = 'positive';
    });
    video.addEventListener('canplay', () => {
      clearLoadingTimer();
      overlay.querySelector('#rw-cctv-retry').hidden = true;
      overlay.querySelector('#rw-cctv-availability').className = 'positive';
      overlay.querySelector('#rw-cctv-feed-status').textContent = 'READY · CLICK PLAY IF NEEDED';
      overlay.querySelector('#rw-cctv-feed-state').textContent = 'READY';
      overlay.querySelector('#rw-cctv-availability').textContent = 'VIDEO READY';
    });
    video.addEventListener('error', unavailable);
    return overlay;
  }

  function nowSast() {
    return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) + ' SAST';
  }

  function open() {
    const root = ensureOverlay();
    const video = root.querySelector('#rw-cctv-video');
    root.querySelector('#rw-cctv-title').textContent = 'CCTV evidence · visual verification';
    root.querySelector('#rw-cctv-camera').textContent = 'SAMPLE-CAM-0142';
    root.querySelector('#rw-cctv-asset').textContent = (document.querySelector('.incident-popover h2')?.textContent || 'RAIL ASSET').slice(0, 24).toUpperCase();
    root.querySelector('#rw-cctv-location').textContent = 'RAIL CORRIDOR · SAMPLE SECTOR';
    root.querySelector('#rw-cctv-time').textContent = nowSast();
    clearLoadingTimer();
    root.querySelector('#rw-cctv-feed-status').textContent = 'LOADING REFERENCE VIDEO...';
    root.querySelector('#rw-cctv-feed-state').textContent = 'LOADING';
    root.querySelector('#rw-cctv-availability').textContent = 'VIDEO LOADING';
    root.querySelector('#rw-cctv-availability').className = 'warning';
    root.querySelector('#rw-cctv-retry').hidden = true;
    root.classList.add('visible');
    loadingTimer = setTimeout(unavailable, 15000);
    video.load();
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  function close() {
    clearLoadingTimer();
    if (!overlay) return;
    const video = overlay.querySelector('#rw-cctv-video');
    video.pause();
    overlay.classList.remove('visible');
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.operator-btn[data-action="cctv"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
})();
