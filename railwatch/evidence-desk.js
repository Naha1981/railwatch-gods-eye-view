/* NahaLabs RailWatch Evidence Desk: report real incidents, seal evidence, hotspots, handover pack. Stored on this device. */
(function(){
  if(window.__rwDesk)return;window.__rwDesk=true;
  var KEY='rw.cases.v1',WSK='rw.ws',API=window.RAILWATCH_API||'https://railwatch-api.nahalabs.workers.dev';
  function wsCode(){return localStorage.getItem(WSK)||''}
  var syncMsg='';
  async function api(path,opt){opt=opt||{};opt.headers=Object.assign({'x-rw-workspace':wsCode(),'content-type':'application/json'},opt.headers||{});var r=await fetch(API+path,opt);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
  async function sync(){if(!wsCode())return;try{var srv=(await api('/api/cases')).cases,loc=load(),ids={};srv.forEach(function(c){ids[c.id]=c});var merged=srv.slice();for(var i=0;i<loc.length;i++){var c=loc[i];if(!ids[c.id]){await api('/api/cases/'+c.id,{method:'PUT',body:JSON.stringify(c)});merged.push(c)}else if(c.arrived&&!ids[c.id].arrived){await api('/api/cases/'+c.id,{method:'PUT',body:JSON.stringify(c)});var m=merged.filter(function(x){return x.id===c.id})[0];m.arrived=c.arrived;m.responder=c.responder}}merged.sort(function(a,b){return a.sealedAt<b.sealedAt?-1:1});localStorage.setItem(KEY,JSON.stringify(merged));syncMsg='Synced '+new Date().toLocaleTimeString().slice(0,5)}catch(e){syncMsg='Sync failed, working offline ('+e.message+')'}render()}
  var TYPES=['Cable theft','Vandalism','Line breach','Signal / equipment damage','Other'];
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
  function save(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){alert('Storage full on this device. Export the handover pack, then remove old cases.')}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  async function sha(buf){var h=await crypto.subtle.digest('SHA-256',buf);return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0')}).join('')}
  async function shaText(t){return sha(new TextEncoder().encode(t))}
  function thumb(file){return new Promise(function(res){if(!/^image\//.test(file.type))return res('');var r=new FileReader();r.onload=function(){var i=new Image();i.onload=function(){var c=document.createElement('canvas'),s=Math.min(1,360/i.width);c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.6))};i.onerror=function(){res('')};i.src=r.result};r.readAsDataURL(file)})}
  function cell(c){return (Math.round(c.lat*10)/10)+','+(Math.round(c.lon*10)/10)}
  function hotspots(cs){var m={};cs.forEach(function(c){var k=cell(c);m[k]=(m[k]||0)+1});return m}
  function mins(c){if(!c.arrived)return null;return Math.max(0,Math.round((new Date(c.arrived)-new Date(c.occurred))/60000))}

  var sheet=document.createElement('aside');sheet.id='rw-desk';sheet.setAttribute('aria-label','Evidence desk');
  document.body.appendChild(sheet);
  var view='list';

  function render(){
    var cs=load(),hs=hotspots(cs);
    if(view==='form'){sheet.innerHTML=formHtml();wireForm();return}
    var rows=cs.slice().reverse().map(function(c){
      var rep=hs[cell(c)]>1,m=mins(c);
      return '<div class="rwd-case"><div class="rwd-row"><b>'+esc(c.id)+'</b><span class="rwd-badge '+(rep?'flag':'ok')+'">'+(rep?'REPEAT SITE':'SEALED')+'</span></div>'+
      '<div>'+esc(c.type)+' &middot; '+esc(c.place||c.lat.toFixed(4)+', '+c.lon.toFixed(4))+'</div>'+
      '<div class="rwd-mute">'+new Date(c.occurred).toLocaleString()+' &middot; '+c.files.length+' file(s)'+(m!=null?' &middot; response '+m+' min':' &middot; no response time yet')+'</div>'+
      '<div class="rwd-actions"><button data-a="fly" data-id="'+c.id+'">Show on map</button><button data-a="resp" data-id="'+c.id+'">Log response</button><button data-a="pack" data-id="'+c.id+'">Handover pack</button></div></div>'}).join('');
    var rs=Object.keys(hs).filter(function(k){return hs[k]>1}).length;
    sheet.innerHTML='<div class="rwd-head"><h2>Evidence desk</h2><button class="rwd-x" data-a="close" aria-label="Close">&times;</button></div>'+
     '<div class="rwd-stats"><div><b>'+cs.length+'</b><span>Cases</span></div><div><b class="'+(rs?'flag':'')+'">'+rs+'</b><span>Repeat sites</span></div><div><b>'+cs.filter(function(c){return c.arrived}).length+'</b><span>Response logged</span></div></div>'+
     '<button class="rwd-primary" data-a="new">Report a new incident</button>'+
     (rows||'<p class="rwd-mute">No incidents yet. Tap the button above to record one. Each photo or video is fingerprinted (SHA-256) and time-stamped on this device.</p>')+
     (cs.length?'<button class="rwd-link" data-a="all">Export all cases (handover pack)</button>':'')+syncBox()+'<p class="rwd-foot">Cases are kept on this device'+(wsCode()?' and in your workspace':'')+'. Support: <a href="mailto:ai-solutions@nahalabs.co.za">ai-solutions@nahalabs.co.za</a></p>';
  }
  function syncBox(){return wsCode()?'<div class="rwd-sync"><b>Workspace sync on</b><span>'+esc(syncMsg||'Connecting...')+'</span><button data-a="leave">Turn off</button></div>':'<div class="rwd-sync"><b>Use on more than one device</b><span>Pick a workspace code (8+ characters) and enter the same code on every device. Anyone with the code can see these cases.</span><input id="rwd-code" placeholder="Workspace code" autocomplete="off"><button data-a="join">Turn on sync</button></div>'}
  function formHtml(){
    var now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    return '<div class="rwd-head"><h2>Report incident</h2><button class="rwd-x" data-a="back" aria-label="Back">&times;</button></div>'+
    '<form id="rwd-form"><label>What happened<select name="type">'+TYPES.map(function(t){return'<option>'+t+'</option>'}).join('')+'</select></label>'+
    '<label>When<input type="datetime-local" name="occurred" value="'+now+'" required></label>'+
    '<label>Where (place or km marker)<input name="place" placeholder="e.g. Ermelo line, km 142.8"></label>'+
    '<div class="rwd-two"><label>Latitude<input name="lat" inputmode="decimal" required placeholder="-26.2041"></label><label>Longitude<input name="lon" inputmode="decimal" required placeholder="28.0473"></label></div>'+
    '<button type="button" class="rwd-sec" id="rwd-gps">Use my location</button>'+
    '<label>What was lost or damaged<textarea name="desc" rows="3" placeholder="Cable length, equipment, service impact"></textarea></label>'+
    '<label>Photos / video<input type="file" name="files" accept="image/*,video/*" multiple capture="environment"></label>'+
    '<button class="rwd-primary" type="submit">Seal and save</button><p class="rwd-mute" id="rwd-msg"></p></form>';
  }
  function wireForm(){
    var f=sheet.querySelector('#rwd-form');
    sheet.querySelector('#rwd-gps').onclick=function(){navigator.geolocation?navigator.geolocation.getCurrentPosition(function(p){f.lat.value=p.coords.latitude.toFixed(5);f.lon.value=p.coords.longitude.toFixed(5)},function(){sheet.querySelector('#rwd-msg').textContent='Location blocked. Type the coordinates instead.'}):0};
    f.onsubmit=async function(e){e.preventDefault();var msg=sheet.querySelector('#rwd-msg');msg.textContent='Sealing evidence...';
      var cs=load(),files=[];
      for(var i=0;i<f.files.files.length;i++){var fl=f.files.files[i];files.push({name:fl.name,type:fl.type,size:fl.size,sha256:await sha(await fl.arrayBuffer()),thumb:await thumb(fl)})}
      var c={id:'RW-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,6).toUpperCase(),type:f.type.value,occurred:new Date(f.occurred.value).toISOString(),sealedAt:new Date().toISOString(),place:f.place.value,lat:parseFloat(f.lat.value),lon:parseFloat(f.lon.value),desc:f.desc.value,files:files};
      if(isNaN(c.lat)||isNaN(c.lon)){msg.textContent='Enter valid coordinates.';return}
      c.prev=cs.length?cs[cs.length-1].seal:'GENESIS';
      c.seal=await shaText(c.prev+JSON.stringify({id:c.id,type:c.type,occurred:c.occurred,sealedAt:c.sealedAt,lat:c.lat,lon:c.lon,desc:c.desc,files:files.map(function(x){return x.sha256})}));
      cs.push(c);save(cs);view="list";render();pins();sync();};
  }
  function arr(){return load()}
  function fly(c){try{viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(c.lon,c.lat,6000)});sheet.classList.remove('open');document.body.classList.remove('rw-open-desk')}catch(e){}}
  var ents=[];
  function pins(){try{ents.forEach(function(e){viewer.entities.remove(e)});ents=[];var cs=load(),hs=hotspots(cs);cs.forEach(function(c){var rep=hs[cell(c)]>1;
    ents.push(viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(c.lon,c.lat,20),point:{pixelSize:rep?18:12,color:rep?Cesium.Color.fromCssColorString('#f5b942'):Cesium.Color.fromCssColorString('#2dd4bf'),outlineColor:Cesium.Color.BLACK,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:c.id+(rep?' REPEAT':''),font:'12px sans-serif',pixelOffset:new Cesium.Cartesian2(0,-20),showBackground:true,disableDepthTestDistance:Number.POSITIVE_INFINITY}}))})}catch(e){}}
  function pack(list){
    var w=window.open('','_blank');if(!w){alert('Allow pop-ups to open the handover pack.');return}
    var hs=hotspots(load());
    var body=list.map(function(c){var m=mins(c);return '<section><h2>'+esc(c.id)+' - '+esc(c.type)+'</h2><table><tr><th>Occurred</th><td>'+new Date(c.occurred).toString()+'</td></tr><tr><th>Sealed on device</th><td>'+c.sealedAt+'</td></tr><tr><th>Location</th><td>'+esc(c.place)+' ('+c.lat+', '+c.lon+') <a href="https://www.openstreetmap.org/?mlat='+c.lat+'&mlon='+c.lon+'#map=15/'+c.lat+'/'+c.lon+'">map</a></td></tr><tr><th>Repeat site</th><td>'+(hs[cell(c)]>1?'YES - '+hs[cell(c)]+' incidents within about 10 km':'No')+'</td></tr><tr><th>Response</th><td>'+(m!=null?'Arrived '+new Date(c.arrived).toLocaleString()+' ('+m+' min after incident)'+(c.responder?', '+esc(c.responder):''):'Not logged')+'</td></tr><tr><th>Description</th><td>'+esc(c.desc)+'</td></tr><tr><th>Record seal (SHA-256 chain)</th><td class="h">'+c.seal+'<br>previous: '+c.prev+'</td></tr></table>'+
      c.files.map(function(x){return '<div class="f">'+(x.thumb?'<img src="'+x.thumb+'">':'')+'<div>'+esc(x.name)+' ('+Math.round(x.size/1024)+' KB)<br><span class="h">SHA-256 '+x.sha256+'</span></div></div>'}).join('')+'</section>'}).join('');
    w.document.write('<!doctype html><meta charset=utf-8><title>RailWatch handover pack</title><style>body{font:14px system-ui;margin:24px;color:#111}h1{margin:0}h2{border-bottom:2px solid #f5b942;padding-bottom:4px;margin-top:28px}table{border-collapse:collapse;width:100%}th{text-align:left;width:150px;vertical-align:top;color:#555}td,th{padding:4px 6px;border-bottom:1px solid #eee}.h{font:11px monospace;word-break:break-all;color:#444}.f{display:flex;gap:10px;margin:8px 0;align-items:center}.f img{width:120px;border-radius:6px}section{page-break-inside:avoid}.n{color:#555;font-size:12px}</style><h1>RailWatch handover pack</h1><p class=n>Prepared by NahaLabs RailWatch on '+new Date().toString()+' for SAPS / insurer / security handover. Fingerprints let a third party confirm the files were not changed after sealing. Original files must be supplied with this pack.</p>'+body+'<p class=n><button onclick="print()">Print / save as PDF</button></p>');w.document.close();
  }
  sheet.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.a,id=b.dataset.id,cs=load(),c=cs.filter(function(x){return x.id===id})[0];
    if(a==='join'){var v=(sheet.querySelector('#rwd-code').value||'').trim();if(v.length<8){alert('Use at least 8 characters.');return}localStorage.setItem(WSK,v);syncMsg='Connecting...';render();sync();return}
    if(a==='leave'){localStorage.removeItem(WSK);syncMsg='';render();return}
    if(a==='close'){document.body.classList.remove('rw-open-desk')}
    if(a==='new'){view='form';render()}if(a==='back'){view='list';render()}
    if(a==='fly'&&c)fly(c);
    if(a==='pack'&&c)pack([c]);if(a==='all')pack(cs);
    if(a==='resp'&&c){var t=prompt('Time the response team arrived (e.g. 2026-10-18 14:30). Leave blank for now.',new Date().toISOString().slice(0,16).replace('T',' '));if(t){var d=new Date(t.replace(' ','T'));if(isNaN(d)){alert('Could not read that time.');return}c.arrived=d.toISOString();c.responder=prompt('Who responded? (optional)')||'';save(cs);render();sync()}}});
  window.RailWatchDesk={open:function(){document.body.classList.add('rw-open-desk');view='list';render()},newReport:function(){document.body.classList.add('rw-open-desk');view='form';render()}};
  new MutationObserver(function(){if(document.body.classList.contains('rw-open-desk')&&view!=='form')render()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(function(){pins();sync()},1500);render();
})();
