(() => {
  const root = document.documentElement;
  const topbar = document.querySelector('.topbar');

  function sync() {
    if (!topbar) return;
    const rect = topbar.getBoundingClientRect();
    root.style.setProperty('--rw-topbar-bottom', `${Math.ceil(rect.bottom + 8)}px`);
    const ops = document.querySelector('#railwatch-ops-assurance');
    if (ops) {
      root.style.setProperty('--rw-ops-top', `${Math.floor(ops.getBoundingClientRect().top - 8)}px`);
      if (window.ResizeObserver && !sync.opsObserved) { sync.opsObserved = true; new ResizeObserver(sync).observe(ops); }
    }
  }

  window.addEventListener('resize', sync, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(sync).observe(topbar);
  sync();
  const opsTimer = setInterval(() => { if (document.querySelector('#railwatch-ops-assurance')) { sync(); clearInterval(opsTimer); } }, 400);
  setTimeout(() => clearInterval(opsTimer), 15000);
})();
