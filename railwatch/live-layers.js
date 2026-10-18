/* RailWatch live layers. Aircraft from OpenSky public API, shown only when the feed answers. */
(function(){
  if(window.__rwLayers)return;window.__rwLayers=true;
  var box=document.createElement('div');box.id='rw-layers';
  box.innerHTML='<button type="button" data-l="air" aria-pressed="false">Aircraft <span id="rw-air-s">off</span></button>';
  document.body.appendChild(box);
  var ents=[],timer=null,on=false,s=box.querySelector('#rw-air-s');
  function clear(){ents.forEach(function(e){try{viewer.entities.remove(e)}catch(_){}});ents=[]}
  async function poll(){
    try{
      var c=new AbortController();var t=setTimeout(function(){c.abort()},15000);
      var r=await fetch('https://opensky-network.org/api/states/all?lamin=-35&lomin=16&lamax=-22&lomax=33',{signal:c.signal});clearTimeout(t);
      if(!r.ok)throw new Error('HTTP '+r.status);
      var d=await r.json();clear();
      (d.states||[]).forEach(function(a){if(a[5]==null||a[6]==null)return;
        var en=viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(a[5],a[6],(a[7]||0)),point:{pixelSize:6,color:Cesium.Color.fromCssColorString('#7aa7ff'),disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:(a[1]||'').trim(),font:'10px sans-serif',pixelOffset:new Cesium.Cartesian2(0,-12),scale:.9,showBackground:true,disableDepthTestDistance:Number.POSITIVE_INFINITY}});en.rwInfo={kind:'Aircraft (live)',title:(a[1]||'').trim()||('Aircraft '+a[0]),rows:[['Registered in',a[2]||'Unknown'],['Height',a[7]!=null?Math.round(a[7])+' m':'Unknown'],['Speed',a[9]!=null?Math.round(a[9]*3.6)+' km/h':'Unknown'],['Heading',a[10]!=null?Math.round(a[10])+' degrees':'Unknown'],['On the ground',a[8]?'Yes':'No'],['Last update',a[4]?new Date(a[4]*1000).toLocaleTimeString():'Unknown'],['In a case',"No"]],note:'Public flight data from OpenSky.'};ents.push(en)});
      s.textContent=ents.length+' live · '+new Date().toLocaleTimeString().slice(0,5);
    }catch(e){s.textContent='feed unavailable';clear()}
  }
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;on=!on;b.setAttribute('aria-pressed',on);
    if(on){s.textContent='loading';poll();timer=setInterval(poll,60000)}else{clearInterval(timer);clear();s.textContent='off'}});
})();
