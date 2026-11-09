(function(){
  if(window.__rwPhone)return;window.__rwPhone=true;
  var bar=document.createElement('nav');bar.className='rw-bar';bar.setAttribute('aria-label','RailWatch actions');
  var defs=[['primary','Report incident','report'],['','Menu','menu'],['','Assets','assets'],['','Evidence','evidence'],['','Ops','ops']];
  defs.forEach(function(d){var b=document.createElement('button');b.type='button';b.className=d[0];b.textContent=d[1];
    b.setAttribute('data-k',d[2]);b.addEventListener('click',function(){
      if(d[2]==='report'){closeAll();if(window.RailWatchDesk)window.RailWatchDesk.newReport();return;}
      var cls='rw-open-'+d[2];if(d[2]==='evidence'){var o=document.body.classList.contains('rw-open-desk');closeAll();if(!o&&window.RailWatchDesk)window.RailWatchDesk.open();sync();return;}var was=document.body.classList.contains(cls);closeAll();if(!was)document.body.classList.add(cls);sync();
    });bar.appendChild(b);});
  function closeAll(){if(matchMedia('(max-width:700px)').matches){window.RailWatchWorkspace?.close();document.querySelectorAll('.dispatch-intelligence,.resolution-intelligence,#railwatch-cctv-overlay,.ai-intelligence-panel').forEach(function(n){n.classList.remove('visible','rw-workspace-active')});}['menu','assets','desk','guide','ops'].forEach(function(n){document.body.classList.remove('rw-open-'+n)});sync();}
  function sync(){var bs=bar.querySelectorAll('button');['','menu','assets','desk','ops'].forEach(function(n,i){if(i&&bs[i])bs[i].classList.toggle('on',document.body.classList.contains('rw-open-'+n))});}
  document.body.appendChild(bar);
  document.addEventListener('railwatch:workspace-opened',function(){if(matchMedia('(max-width:700px)').matches){['menu','assets','desk','guide','ops'].forEach(function(n){document.body.classList.remove('rw-open-'+n)});sync();}},true);
  document.getElementById('demo-alert')?.addEventListener('click',function(){if(matchMedia('(max-width:700px)').matches){document.body.classList.remove('rw-open-menu');sync();}});

  document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('#panel button, aside.panel button')&&t.id!=='demo-alert')setTimeout(function(){if(matchMedia('(max-width:700px)').matches){document.body.classList.remove('rw-open-menu');sync();}else closeAll();},50);});
})();
