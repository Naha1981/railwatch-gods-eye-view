/* Instant plain-language preview card for anything on the map: hover (desktop) or tap (phone). */
(function(){
  if(window.__rwPreview)return;window.__rwPreview=true;
  var card=document.createElement('div');card.id='rw-preview';card.setAttribute('role','status');document.body.appendChild(card);
  var pinned=false;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function infoOf(e){
    if(!e)return null;
    if(e.rwInfo)return e.rwInfo;
    var t=e.label&&e.label.text&&(e.label.text.getValue?e.label.text.getValue():e.label.text);
    var n=e.name||t;
    if(!n)return null;
    var d=e.description&&(e.description.getValue?e.description.getValue():e.description);
    return {title:String(n),kind:'Map item',rows:d?[['Details',String(d).replace(/<[^>]+>/g,' ').trim()]]:[]};
  }
  function show(i,x,y,tap){
    var rows=(i.rows||[]).map(function(r){return '<div><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'}).join('');
    card.innerHTML='<div class="rwp-head"><em>'+esc(i.kind||'')+'</em>'+(i.badge?'<i class="rwp-badge '+(i.badgeTone||'')+'">'+esc(i.badge)+'</i>':'')+(tap?'<button type="button" aria-label="Close">&times;</button>':'')+'</div><h3>'+esc(i.title)+'</h3>'+rows+(i.note?'<p>'+esc(i.note)+'</p>':'');
    card.className='on'+(tap?' tap':'');
    if(!tap){var w=card.offsetWidth,h=card.offsetHeight;card.style.left=Math.max(8,Math.min(innerWidth-w-8,x+14))+'px';card.style.top=Math.max(64,Math.min(innerHeight-h-8,y+14))+'px'}
    else{card.style.left='';card.style.top=''}
  }
  function hide(){card.className='';pinned=false}
  card.addEventListener('click',function(e){if(e.target.closest('button'))hide()});
  function bind(){
    if(typeof viewer==='undefined'||!viewer.canvas){return setTimeout(bind,500)}
    var cv=viewer.canvas;
    function pick(ev){var r=cv.getBoundingClientRect();var pos=new Cesium.Cartesian2(ev.clientX-r.left,ev.clientY-r.top);var p=viewer.scene.pick(pos);return {i:p&&p.id?infoOf(p.id):null,x:ev.clientX,y:ev.clientY}}
    cv.addEventListener('mousemove',function(ev){if(pinned||ev.pointerType==='touch')return;var h=pick(ev);if(h.i)show(h.i,h.x,h.y,false);else hide()});
    cv.addEventListener('click',function(ev){var h=pick(ev);if(h.i){pinned=true;show(h.i,h.x,h.y,matchMedia('(max-width:700px)').matches||('ontouchstart' in window))}else hide()});
  }
  bind();
  window.RailWatchPreview={hide:hide};
})();
