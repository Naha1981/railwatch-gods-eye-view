(() => {
  const stages = ['DETECT','LOCATE','VERIFY','RESPOND','RESOLVE','PROVE'];
  let current = 'DETECT';
  let currentIncidentId = null;

  function setStage(stage) {
    if (!stages.includes(stage) || stages.indexOf(stage) < stages.indexOf(current)) return;
    const changed = current !== stage;
    current = stage;
    window.RailWatchControlRoom?.setResolutionStage(stage);
    if (changed) document.dispatchEvent(new CustomEvent('railwatch:stage', {detail:{stage,source:'stage-progress'}}));
  }

  function advance(target) {
    const from = stages.indexOf(current);
    const to = stages.indexOf(target);
    if (to >= from) setStage(target);
  }

  document.addEventListener('click', event => {
    const el = event.target.closest('button, [role="button"]');
    if (!el) return;

    if (el.id === 'demo-alert') {
      setTimeout(() => advance('LOCATE'), 120);
      return;
    }

    if (el.matches('.asset-select')) {
      advance('VERIFY');
      return;
    }

    if (el.matches('[data-action="cctv"], [data-action="verify"]')) {
      advance('VERIFY');
      return;
    }

    if (el.id === 'cctv-verified') {
      advance('RESPOND');
      return;
    }

    if (el.matches('.dispatch-access-btn')) {
      advance('RESPOND');
      return;
    }

    if (el.id === 'dispatch-confirm') {
      setTimeout(() => advance('RESOLVE'), 120);
      return;
    }

    if (el.id === 'close-incident') {
      setTimeout(() => advance('PROVE'), 120);
    }
  });

  document.addEventListener('railwatch:incident', event => {
    const nextId = event.detail?.event_id;
    if (!nextId || nextId === currentIncidentId) return;
    currentIncidentId = nextId;
    current = 'DETECT';
  });
  document.addEventListener('railwatch:stage', event => {
    const stage = event.detail?.stage;
    if (stages.includes(stage) && stages.indexOf(stage) >= stages.indexOf(current)) current = stage;
  });

  window.RailWatchStageProgress = { setStage, advance };
})();
