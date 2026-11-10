(() => {
  const VIDEO_MP4_URL = './media/railway-reference-1939.mp4';
  const SOURCE_URL = 'https://www.openbeelden.nl/media/55132/Opening_van_de_spoorwegtentoonstelling.en';
  let overlay;
  let loadingTimer;
  let returnFocus;
  let lastPlaybackTime = 0;
  function armDeadline() { if (!loadingTimer) loadingTimer = setTimeout(unavailable, 15000); }
  function clearLoadingTimer() { clearTimeout(loadingTimer); loadingTimer = undefined; }
  function unavailable() {
    if (!overlay?.classList.contains('visible')) return;
    clearLoadingTimer();
    overlay.querySelector('#rw-cctv-feed-status').textContent = 'REFERENCE VIDEO UNAVAILABLE - NOT VISUALLY VERIFIED';
    overlay.querySelector('#rw-cctv-feed-state').textContent = 'UNAVAILABLE';
    overlay.querySelector('#rw-cctv-availability').textContent = 'NOT VERIFIED';
    overlay.querySelector('#rw-cctv-availability').className = 'warning';
    overlay.querySelector('#rw-cctv-retry').hidden = false;
    overlay.querySelector('#rw-cctv-fallback').hidden = false;
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'railwatch-cctv-overlay';
    overlay.innerHTML = `
      <div class="rw-cctv-modal" role="dialog" aria-modal="true" aria-label="Recorded reference viewer">
        <div class="rw-cctv-head">
          <div>
            <div class="rw-cctv-eyebrow">RECORDED REFERENCE PLAYER · RAILWATCH</div>
            <div class="rw-cctv-title" id="rw-cctv-title">Camera evidence</div>
            <div class="rw-cctv-sub" id="rw-cctv-sub">HISTORIC EXAMPLE · NOT LIVE · NOT THIS INCIDENT</div>
          </div>
          <button class="rw-cctv-close" id="rw-cctv-close" type="button">CLOSE</button>
        </div>
        <div class="rw-cctv-stage">
          <video id="rw-cctv-video" controls autoplay muted loop playsinline preload="auto" poster="https://www.openbeelden.nl/images/598912/vlcsnap-208355.png">
            <source src="${VIDEO_MP4_URL}" type="video/mp4" />
            Your browser could not load the CCTV reference video.
          </video>
          <div class="rw-cctv-badge">HISTORIC REFERENCE ONLY</div>
          <div class="rw-cctv-rec">RECORDED SAMPLE · NOT LIVE</div>
          <div class="rw-cctv-overlayline"><span id="rw-cctv-location">RAIL CORRIDOR</span><span id="rw-cctv-time">VIEWED AT --:-- SAST</span></div>
          <div class="rw-cctv-feed-status" id="rw-cctv-feed-status">LOADING VIDEO…</div>
        </div>
        <div class="rw-cctv-recovery">
          <button id="rw-cctv-retry" type="button" hidden>Retry reference video</button>
          <button id="rw-cctv-details" type="button">Reference details / no-video alternative</button>
          <a href="${VIDEO_MP4_URL}" target="_blank" rel="noopener noreferrer">Open original video</a>
        </div>
        <section id="rw-cctv-fallback" class="rw-cctv-fallback" hidden aria-live="polite">
          <h3>No incident video is available here</h3>
          <p>This player offers a historic railway-exhibition example from Open Beelden. It does not show this incident or a current railway camera.</p>
          <p>If playback fails, use Retry or open the original video. The incident remains visually unverified. These details are not a replacement for footage.</p>
        </section>
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
    overlay.querySelector('#rw-cctv-details').addEventListener('click', () => { overlay.querySelector('#rw-cctv-fallback').hidden = false; });
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    const video = overlay.querySelector('#rw-cctv-video');
    video.querySelector('source').addEventListener('error', unavailable);
    video.addEventListener('playing', () => {
      armDeadline();
      overlay.querySelector('#rw-cctv-fallback').hidden = true;
      overlay.querySelector('#rw-cctv-retry').hidden = true;
      overlay.querySelector('#rw-cctv-feed-status').textContent = '● PLAYING REFERENCE FEED';
      overlay.querySelector('#rw-cctv-feed-state').textContent = 'PLAYING';
      overlay.querySelector('#rw-cctv-availability').textContent = 'VIDEO PLAYING';
      overlay.querySelector('#rw-cctv-availability').className = 'positive';
    });
    video.addEventListener('canplay', () => {
      // Ready is not playing. Keep a deadline until time actually advances.
      armDeadline();
      overlay.querySelector('#rw-cctv-retry').hidden = true;
      overlay.querySelector('#rw-cctv-availability').className = 'positive';
      overlay.querySelector('#rw-cctv-feed-status').textContent = 'READY · CLICK PLAY IF NEEDED';
      overlay.querySelector('#rw-cctv-feed-state').textContent = 'READY';
      overlay.querySelector('#rw-cctv-availability').textContent = 'VIDEO READY';
    });
    video.addEventListener('timeupdate', () => {
      if (!video.paused && video.currentTime > lastPlaybackTime) clearLoadingTimer();
      lastPlaybackTime = video.currentTime;
    });
    ['waiting', 'stalled'].forEach(name => video.addEventListener(name, () => {
      if (!overlay.classList.contains('visible') || video.paused) return;
      overlay.querySelector('#rw-cctv-feed-status').textContent = 'BUFFERING RECORDED REFERENCE - NOT INCIDENT EVIDENCE';
      armDeadline();
    }));
    video.addEventListener('pause', () => {
      if (!overlay.classList.contains('visible') || overlay.querySelector('#rw-cctv-feed-state').textContent === 'UNAVAILABLE') return;
      clearLoadingTimer();
      overlay.querySelector('#rw-cctv-feed-state').textContent = 'PAUSED';
      overlay.querySelector('#rw-cctv-feed-status').textContent = 'REFERENCE PAUSED - PRESS PLAY TO CONTINUE';
    });
    video.addEventListener('error', unavailable);
    return overlay;
  }

  function nowSast() {
    return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) + ' SAST';
  }

  function open() {
    returnFocus = document.activeElement;
    const root = ensureOverlay();
    const video = root.querySelector('#rw-cctv-video');
    root.querySelector('#rw-cctv-title').textContent = 'Railway camera example';
    root.querySelector('#rw-cctv-camera').textContent = 'REFERENCE ONLY';
    root.querySelector('#rw-cctv-asset').textContent = (document.querySelector('.incident-popover h2')?.textContent || 'RAIL ASSET').slice(0, 24).toUpperCase();
    root.querySelector('#rw-cctv-location').textContent = 'HISTORIC EXHIBITION · NOT INCIDENT LOCATION';
    root.querySelector('#rw-cctv-time').textContent = 'VIEWED AT ' + nowSast();
    clearLoadingTimer();
    root.querySelector('#rw-cctv-feed-status').textContent = 'LOADING REFERENCE VIDEO...';
    root.querySelector('#rw-cctv-feed-state').textContent = 'LOADING';
    root.querySelector('#rw-cctv-availability').textContent = 'VIDEO LOADING';
    root.querySelector('#rw-cctv-availability').className = 'warning';
    root.querySelector('#rw-cctv-retry').hidden = true;
    root.querySelector('#rw-cctv-fallback').hidden = true;
    root.classList.add('visible');
    document.body.classList.add('rw-reference-open');
    root.querySelector('#rw-cctv-close').focus();
    lastPlaybackTime = 0;
    armDeadline();
    video.load();
    video.currentTime = 0;
    video.play().catch(error => {
      if (!root.classList.contains('visible')) return;
      if (error?.name === 'NotAllowedError') {
        clearLoadingTimer();
        root.querySelector('#rw-cctv-feed-status').textContent = 'AUTOPLAY BLOCKED - PRESS PLAY OR OPEN THE ORIGINAL';
        root.querySelector('#rw-cctv-retry').hidden = false;
        root.querySelector('#rw-cctv-fallback').hidden = false;
      } else if (error?.name !== 'AbortError') unavailable();
    });
  }

  function close() {
    clearLoadingTimer();
    if (!overlay) return;
    const video = overlay.querySelector('#rw-cctv-video');
    overlay.classList.remove('visible');
    video.pause();
    document.body.classList.remove('rw-reference-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  const cameraButton = document.createElement('button');
  cameraButton.type = 'button';
  cameraButton.id = 'rw-cameras-open';
  cameraButton.textContent = 'Cameras';
  cameraButton.setAttribute('aria-label', 'Cameras - recorded reference example');
  cameraButton.addEventListener('click', open);
  document.body.appendChild(cameraButton);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.operator-btn[data-action="cctv"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!overlay?.classList.contains('visible')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const nodes = [...overlay.querySelectorAll('button,a[href],video[controls]')].filter(e => !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
  });
})();
