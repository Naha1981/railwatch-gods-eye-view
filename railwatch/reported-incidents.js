/* RailWatch reported incidents: a signed-in organisation's own sealed, reported cases shown on the
   command map and in the alert feed. Real user-supplied data only - never mixed with the synthetic demo.
   Refresh is manual or on focus/return to the tab; no background polling. */
(function(){
  var API=window.RAILWATCH_API||'https://railwatch-api.nahalabs.workers.dev';
  var SECTION_ID='rw-reported-section';
  function creds(){var t=localStorage.getItem('rw.tok'),c=localStorage.getItem('rw.ws');return (t&&c)?{t:t,c:c}:null}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function clearOld(){
    try{if(typeof viewer!=='undefined'&&window.__rwReportedIds)window.__rwReportedIds.forEach(function(id){viewer.entities.removeById(id)})}catch(e){}
    window.__rwReportedIds=[];
    var old=document.getElementById(SECTION_ID);if(old)old.remove();
  }
  function render(events){
    clearOld();
    var feed=document.getElementById('alert-feed');if(!feed)return;
    var sec=document.createElement('div');sec.id=SECTION_ID;
    if(!events.length){sec.innerHTML='<article class="alert" style="cursor:default;border-color:rgba(245,184,66,.35)"><div class="alert-severity" style="color:#f5b86b">REPORTED BY YOUR ORGANISATION</div><strong>No reported incidents yet</strong><span>Use Report incident to add the first real case.</span></article>';feed.prepend(sec);return}
    var head=document.createElement('article');head.className='alert';head.style.cursor='default';
    head.innerHTML='<div class="alert-severity" style="color:#f5b86b">REPORTED BY YOUR ORGANISATION · '+events.length+'</div><strong>Sealed incidents reported in the field</strong><span>Real cases from your Evidence desk. Click one to fly to it.</span>';
    if(window.matchMedia&&matchMedia('(max-width:1050px)').matches){
      sec.classList.add('rw-feed-collapsible');
      head.style.cursor='pointer';
      head.addEventListener('click',function(){sec.classList.toggle('open');head.querySelector('span').textContent='Real cases from your Evidence desk. Tap to '+(sec.classList.contains('open')?'hide':'view')+'.'});
      head.querySelector('span').textContent='Real cases from your Evidence desk. Tap to view.';
    }
    sec.appendChild(head);
    events.slice(0,20).forEach(function(c){
      var when='';try{when=new Date(c.occurred).toLocaleString()}catch(e){}
      var row=document.createElement('article');row.className='alert';row.style.borderColor='rgba(245,184,66,.35)';
      var responded=c.arrived||stageList(c).some(function(x){return x&&x.stage==='RESPOND'});
      row.classList.add('rw-rep-row');
      row.innerHTML='<div class="alert-severity" style="color:#f5b86b">REPORTED · '+(responded?'RESPONSE LOGGED':'AWAITING RESPONSE')+'</div><strong>'+esc(c.type)+' · '+esc(c.place||'reported location')+'</strong><span>'+esc(when)+' · seal '+esc(String(c.seal||'').slice(0,10))+'...</span><small>'+esc((c.desc||'').slice(0,90))+'</small>';
      row.addEventListener('click',function(){flyTo(c);openCase(c)});
      sec.appendChild(row);
      try{
        var pos=Cesium.Cartesian3.fromDegrees(Number(c.lon),Number(c.lat),6);
        var pin=viewer.entities.add({id:'rw-rep-'+c.id,position:pos,
          point:{pixelSize:14,color:Cesium.Color.fromCssColorString('#f5b86b'),outlineColor:Cesium.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},
          label:{text:'REPORTED · '+String(c.type||'').toUpperCase().slice(0,28),font:'700 11px ui-monospace,monospace',showBackground:true,backgroundColor:Cesium.Color.fromAlpha(Cesium.Color.fromCssColorString('#8a6a1f'),.85),fillColor:Cesium.Color.WHITE,pixelOffset:new Cesium.Cartesian2(0,-26),disableDepthTestDistance:Number.POSITIVE_INFINITY}});
        window.__rwReportedIds.push('rw-rep-'+c.id);
      }catch(e){}
    });
    feed.prepend(sec);
  }
  function flyTo(c){
    try{viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(Number(c.lon),Number(c.lat),4000),duration:1.6})}catch(e){}
  }
  // ---- Real sealed case panel with response-stage actions -----------------
  // These buttons write to the organisation's shared, sealed case record through
  // the cases API (append-only stages). They are completely separate from the
  // synthetic INCIDENT CONTROL / OPERATOR ASSURANCE rehearsal buttons, which
  // never touch real cases.
  var STAGES=['ACKNOWLEDGE','VERIFY','DISPATCH','RESPOND','RESOLVE','PROVE'];
  var panel=null,current=null;
  function closeCase(){if(panel){panel.remove();panel=null;current=null}}
  function stageList(c){return Array.isArray(c.stages)?c.stages:[]}
  function hasStage(c,s){return stageList(c).some(function(x){return x&&x.stage===s})}
  function panelHtml(c){
    var st=stageList(c);
    var timeline=st.length?st.map(function(x){
      var when='';try{when=new Date(x.at).toLocaleString()}catch(e){}
      var trust=x.verified?'<i class="rwcp-verified">verified by the server</i>':(x.legacy?'<i class="rwcp-legacy">LEGACY - recorded by the app before server verification; not server-verified</i>':'<i class="rwcp-legacy">not server-verified</i>');
      return '<div class="rwcp-stage done"><b>'+esc(x.stage)+trust+'</b><span>'+esc(when)+(x.by?' · '+esc(x.by):'')+'</span></div>'
    }).join(''):'<div class="rwcp-none">No response stages recorded yet.</div>';
    var when='';try{when=new Date(c.occurred).toLocaleString()}catch(e){}
    var btns=STAGES.map(function(x){
      var done=hasStage(c,x);
      return '<button type="button" data-stage="'+x+'"'+(done?' disabled':'')+'>'+(done?'✓ ':'')+x+'</button>'
    }).join('');
    return '<div class="rwcp-head"><div><div class="rwcp-kicker">SEALED REAL CASE · SHARED WITH YOUR ORGANISATION</div><h2>'+esc(c.type||'Incident')+' · '+esc(c.place||'reported location')+'</h2></div><button type="button" class="rwcp-x" aria-label="Close">×</button></div>'+
    '<div class="rwcp-meta"><div><span>Case</span><b>'+esc(c.id)+'</b></div><div><span>Occurred</span><b>'+esc(when)+'</b></div><div><span>Record seal</span><b>'+esc(String(c.seal||'').slice(0,16))+'...</b></div><div><span>Response</span><b>'+(c.arrived?('Arrived '+esc(new Date(c.arrived).toLocaleString())+(c.responder?' · '+esc(c.responder):'')):(hasStage(c,'RESPOND')?'Logged (legacy entry, not server-verified)':'Not logged yet'))+'</b></div></div>'+
    (c.desc?'<p class="rwcp-desc">'+esc(c.desc)+'</p>':'')+
    '<div class="rwcp-tl"><div class="rwcp-sub">RESPONSE STAGES (append-only, timestamped)</div>'+timeline+'</div>'+
    '<div class="rwcp-sub">ADD A STAGE TO THE SHARED RECORD</div><div class="rwcp-btns">'+btns+'</div>'+
    '<div class="rwcp-msg" role="status"></div>'+
    '<p class="rwcp-note">These buttons update your organisation\'s real sealed case record for everyone in the organisation. The INCIDENT CONTROL and OPERATOR ASSURANCE buttons elsewhere on this page are a synthetic rehearsal and never touch real cases.</p>';
  }
  function openCase(c){
    closeCase();current=c;
    panel=document.createElement('div');panel.id='rw-case-panel';panel.innerHTML=panelHtml(c);
    panel.querySelector('.rwcp-x').addEventListener('click',closeCase);
    panel.querySelectorAll('[data-stage]').forEach(function(b){b.addEventListener('click',function(){addStage(c,b.dataset.stage)})});
    document.body.appendChild(panel);
  }
  async function addStage(c,stage){
    var k=creds();if(!k||!panel)return;
    var msg=panel.querySelector('.rwcp-msg');msg.textContent='Writing '+stage+' to the shared record...';
    panel.querySelectorAll('[data-stage]').forEach(function(b){b.disabled=true});
    try{
      // the server stamps the actor and time; the client sends only the stage name
      var r=await fetch(API+'/api/cases/'+encodeURIComponent(c.id)+'/stages',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+k.t,'x-rw-workspace':k.c},body:JSON.stringify({stage:stage})});
      var d={};try{d=await r.json()}catch(e){}
      if(!r.ok){msg.textContent='Not saved: '+(d.error||('HTTP '+r.status));panel.querySelectorAll('[data-stage]').forEach(function(b){b.disabled=hasStage(c,b.dataset.stage)});return}
      var entry=d.entry||{stage:stage,at:new Date().toISOString(),by:localStorage.getItem('rw.acct')};
      c.stages=stageList(c).concat([entry]);
      if(stage==='RESPOND'&&!c.arrived){c.arrived=entry.at;c.responder=entry.by}
      msg.textContent=stage+' saved. Everyone in your organisation sees it.';
      panel.innerHTML=panelHtml(c);
      panel.querySelector('.rwcp-x').addEventListener('click',closeCase);
      panel.querySelectorAll('[data-stage]').forEach(function(b){b.addEventListener('click',function(){addStage(c,b.dataset.stage)})});
      refresh(); // re-render feed row + pins from the server record
    }catch(e){msg.textContent='No connection. Nothing was saved.';panel.querySelectorAll('[data-stage]').forEach(function(b){b.disabled=hasStage(c,b.dataset.stage)})}
  }
  async function refresh(){
    var k=creds();if(!k){clearOld();closeCase();return}
    try{
      var r=await fetch(API+'/api/events',{headers:{authorization:'Bearer '+k.t,'x-rw-workspace':k.c}});
      if(!r.ok)return;
      var d=await r.json();
      render(Array.isArray(d.events)?d.events:[]);
    }catch(e){}
  }
  document.addEventListener('rw:account',function(){setTimeout(refresh,1500)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
  window.addEventListener('focus',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,2500)});else setTimeout(refresh,2500);
})();
