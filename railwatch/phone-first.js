(function(){
  if(window.__rwPhone)return;window.__rwPhone=true;
  var bar=document.createElement('nav');bar.className='rw-bar';bar.setAttribute('aria-label','RailWatch actions');
  var defs=[['primary','Report incident',null],['','Menu','menu'],['','Assets','assets'],['','Evidence','evidence']];
  defs.forEach(function(d){var b=document.createElement('button');b.type='button';b.className=d[0];b.textContent=d[1];
    b.addEventListener('click',function(){
      if(!d[2]){var s=document.getElementById('demo-alert');if(s)s.click();closeAll();document.body.classList.add('rw-open-guide');return;}
      var cls='rw-open-'+d[2];var was=document.body.classList.contains(cls);closeAll();if(!was)document.body.classList.add(cls);sync();
    });bar.appendChild(b);});
  function closeAll(){['menu','assets','evidence','guide'].forEach(function(n){document.body.classList.remove('rw-open-'+n)});sync();}
  function sync(){var bs=bar.querySelectorAll('button');['','menu','assets','evidence'].forEach(function(n,i){if(i)bs[i].classList.toggle('on',document.body.classList.contains('rw-open-'+n))});}
  document.body.appendChild(bar);
  document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('#panel button, aside.panel button')&&t.id!=='demo-alert')setTimeout(closeAll,50);});
})();
